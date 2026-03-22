import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Checkbox,
  Collapse,
  Divider,
  Group,
  Loader,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFolderOpen, IconKey, IconPlus, IconShieldLock } from "@tabler/icons-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as api from "../api";
import { useAppStore } from "../store";
import {
  getLastVaultPath,
  getRecentVaultPaths,
  rememberVaultPath,
  shortVaultLabel,
} from "../utils/vaultPaths";

type Props = { onAuthed: () => void };

export function AuthFlow({ onAuthed }: Props) {
  const setVaultPath = useAppStore((s) => s.setVaultPath);
  const [ready, setReady] = useState(false);
  const [defaultPath, setDefaultPath] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [exists, setExists] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"unlock" | "create">("unlock");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fastKdf, setFastKdf] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [pathHelpOpen, { toggle: togglePathHelp }] = useDisclosure(false);

  const refreshExists = useCallback(async (path: string) => {
    const trimmed = path.trim();
    const ex = await api.vaultFileExists(trimmed.length > 0 ? trimmed : null);
    setExists(ex);
  }, []);

  const refresh = useCallback(async () => {
    setErr(null);
    setReady(false);
    try {
      const def = await api.getDefaultVaultPath();
      setDefaultPath(def);
      setRecent(getRecentVaultPaths());
      const last = getLastVaultPath();
      let initial = def;
      if (last) {
        try {
          if (await api.vaultFileExists(last)) {
            initial = last;
          }
        } catch {
          /* ignore */
        }
      }
      setSelectedPath(initial);
      const ex0 = await api.vaultFileExists(initial.trim().length > 0 ? initial.trim() : null);
      setExists(ex0);
      setMode(ex0 ? "unlock" : "create");
      setReady(true);
    } catch (e) {
      setErr(String(e));
      setExists(null);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPathInputChange = useCallback(
    (value: string) => {
      setSelectedPath(value);
      void refreshExists(value);
    },
    [refreshExists],
  );

  const useDefaultPath = useCallback(() => {
    onPathInputChange(defaultPath);
  }, [defaultPath, onPathInputChange]);

  const pickVaultFile = useCallback(async () => {
    setErr(null);
    try {
      if (mode === "unlock") {
        const picked = await open({
          multiple: false,
          filters: [
            { name: "EchoHaven / Vault", extensions: ["ehv", "vault"] },
            { name: "全部", extensions: ["*"] },
          ],
        });
        const path = Array.isArray(picked) ? picked[0] : picked;
        if (path && typeof path === "string") {
          onPathInputChange(path);
        }
      } else {
        const base =
          selectedPath.trim().length > 0 ? selectedPath.trim() : `${defaultPath || "echohaven.vault"}`;
        const path = await save({
          defaultPath: base.endsWith(".vault") || base.endsWith(".ehv") ? base : `${base}.vault`,
          filters: [
            { name: "EchoHaven", extensions: ["vault", "ehv"] },
            { name: "全部", extensions: ["*"] },
          ],
        });
        if (path && typeof path === "string") {
          onPathInputChange(path);
        }
      }
    } catch (e) {
      setErr(String(e));
    }
  }, [mode, selectedPath, defaultPath, onPathInputChange]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const pathArg = selectedPath.trim();
    setBusy(true);
    try {
      if (mode === "create") {
        if (pw.length < 8) {
          setErr("主密码至少 8 位");
          return;
        }
        if (pw !== pw2) {
          setErr("两次输入的主密码不一致");
          return;
        }
        const info = await api.createVault(pw, pathArg.length > 0 ? pathArg : null, fastKdf);
        rememberVaultPath(info.vaultPath);
        setVaultPath(info.vaultPath);
        onAuthed();
      } else {
        const info = await api.unlockVault(pw, pathArg.length > 0 ? pathArg : null);
        rememberVaultPath(info.vaultPath);
        setVaultPath(info.vaultPath);
        onAuthed();
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!ready || exists === null) {
    return (
      <Center mih="100vh" className="echohaven-auth-stage">
        <Loader color="haven" type="bars" />
      </Center>
    );
  }

  const pathIsDefault =
    selectedPath.trim().length > 0 && selectedPath.trim() === defaultPath.trim();
  const createMode = mode === "create";
  const unlockMode = mode === "unlock";

  return (
    <Center
      className="echohaven-auth-stage"
      mih="100vh"
      p={{ base: "sm", sm: "xl" }}
      style={{ alignItems: "flex-start" }}
    >
      <Paper
        className="echohaven-auth-card"
        shadow="lg"
        p={{ base: "md", sm: "xl" }}
        radius="lg"
        maw={480}
        w="100%"
        mt={{ base: "md", sm: "xl" }}
        withBorder
      >
        <Stack gap="xl" className="echohaven-auth-stagger">
          <Stack gap="sm" align="center">
            <span className="echohaven-auth-mark" aria-hidden>
              <IconShieldLock size={30} stroke={1.5} />
            </span>
            <div>
              <Title order={2} ta="center" fw={700} className="echohaven-brand-title" fz="h2">
                余音
              </Title>
              <Text size="sm" c="dimmed" ta="center" mt={4}>
                本地加密密码库 · 数据不出本机
              </Text>
            </div>
          </Stack>

          {exists ? (
            <SegmentedControl
              fullWidth
              size="md"
              value={mode}
              onChange={(v) => {
                setMode(v as "unlock" | "create");
                setErr(null);
              }}
              data={[
                { label: "解锁", value: "unlock" },
                { label: "新建金库", value: "create" },
              ]}
            />
          ) : (
            <Group justify="center">
              <Badge size="lg" variant="light" color="haven" leftSection={<IconPlus size={14} />}>
                首次使用 · 将创建新金库
              </Badge>
            </Group>
          )}

          {exists && createMode ? (
            <Alert variant="light" color="yellow" title="该路径已有金库">
              新建需换到<strong>尚不存在</strong>的文件路径，可用「选择保存位置」另选文件夹与文件名。
            </Alert>
          ) : null}

          <Card padding="lg" radius="md" withBorder bg="var(--mantine-color-body)">
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text fw={600} size="sm">
                  金库文件
                </Text>
                {exists ? (
                  <Badge size="sm" variant="dot" color="teal">
                    已存在
                  </Badge>
                ) : (
                  <Badge size="sm" variant="dot" color="haven">
                    将新建到此路径
                  </Badge>
                )}
              </Group>

              {createMode && !exists ? (
                <Text size="xs" c="dimmed" lh={1.6}>
                  新建时可使用下方推荐路径，或点<strong>选择保存位置</strong>指定任意文件夹与文件名（扩展名建议{" "}
                  <Text component="span" ff="monospace">
                    .vault
                  </Text>{" "}
                  /{" "}
                  <Text component="span" ff="monospace">
                    .ehv
                  </Text>
                  ）。
                </Text>
              ) : unlockMode ? (
                <Text size="xs" c="dimmed">
                  选择本机上的金库文件，或使用最近路径。
                </Text>
              ) : null}

              <TextInput
                label="路径"
                description={
                  <Group gap={4} wrap="wrap">
                    <Text component="span" size="xs" c="dimmed">
                      留空则使用本机默认金库路径
                    </Text>
                    <Text
                      component="button"
                      type="button"
                      size="xs"
                      c="blue"
                      style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
                      onClick={togglePathHelp}
                    >
                      {pathHelpOpen ? "收起" : "查看默认路径"}
                    </Text>
                  </Group>
                }
                placeholder="例如 /Users/…/echohaven.vault"
                value={selectedPath}
                onChange={(e) => onPathInputChange(e.target.value)}
                styles={{
                  input: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 },
                }}
              />

              <Collapse in={pathHelpOpen}>
                <Text size="xs" c="dimmed" ff="monospace" style={{ wordBreak: "break-all", lineHeight: 1.5 }}>
                  {defaultPath || "—"}
                </Text>
              </Collapse>

              <Group grow gap="xs" wrap="wrap">
                {unlockMode ? (
                  <Button
                    leftSection={<IconFolderOpen size={18} />}
                    variant="light"
                    onClick={() => void pickVaultFile()}
                  >
                    浏览金库文件…
                  </Button>
                ) : (
                  <>
                    <Button
                      leftSection={<IconFolderOpen size={18} />}
                      variant="filled"
                      onClick={() => void pickVaultFile()}
                    >
                      选择保存位置…
                    </Button>
                    {!pathIsDefault && defaultPath ? (
                      <Button variant="default" onClick={useDefaultPath}>
                        使用推荐路径
                      </Button>
                    ) : null}
                  </>
                )}
              </Group>

              {recent.length > 0 ? (
                <>
                  <Divider label="最近使用" labelPosition="left" />
                  <Group gap={6}>
                    {recent.map((p) => (
                      <Tooltip key={p} label={p} multiline maw={400} withArrow>
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="gray"
                          styles={{ root: { maxWidth: 200 } }}
                          onClick={() => onPathInputChange(p)}
                        >
                          {shortVaultLabel(p, 28)}
                        </Button>
                      </Tooltip>
                    ))}
                  </Group>
                </>
              ) : null}
            </Stack>
          </Card>

          <form onSubmit={submit}>
            <Card padding="lg" radius="md" withBorder bg="var(--mantine-color-body)">
              <Stack gap="md">
                <Group gap="xs">
                  <ThemeIcon size="sm" radius="sm" variant="transparent" color="gray">
                    <IconKey size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    主密码
                  </Text>
                </Group>

                <PasswordInput
                  label={createMode ? "设置主密码（至少 8 位）" : "主密码"}
                  placeholder={createMode ? "至少 8 位" : "请输入"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="off"
                />

                {createMode ? (
                  <>
                    <PasswordInput
                      label="再次输入"
                      placeholder="与上一致"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      autoComplete="off"
                    />
                    <Checkbox
                      label="快速创建（较低 KDF，仅建议开发机）"
                      description="备份仍须用此时设置的主密码打开"
                      checked={fastKdf}
                      onChange={(e) => setFastKdf(e.currentTarget.checked)}
                    />
                  </>
                ) : null}

                {err ? (
                  <Alert color="red" variant="light" title="无法继续">
                    {err}
                  </Alert>
                ) : null}

                <Button type="submit" fullWidth size="md" loading={busy}>
                  {createMode ? "创建并进入" : "解锁"}
                </Button>
              </Stack>
            </Card>
          </form>

          <Text size="xs" c="dimmed" ta="center" lh={1.6}>
            主密码无法找回。工作/个人可分库：不同路径各一个金库文件即可。
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
