mod vault;

use chrono::Local;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use subtle::ConstantTimeEq;
use tauri::State;
use vault::{
    create_vault_file, default_vault_path, rekey_with_new_password, save_vault_file,
    unlock_vault_file, Entry, MasterKey, TagPreset, VaultData, VaultError, VaultHeader,
};

struct Lockout {
    failures: u32,
    blocked_until: Option<Instant>,
}

impl Default for Lockout {
    fn default() -> Self {
        Self {
            failures: 0,
            blocked_until: None,
        }
    }
}

struct VaultSession {
    path: PathBuf,
    header: VaultHeader,
    key: MasterKey,
    data: VaultData,
}

pub struct AppState {
    session: Mutex<Option<VaultSession>>,
    lockout: Mutex<Lockout>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            session: Mutex::new(None),
            lockout: Mutex::new(Lockout::default()),
        }
    }
}

fn map_err(e: VaultError) -> String {
    e.to_string()
}

fn markdown_fence(content: &str) -> &'static str {
    if content.contains("```") {
        "~~~"
    } else {
        "```"
    }
}

fn append_markdown_field(out: &mut String, label: &str, value: &str) {
    out.push_str("- **");
    out.push_str(label);
    out.push_str("**：");
    append_markdown_value(out, value);
}

/// Continuation after a label prefix (e.g. `- **密码**：` already written).
fn append_markdown_value(out: &mut String, value: &str) {
    if value.is_empty() {
        out.push_str("（空）\n");
        return;
    }
    if value.contains('\n') {
        let fence = markdown_fence(value);
        out.push('\n');
        out.push_str(fence);
        out.push('\n');
        out.push_str(value);
        if !value.ends_with('\n') {
            out.push('\n');
        }
        out.push_str(fence);
        out.push('\n');
    } else {
        out.push_str(value);
        out.push('\n');
    }
}

fn build_entries_markdown(entries: &[Entry], include_passwords: bool) -> String {
    let exported_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut out = String::new();
    out.push_str("# 余音 · 条目导出\n\n");
    out.push_str(&format!("> 导出时间：{exported_at}\n"));
    if include_passwords {
        out.push_str("> **警告：本文档包含明文密码，请勿上传网络或发送给他人。**\n\n");
    } else {
        out.push_str("> 密码字段已省略；需要明文时请重新导出并开启「包含密码」。\n\n");
    }

    let mut sorted: Vec<&Entry> = entries.iter().collect();
    sorted.sort_by(|a, b| {
        a.title
            .to_lowercase()
            .cmp(&b.title.to_lowercase())
            .then_with(|| a.id.cmp(&b.id))
    });

    for e in sorted {
        out.push_str("## ");
        out.push_str(&e.title.replace('\n', " "));
        out.push_str("\n\n");
        append_markdown_field(&mut out, "用户名", &e.username);
        out.push_str("- **密码**：");
        if include_passwords {
            append_markdown_value(&mut out, &e.password);
        } else {
            out.push_str("（未导出）\n");
        }
        append_markdown_field(&mut out, "网址", &e.url);
        let tags = e.tags.join("、");
        append_markdown_field(&mut out, "标签", &tags);
        append_markdown_field(&mut out, "备注", &e.notes);
        if let Some(r) = &e.reminder {
            let line = format!(
                "类型：{} · 到期日：{} · 启用：{}",
                r.kind,
                r.due_date,
                if r.enabled { "是" } else { "否" }
            );
            append_markdown_field(&mut out, "提醒", &line);
        }
        out.push_str("\n---\n\n");
    }

    out
}

fn check_lockout(state: &AppState) -> Result<(), String> {
    let mut lo = state.lockout.lock().map_err(|_| "锁状态异常".to_string())?;
    if let Some(until) = lo.blocked_until {
        if Instant::now() < until {
            let secs = (until - Instant::now()).as_secs().max(1);
            return Err(format!("尝试过多，请 {secs} 秒后再试"));
        }
        lo.blocked_until = None;
        lo.failures = 0;
    }
    Ok(())
}

fn register_failure(state: &AppState) {
    if let Ok(mut lo) = state.lockout.lock() {
        lo.failures += 1;
        if lo.failures >= 5 {
            lo.blocked_until = Some(Instant::now() + Duration::from_secs(30));
            lo.failures = 0;
        }
    }
}

fn clear_failures(state: &AppState) {
    if let Ok(mut lo) = state.lockout.lock() {
        lo.failures = 0;
        lo.blocked_until = None;
    }
}

#[tauri::command]
fn get_default_vault_path() -> Result<String, String> {
    default_vault_path()
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(map_err)
}

#[tauri::command]
fn vault_file_exists(path: Option<String>) -> Result<bool, String> {
    let p = resolve_vault_path(path)?;
    Ok(p.exists())
}

