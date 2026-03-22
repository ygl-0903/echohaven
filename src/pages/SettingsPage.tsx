import {
  Alert,
  Button,
  Code,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import { useVaultReload } from "../contexts/vaultUi";
import { TagPresetsPanel } from "../features/tags/TagPresetsPanel";
import { persistAutoLockPreference, useAppStore } from "../store";

export function SettingsPage() {
  const navigate = useNavigate();
  const reload = useVaultReload();
  const vaultPath = useAppStore((s) => s.vaultPath);
  const tagPresets = useAppStore((s) => s.tagPresets);
  const setTagPresets = useAppStore((s) => s.setTagPresets);
  const autoLockMinutes = useAppStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useAppStore((s) => s.setAutoLockMinutes);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const [importOpened, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [importPath, setImportPath] = useState<string | null>(null);
  const [importPw, setImportPw] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importStat, setImportStat] = useState<{ sizeBytes: number; modifiedIso: string | null } | null>(
    null,
  );
  const entryCount = useAppStore((s) => s.entries.length);

  const [docExportOpened, { open: openDocExportModal, close: closeDocExportModal }] =
    useDisclosure(false);
  const [includePasswordsInDoc, setIncludePasswordsInDoc] = useState(false);
  const [docExportBusy, setDocExportBusy] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [changePwBusy, setChangePwBusy] = useState(false);

  const savePresets = useCallback(
    async (next: typeof tagPresets) => {
      await api.saveTagPresets(next);
      setTagPresets(next);
      notifications.show({ title: "标签预设已保存", message: " ", color: "teal" });
    },
    [setTagPresets],
  );

  const doExport = useCallback(async () => {
    const path = await save({
      defaultPath: "echohaven-backup.ehv",
      filters: [
        { name: "EchoHaven", extensions: ["ehv", "vault"] },
        { name: "All", extensions: ["*"] },
      ],
    });
    if (!path) return;
    await api.exportVault(path);
    notifications.show({ title: "已导出加密备份", message: " ", color: "teal" });
  }, []);

  const doExportDocument = useCallback(async () => {
    const path = await save({
      defaultPath: "echohaven-entries.md",
      filters: [
        { name: "Markdown", extensions: ["md", "markdown"] },
        { name: "文本", extensions: ["txt"] },
        { name: "全部", extensions: ["*"] },
      ],
    });
    if (!path) return;
    setDocExportBusy(true);
    try {
      await api.exportEntriesDocument(path, includePasswordsInDoc);
      closeDocExportModal();
      setIncludePasswordsInDoc(false);
      notifications.show({ title: "已导出文档", message: " ", color: "teal" });
    } catch (e) {
      notifications.show({ title: "导出失败", message: String(e), color: "red" });
    } finally {
      setDocExportBusy(false);
    }
  }, [includePasswordsInDoc, closeDocExportModal]);

  const pickImport = useCallback(async () => {
    const picked = await open({
      multiple: false,
      filters: [
        { name: "EchoHaven / Vault", extensions: ["ehv", "vault"] },
        { name: "All", extensions: ["*"] },
      ],
    });
    const path = Array.isArray(picked) ? picked[0] : picked;
    if (path && typeof path === "string") {
      setImportPath(path);
      setImportPw("");
      setImportStat(null);
      openImportModal();
    }
  }, [openImportModal]);

  useEffect(() => {
    if (!importPath) {
      setImportStat(null);
      return;
    }
    let cancelled = false;
    void api.statVaultFile(importPath).then(
      (s) => {
        if (!cancelled) setImportStat(s);
      },
      () => {
        if (!cancelled) setImportStat(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [importPath]);

  const changeMasterPassword = useCallback(async () => {
    if (newPw.length < 8) {
      notifications.show({ title: "新主密码过短", message: "至少 8 位", color: "orange" });
      return;
    }
    if (newPw !== newPw2) {
      notifications.show({ title: "两次输入不一致", message: "请重新确认新主密码", color: "orange" });
      return;
    }
    setChangePwBusy(true);
    try {
      await api.changeMasterPassword(curPw, newPw);
      setCurPw("");
      setNewPw("");
      setNewPw2("");
      notifications.show({ title: "主密码已更新", message: "请牢记新密码；旧密码即刻失效。", color: "teal" });
    } catch (e) {
      notifications.show({ title: "修改失败", message: String(e), color: "red" });
    } finally {
      setChangePwBusy(false);
    }
  }, [curPw, newPw, newPw2]);

  const confirmImport = useCallback(async () => {
    if (!importPath) return;
    setImportBusy(true);
    try {
      await api.saveVaultDisk();
      const info = await api.importVaultReplace(importPath, importPw);
      useAppStore.getState().setVaultPath(info.vaultPath);
      await reload();
      closeImportModal();
      const backup = info.preImportBackupPath?.trim();
      notifications.show({
        title: "已导入并替换当前金库",
        message: backup
          ? `已自动备份原库：${backup}。新库共 ${info.entryCount} 条。`
          : `新库共 ${info.entryCount} 条。`,
        color: "teal",
      });
      navigate("/");
    } catch (e) {
      notifications.show({ title: "导入失败", message: String(e), color: "red" });
    } finally {
      setImportBusy(false);
    }
  }, [importPath, importPw, reload, navigate, closeImportModal]);

  return (
    <Stack gap="lg" maw={720} mx="auto" p="md" w="100%">
      <Title order={2} className="echohaven-page-title">
        设置
      </Title>

      <Tabs defaultValue="tags">
        <Tabs.List>
          <Tabs.Tab value="tags">标签与分类</Tabs.Tab>
          <Tabs.Tab value="appearance">外观</Tabs.Tab>
          <Tabs.Tab value="security">安全与备份</Tabs.Tab>
          <Tabs.Tab value="about">关于</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="tags" pt="md">
          <TagPresetsPanel presets={tagPresets} onSave={savePresets} />
        </Tabs.Panel>

        <Tabs.Panel value="appearance" pt="md">
          <Select
            label="配色"
            description="保存在本机，下次启动仍生效"
            data={[
              { value: "light", label: "浅色" },
              { value: "dark", label: "深色" },
              { value: "auto", label: "跟随系统" },
            ]}
            value={colorScheme}
            onChange={(v) => v && setColorScheme(v as "light" | "dark" | "auto")}
          />
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="md">
          <Stack gap="md">
            <Alert color="blue" title="修改主密码">
              <Stack gap="sm" mt="xs">
                <Text size="sm">
                  需输入当前主密码；成功后立即写入金库文件，解锁状态下无需重新登录。
                </Text>
                <TextInput
                  type="password"
                  label="当前主密码"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  autoComplete="current-password"
                />
                <TextInput
                  type="password"
                  label="新主密码（至少 8 位）"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
                <TextInput
                  type="password"
                  label="确认新主密码"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  autoComplete="new-password"
                />
                <Button loading={changePwBusy} onClick={() => void changeMasterPassword()}>
                  更新主密码
                </Button>
              </Stack>
            </Alert>
            <Select
              label="闲置自动锁定"
              data={[
                { value: "5", label: "5 分钟" },
                { value: "15", label: "15 分钟" },
                { value: "30", label: "30 分钟" },
                { value: "60", label: "60 分钟" },
                { value: "0", label: "关闭" },
              ]}
              value={String(autoLockMinutes)}
              onChange={(v) => {
                if (v == null) return;
                const n = Number(v);
                setAutoLockMinutes(n);
                persistAutoLockPreference(n);
              }}
            />
            <Group wrap="wrap">
              <Button onClick={() => void doExport()}>导出加密备份…</Button>
              <Button variant="light" onClick={() => openDocExportModal()}>
                导出条目文档…
              </Button>
              <Button variant="light" color="orange" onClick={() => void pickImport()}>
                从备份导入（整库替换）…
              </Button>
            </Group>
            <Alert color="gray" title="金库路径">
              <Code block>{vaultPath ?? "—"}</Code>
            </Alert>
            <Text size="xs" c="dimmed">
              条目文档为 UTF-8 明文 Markdown，便于自行存档或打印；与加密备份不同，请勿上传到不可信位置。
            </Text>
            <Text size="xs" c="dimmed">
              导入会用所选备份替换<strong>当前正在使用的金库文件</strong>；确认前会先尝试将内存中未写入的修改落盘，并在同目录下自动生成带时间戳的 pre-import
              备份。需输入<strong>该备份文件</strong>对应的主密码。
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="about" pt="md">
          <Stack gap="sm">
            <Title order={4}>余音 · echohaven</Title>
            <Text size="sm" c="dimmed">
              本地加密密码管理与提醒。主密码无法找回，请定期导出备份。
            </Text>
            <Text size="xs" c="dimmed">
              Argon2id + AES-256-GCM · Tauri 2 · 数据不出本机
            </Text>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={docExportOpened}
        onClose={() => {
          closeDocExportModal();
          setIncludePasswordsInDoc(false);
        }}
        title="导出条目文档"
      >
        <Stack gap="md">
          <Alert color="orange" title="明文导出">
            <Text size="sm">
              将当前金库中的条目写入 Markdown 文件。默认不包含密码；若开启「包含密码」，文件即等同于完整明文备份，请自行保管。
            </Text>
          </Alert>
          <Switch
            label="在文档中包含明文密码"
            description="仅当确有需要时开启"
            checked={includePasswordsInDoc}
            onChange={(e) => setIncludePasswordsInDoc(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                closeDocExportModal();
                setIncludePasswordsInDoc(false);
              }}
            >
              取消
            </Button>
            <Button loading={docExportBusy} onClick={() => void doExportDocument()}>
              选择保存位置并导出
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={importOpened} onClose={closeImportModal} title="导入备份">
        <Stack gap="sm">
          <Text size="xs" ff="monospace" style={{ wordBreak: "break-all" }}>
            {importPath}
          </Text>
          {importStat ? (
            <Alert color="gray" title="备份文件（磁盘信息）">
              <Text size="sm">
                约 {formatBytes(importStat.sizeBytes)}
                {importStat.modifiedIso ? ` · 修改时间 ${importStat.modifiedIso}` : ""}
              </Text>
            </Alert>
          ) : importPath ? (
            <Text size="xs" c="dimmed">
              无法读取该文件的本地元数据（可能无权限或路径无效）。
            </Text>
          ) : null}
          <Alert color="blue" title="当前金库（导入前）">
            <Text size="sm">
              路径见下方设置页「金库路径」；当前已加载约 <strong>{entryCount}</strong> 条条目。确认后将写入备份副本再整体替换。
            </Text>
          </Alert>
          <TextInput
            type="password"
            label="该备份的主密码"
            value={importPw}
            onChange={(e) => setImportPw(e.target.value)}
            autoComplete="off"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeImportModal}>
              取消
            </Button>
            <Button loading={importBusy} onClick={() => void confirmImport()}>
              确认替换
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const k = n / 1024;
  if (k < 1024) return `${k < 10 ? k.toFixed(1) : Math.round(k)} KB`;
  const m = k / 1024;
  return `${m < 10 ? m.toFixed(1) : Math.round(m)} MB`;
}
