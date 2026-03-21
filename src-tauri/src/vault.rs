use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;
use zeroize::ZeroizeOnDrop;

pub const MAGIC: &[u8; 4] = b"EHVN";
pub const FILE_VERSION: u8 = 1;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("文件格式无效")]
    InvalidFormat,
    #[error("主密码错误或数据已损坏")]
    DecryptFailed,
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("序列化错误: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("参数错误: {0}")]
    Param(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagPreset {
    pub id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultData {
    pub version: u32,
    pub entries: Vec<Entry>,
    #[serde(default)]
    pub tag_presets: Vec<TagPreset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
    pub tags: Vec<String>,
    pub reminder: Option<Reminder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub kind: String,
    /// YYYY-MM-DD
    pub due_date: String,
    pub enabled: bool,
    pub last_notified_on: Option<String>,
}

#[derive(ZeroizeOnDrop)]
pub struct MasterKey {
    key: [u8; 32],
}

impl MasterKey {
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.key
    }

    fn from_slice(slice: &[u8; 32]) -> Self {
        Self { key: *slice }
    }
}

#[derive(Clone)]
pub struct VaultHeader {
    pub salt: [u8; 16],
    pub m_cost: u32,
    pub t_cost: u32,
    pub p_cost: u32,
}

impl VaultHeader {
    pub fn secure_preset() -> Self {
        Self {
            salt: rand::random(),
            m_cost: 19 * 1024,
            t_cost: 2,
            p_cost: 1,
        }
    }

    pub fn fast_preset() -> Self {
        Self {
            salt: rand::random(),
            m_cost: 8 * 1024,
            t_cost: 2,
            p_cost: 1,
        }
    }

    pub(crate) fn derive_key(&self, password: &str) -> Result<MasterKey, VaultError> {
        let params = Params::new(self.m_cost, self.t_cost, self.p_cost, Some(32))
            .map_err(|_| VaultError::Param("argon2 参数无效".into()))?;
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
        let mut out = [0u8; 32];
        argon2
            .hash_password_into(password.as_bytes(), &self.salt, &mut out)
            .map_err(|_| VaultError::Param("KDF 失败".into()))?;
        Ok(MasterKey::from_slice(&out))
    }
}

fn encrypt_payload(key: &MasterKey, plaintext: &[u8]) -> Result<Vec<u8>, VaultError> {
    let key = Key::<Aes256Gcm>::from_slice(key.as_bytes());
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let mut buf = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|_| VaultError::DecryptFailed)?;
    let mut out = nonce.to_vec();
    out.append(&mut buf);
    Ok(out)
}

fn decrypt_payload(key: &MasterKey, blob: &[u8]) -> Result<Vec<u8>, VaultError> {
    if blob.len() < 12 {
        return Err(VaultError::DecryptFailed);
    }
    let (n, c) = blob.split_at(12);
    let nonce = Nonce::from_slice(n);
    let key = Key::<Aes256Gcm>::from_slice(key.as_bytes());
    let cipher = Aes256Gcm::new(key);
    cipher
        .decrypt(nonce, c)
        .map_err(|_| VaultError::DecryptFailed)
}

pub fn encode_file(header: &VaultHeader, ciphertext: &[u8]) -> Vec<u8> {
    let mut v = Vec::with_capacity(4 + 1 + 16 + 12 + 4 + 1 + ciphertext.len());
    v.extend_from_slice(MAGIC);
    v.push(FILE_VERSION);
    v.extend_from_slice(&header.salt);
    v.extend_from_slice(&header.m_cost.to_le_bytes());
    v.extend_from_slice(&header.t_cost.to_le_bytes());
    v.push(header.p_cost as u8);
    v.extend_from_slice(ciphertext);
    v
}

pub fn decode_file(data: &[u8]) -> Result<(VaultHeader, &[u8]), VaultError> {
    if data.len() < 4 + 1 + 16 + 4 + 4 + 1 {
        return Err(VaultError::InvalidFormat);
    }
    if &data[0..4] != MAGIC {
        return Err(VaultError::InvalidFormat);
    }
    if data[4] != FILE_VERSION {
        return Err(VaultError::InvalidFormat);
    }
    let salt: [u8; 16] = data[5..21].try_into().map_err(|_| VaultError::InvalidFormat)?;
    let m_cost = u32::from_le_bytes(data[21..25].try_into().unwrap());
    let t_cost = u32::from_le_bytes(data[25..29].try_into().unwrap());
    let p_cost = data[29] as u32;
    let ciphertext = &data[30..];
    Ok((
        VaultHeader {
            salt,
            m_cost,
            t_cost,
            p_cost,
        },
        ciphertext,
    ))
}

pub fn create_vault_file(path: &Path, password: &str, fast_kdf: bool) -> Result<(), VaultError> {
    if password.is_empty() {
        return Err(VaultError::Param("主密码不能为空".into()));
    }
    let header = if fast_kdf {
        VaultHeader::fast_preset()
    } else {
        VaultHeader::secure_preset()
    };
    let key = header.derive_key(password)?;
    let data = VaultData {
        version: 1,
        entries: vec![],
        tag_presets: vec![],
    };
    let json = serde_json::to_vec(&data)?;
    let ct = encrypt_payload(&key, &json)?;
    let bytes = encode_file(&header, &ct);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, bytes)?;
    Ok(())
}