fn resolve_vault_path(path: Option<String>) -> Result<PathBuf, String> {
    match path {
        Some(p) if !p.trim().is_empty() => Ok(PathBuf::from(p)),
        _ => default_vault_path().map_err(map_err),
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UnlockInfo {
    entry_count: usize,
    vault_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pre_import_backup_path: Option<String>,
}

#[tauri::command]
fn create_vault(
    master_password: String,
    path: Option<String>,
    fast_kdf: bool,
    state: State<'_, AppState>,
) -> Result<UnlockInfo, String> {
    if master_password.len() < 8 {
        return Err("主密码至少 8 位".into());
    }
    let p = resolve_vault_path(path)?;
    if p.exists() {
        return Err("金库文件已存在，请选择其他路径或先备份后删除".into());
    }
    create_vault_file(&p, &master_password, fast_kdf).map_err(map_err)?;
    let (data, key, header) = unlock_vault_file(&p, &master_password).map_err(map_err)?;
    clear_failures(&state);
    let entry_count = data.entries.len();
    let vault_path = p.to_string_lossy().into_owned();
    *state.session.lock().map_err(|_| "状态锁失败".to_string())? = Some(VaultSession {
        path: p,
        header,
        key,
        data,
    });
    Ok(UnlockInfo {
        entry_count,
        vault_path,
        pre_import_backup_path: None,
    })
}

#[tauri::command]
fn unlock_vault(
    master_password: String,
    path: Option<String>,
    state: State<'_, AppState>,
) -> Result<UnlockInfo, String> {
    check_lockout(&state)?;
    let p = resolve_vault_path(path)?;
    if !p.exists() {
        return Err("找不到金库文件".into());
    }
    match unlock_vault_file(&p, &master_password) {
        Ok((data, key, header)) => {
            clear_failures(&state);
            let entry_count = data.entries.len();
            let vault_path = p.to_string_lossy().into_owned();
            *state.session.lock().map_err(|_| "状态锁失败".to_string())? = Some(VaultSession {
                path: p,
                header,
                key,
                data,
            });
            Ok(UnlockInfo {
                entry_count,
                vault_path,
                pre_import_backup_path: None,
            })
        }
        Err(e) => {
            register_failure(&state);
            Err(map_err(e))
        }
    }
}

/// 将现有金库复制到同目录下带时间戳的文件，用于导入替换前自动备份。
fn backup_vault_to_pre_import(path: &std::path::Path) -> Result<Option<PathBuf>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let parent = path
        .parent()
        .ok_or_else(|| "无法解析金库所在目录".to_string())?;
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("echohaven");
    let ts = Local::now().format("%Y%m%d-%H%M%S");
    let dest = parent.join(format!("{stem}.pre-import-{ts}.vault"));
    fs::copy(path, &dest).map_err(|e| e.to_string())?;
    Ok(Some(dest))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultFileStat {
    size_bytes: u64,
    modified_iso: Option<String>,
}

#[tauri::command]
fn stat_vault_file(path: String) -> Result<VaultFileStat, String> {
    use chrono::{TimeZone, Utc};
    let p = PathBuf::from(path.trim());
    if !p.exists() {
        return Err("文件不存在".into());
    }
    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    let modified_iso = meta.modified().ok().and_then(|st| {
        let dur = st.duration_since(std::time::UNIX_EPOCH).ok()?;
        Utc.timestamp_opt(dur.as_secs() as i64, dur.subsec_nanos())
            .single()
            .map(|dt| dt.with_timezone(&Local).format("%Y-%m-%d %H:%M").to_string())
    });
    Ok(VaultFileStat {
        size_bytes: meta.len(),
        modified_iso,
    })
}

#[tauri::command]
fn change_master_password(
    current_password: String,
    new_password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if new_password.len() < 8 {
        return Err("新主密码至少 8 位".into());
    }
    check_lockout(&state)?;
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_mut().ok_or("未解锁")?;
    let trial = s
        .header
        .derive_key(&current_password)
        .map_err(|_| "当前主密码校验失败".to_string())?;
    if !bool::from(s.key.as_bytes().ct_eq(trial.as_bytes())) {
        register_failure(&state);
        return Err("当前主密码不正确".into());
    }
    let (new_header, new_key) = rekey_with_new_password(&s.header, &new_password).map_err(map_err)?;
    save_vault_file(&s.path, &new_header, &new_key, &s.data).map_err(map_err)?;
    s.header = new_header;
    s.key = new_key;
    clear_failures(&state);
    Ok(())
}

#[tauri::command]
fn lock_vault(state: State<'_, AppState>) -> Result<(), String> {
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    *g = None;
    Ok(())
}

#[tauri::command]
fn is_unlocked(state: State<'_, AppState>) -> Result<bool, String> {
    let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    Ok(g.is_some())
}

#[tauri::command]
fn list_entries(state: State<'_, AppState>) -> Result<Vec<Entry>, String> {
    let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_ref().ok_or("未解锁")?;
    Ok(s.data.entries.clone())
}

#[tauri::command]
fn list_tag_presets(state: State<'_, AppState>) -> Result<Vec<TagPreset>, String> {
    let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_ref().ok_or("未解锁")?;
    Ok(s.data.tag_presets.clone())
}

#[tauri::command]
fn save_tag_presets(presets: Vec<TagPreset>, state: State<'_, AppState>) -> Result<(), String> {
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_mut().ok_or("未解锁")?;
    s.data.tag_presets = presets;
    persist_session(s).map_err(map_err)
}

#[tauri::command]
fn upsert_entry(entry: Entry, state: State<'_, AppState>) -> Result<(), String> {
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_mut().ok_or("未解锁")?;
    if let Some(i) = s.data.entries.iter().position(|e| e.id == entry.id) {
        s.data.entries[i] = entry;
    } else {
        s.data.entries.push(entry);
    }
    persist_session(s).map_err(map_err)
}

#[tauri::command]
fn delete_entry(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_mut().ok_or("未解锁")?;
    s.data.entries.retain(|e| e.id != id);
    persist_session(s).map_err(map_err)
}

fn persist_session(s: &mut VaultSession) -> Result<(), VaultError> {
    save_vault_file(&s.path, &s.header, &s.key, &s.data)
}

#[tauri::command]
fn save_vault_disk(state: State<'_, AppState>) -> Result<(), String> {
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_mut().ok_or("未解锁")?;
    persist_session(s).map_err(map_err)
}

#[tauri::command]
fn export_vault(to_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_ref().ok_or("未解锁")?;
    fs::copy(&s.path, &to_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn export_entries_document(
    to_path: String,
    include_passwords: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_ref().ok_or("未解锁")?;
    let md = build_entries_markdown(&s.data.entries, include_passwords);
    fs::write(&to_path, md).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn import_vault_replace(from_path: String, master_password: String, state: State<'_, AppState>) -> Result<UnlockInfo, String> {
    check_lockout(&state)?;
    let from = PathBuf::from(from_path.trim());
    if !from.exists() {
        return Err("源文件不存在".into());
    }
    match unlock_vault_file(&from, &master_password) {
        Ok((data, key, header)) => {
            clear_failures(&state);
            let entry_count = data.entries.len();
            let session_path = {
                let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
                let s = g.as_ref().ok_or("请先解锁金库后再在设置中导入")?;
                s.path.clone()
            };
            let backup_path = if session_path.exists() {
                backup_vault_to_pre_import(&session_path)?
            } else {
                None
            };
            fs::copy(&from, &session_path).map_err(|e| e.to_string())?;
            let vault_path = session_path.to_string_lossy().into_owned();
            let pre_import_backup_path =
                backup_path.map(|p| p.to_string_lossy().into_owned());
            *state.session.lock().map_err(|_| "状态锁失败".to_string())? = Some(VaultSession {
                path: session_path,
                header,
                key,
                data,
            });
            Ok(UnlockInfo {
                entry_count,
                vault_path,
                pre_import_backup_path,
            })
        }
        Err(e) => {
            register_failure(&state);
            Err(map_err(e))
        }
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DueReminder {
    entry_id: String,
    title: String,
    due_date: String,
}

#[tauri::command]
fn scan_due_reminders(state: State<'_, AppState>) -> Result<Vec<DueReminder>, String> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_ref().ok_or("未解锁")?;
    let mut hits = Vec::new();
    for e in &s.data.entries {
        let Some(r) = &e.reminder else { continue };
        if !r.enabled {
            continue;
        }
        if r.due_date > today {
            continue;
        }
        if r.last_notified_on.as_deref() == Some(today.as_str()) {
            continue;
        }
        hits.push(DueReminder {
            entry_id: e.id.clone(),
            title: e.title.clone(),
            due_date: r.due_date.clone(),
        });
    }
    Ok(hits)
}

#[tauri::command]
fn ack_due_reminders(entry_ids: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut g = state.session.lock().map_err(|_| "状态锁失败".to_string())?;
    let s = g.as_mut().ok_or("未解锁")?;
    let id_set: HashSet<_> = entry_ids.into_iter().collect();
    let mut changed = false;
    for e in &mut s.data.entries {
        if !id_set.contains(&e.id) {
            continue;
        }
        if let Some(r) = e.reminder.as_mut() {
            r.last_notified_on = Some(today.clone());
            changed = true;
        }
    }
    if changed {
        persist_session(s).map_err(map_err)?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_default_vault_path,
            vault_file_exists,
            stat_vault_file,
            create_vault,
            unlock_vault,
            change_master_password,
            lock_vault,
            is_unlocked,
            list_entries,
            list_tag_presets,
            save_tag_presets,
            upsert_entry,
            delete_entry,
            save_vault_disk,
            export_vault,
            export_entries_document,
            import_vault_replace,
            scan_due_reminders,
            ack_due_reminders,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