pub fn unlock_vault_file(path: &Path, password: &str) -> Result<(VaultData, MasterKey, VaultHeader), VaultError> {
    let raw = fs::read(path)?;
    let (header, ciphertext) = decode_file(&raw)?;
    let key = header.derive_key(password)?;
    let plain = decrypt_payload(&key, ciphertext)?;
    let data: VaultData = serde_json::from_slice(&plain)?;
    Ok((data, key, header))
}

pub fn save_vault_file(path: &Path, header: &VaultHeader, key: &MasterKey, data: &VaultData) -> Result<(), VaultError> {
    let json = serde_json::to_vec(data)?;
    let ct = encrypt_payload(key, &json)?;
    let bytes = encode_file(header, &ct);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, bytes)?;
    Ok(())
}

/// 使用新主密码重新派生密钥；KDF 强度（m/t/p）沿用现有头，盐值重新随机。
pub fn rekey_with_new_password(
    existing_header: &VaultHeader,
    new_password: &str,
) -> Result<(VaultHeader, MasterKey), VaultError> {
    if new_password.is_empty() {
        return Err(VaultError::Param("主密码不能为空".into()));
    }
    let header = VaultHeader {
        salt: rand::random(),
        m_cost: existing_header.m_cost,
        t_cost: existing_header.t_cost,
        p_cost: existing_header.p_cost,
    };
    let key = header.derive_key(new_password)?;
    Ok((header, key))
}

pub fn default_vault_path() -> Result<PathBuf, VaultError> {
    let base = dirs::data_dir()
        .ok_or_else(|| VaultError::Param("无法解析数据目录".into()))?
        .join("echohaven");
    fs::create_dir_all(&base)?;
    Ok(base.join("echohaven.vault"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn round_trip() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("v.vault");
        create_vault_file(&p, "correct-horse", true).unwrap();
        let (d, k, h) = unlock_vault_file(&p, "correct-horse").unwrap();
        assert!(d.entries.is_empty());
        let mut d2 = d.clone();
        d2.entries.push(Entry {
            id: "1".into(),
            title: "t".into(),
            username: "u".into(),
            password: "p".into(),
            url: "".into(),
            notes: "".into(),
            tags: vec![],
            reminder: None,
        });
        save_vault_file(&p, &h, &k, &d2).unwrap();
        let (d3, _, _) = unlock_vault_file(&p, "correct-horse").unwrap();
        assert_eq!(d3.entries.len(), 1);
        assert!(unlock_vault_file(&p, "wrong").is_err());
    }

    #[test]
    fn rekey_changes_password() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("v.vault");
        create_vault_file(&p, "old-secret", true).unwrap();
        let (data, _, header) = unlock_vault_file(&p, "old-secret").unwrap();
        let (new_h, new_k) = rekey_with_new_password(&header, "new-secret-8").unwrap();
        save_vault_file(&p, &new_h, &new_k, &data).unwrap();
        assert!(unlock_vault_file(&p, "old-secret").is_err());
        let (d2, _, _) = unlock_vault_file(&p, "new-secret-8").unwrap();
        assert_eq!(d2.entries.len(), data.entries.len());
    }
}
