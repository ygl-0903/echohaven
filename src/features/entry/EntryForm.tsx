import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Collapse,
  Group,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconExternalLink } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import type { Entry, TagPreset } from "../../types";
import { generatePassword, type GenOptions } from "../../utils/passwordGen";
import { emptyReminder } from "./reminder";

type Props = {
  entry: Entry;
  mode: "new" | "edit";
  tagPresets: TagPreset[];
  onSave: (e: Entry) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onCancel?: () => void;
  onCopyPassword: (text: string) => void | Promise<void>;
  onOpenUrl: (url: string) => void | Promise<void>;
  onTouch: () => void;
};

function entryFingerprint(e: Entry): string {
  return JSON.stringify({
    title: e.title,
    username: e.username,
    password: e.password,
    url: e.url,
    notes: e.notes,
    tags: [...e.tags].sort(),
    reminder: e.reminder ?? null,
  });
}

export function EntryForm({
  entry,
  mode,
  tagPresets,
  onSave,
  onDelete,
  onCancel,
  onCopyPassword,
  onOpenUrl,
  onTouch,
}: Props) {
  const [draft, setDraft] = useState<Entry>(entry);
  const [genOpened, { toggle: toggleGen }] = useDisclosure(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [genOpts, setGenOpts] = useState<GenOptions>({
    length: 20,
    lower: true,
    upper: true,
    digits: true,
    symbols: true,
    readable: false,
  });

  useEffect(() => {
    setDraft(entry);
  }, [entry]);

  const isDirty = useMemo(() => entryFingerprint(draft) !== entryFingerprint(entry), [draft, entry]);

  const r = draft.reminder;

  function setReminder(next: typeof r) {
    setDraft((d) => ({ ...d, reminder: next }));
    onTouch();
  }

  function applyPreset(p: TagPreset) {
    const name = p.name.trim();
    if (!name || draft.tags.includes(name)) return;
    setDraft((d) => ({ ...d, tags: [...d.tags, name] }));
    onTouch();
  }

  return (
    <Paper shadow="sm" p="lg" radius="md" maw={640} w="100%" mx="auto">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Title order={3}>{mode === "new" ? "新建密码" : "查看 / 编辑"}</Title>
          <Group gap="xs">
            {onCancel ? (
              <Button variant="default" onClick={onCancel}>
                取消
              </Button>
            ) : null}
            <Button onClick={() => void onSave(draft)}>保存</Button>
            {mode === "edit" && onDelete ? (
              <Button color="red" variant="light" onClick={() => void onDelete(draft.id)}>
                删除
              </Button>
            ) : null}
          </Group>
        </Group>

        {isDirty ? (
          <Alert color="yellow" title="有未保存的更改">
            修改尚未写入金库，离开前请点击「保存」。
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="标题"
            value={draft.title}
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }));
              onTouch();
            }}
          />
          <TextInput
            label="用户名"
            value={draft.username}
            onChange={(e) => {
              setDraft((d) => ({ ...d, username: e.target.value }));
              onTouch();
            }}
          />
        </SimpleGrid>

        <div>
          <Group justify="space-between" mb={4}>
            <Text size="sm" fw={500}>
              密码
            </Text>
            <Button size="compact-xs" variant="light" onClick={() => void onCopyPassword(draft.password)}>
              复制
            </Button>
          </Group>
          <PasswordInput
            visible={pwVisible}
            onVisibilityChange={setPwVisible}
            value={draft.password}
            onChange={(e) => {
              setDraft((d) => ({ ...d, password: e.target.value }));
              onTouch();
            }}
            autoComplete="off"
          />
          <Button variant="subtle" size="compact-sm" px={0} mt="xs" onClick={toggleGen}>
            密码生成器
          </Button>
          <Collapse in={genOpened}>
            <Paper withBorder p="sm" mt="sm">
              <Stack gap="sm">
                <Text size="sm">长度 {genOpts.length}</Text>
                <Slider
                  min={12}
                  max={48}
                  value={genOpts.length}
                  onChange={(v) => setGenOpts((o) => ({ ...o, length: v }))}
                />
                <Checkbox
                  label="小写"
                  checked={genOpts.lower}
                  onChange={(e) => setGenOpts((o) => ({ ...o, lower: e.currentTarget.checked }))}
                />
                <Checkbox
                  label="大写"
                  checked={genOpts.upper}
                  onChange={(e) => setGenOpts((o) => ({ ...o, upper: e.currentTarget.checked }))}
                />
                <Checkbox
                  label="数字"
                  checked={genOpts.digits}
                  onChange={(e) => setGenOpts((o) => ({ ...o, digits: e.currentTarget.checked }))}
                />
                <Checkbox
                  label="符号"
                  checked={genOpts.symbols}
                  onChange={(e) => setGenOpts((o) => ({ ...o, symbols: e.currentTarget.checked }))}
                />
                <Checkbox
                  label="易读（减少混淆字符）"
                  checked={genOpts.readable}
                  onChange={(e) => setGenOpts((o) => ({ ...o, readable: e.currentTarget.checked }))}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const p = generatePassword(genOpts);
                    setDraft((d) => ({ ...d, password: p }));
                    onTouch();
                  }}
                >
                  生成并填入
                </Button>
              </Stack>
            </Paper>
          </Collapse>
        </div>

        <Group align="flex-end" wrap="nowrap" gap="xs">
          <TextInput
            style={{ flex: 1 }}
            label="网址"
            value={draft.url}
            onChange={(e) => {
              setDraft((d) => ({ ...d, url: e.target.value }));
              onTouch();
            }}
          />
          {draft.url ? (
            <ActionIcon
              variant="light"
              size="lg"
              aria-label="在浏览器打开"
              onClick={() => void onOpenUrl(draft.url)}
            >
              <IconExternalLink size={18} />
            </ActionIcon>
          ) : null}
        </Group>

        {tagPresets.length > 0 ? (
          <div>
            <Text size="sm" fw={500} mb={6}>
              从预设添加标签
            </Text>
            <Group gap="xs">
              {tagPresets.map((p) => (
                <Button
                  key={p.id}
                  size="compact-xs"
                  variant="light"
                  style={p.color ? { borderColor: p.color, color: p.color } : undefined}
                  onClick={() => {
                    applyPreset(p);
                  }}
                >
                  + {p.name}
                </Button>
              ))}
            </Group>
          </div>
        ) : null}

        <TagsInput
          label="标签"
          description="回车添加；可与预设混用"
          value={draft.tags}
          onChange={(tags) => {
            setDraft((d) => ({ ...d, tags }));
            onTouch();
          }}
          placeholder="输入后按回车"
        />

        <Textarea label="备注" minRows={4} value={draft.notes} onChange={(e) => {
          setDraft((d) => ({ ...d, notes: e.target.value }));
          onTouch();
        }} />

        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" mb="sm">
            到期当日应用会尝试通过系统通知提示（请在系统中允许本应用通知）。
          </Text>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>提醒</Text>
            {!r ? (
              <Button size="compact-sm" variant="light" onClick={() => setReminder(emptyReminder())}>
                添加提醒
              </Button>
            ) : (
              <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setReminder(null)}>
                移除
              </Button>
            )}
          </Group>
          {r ? (
            <Stack gap="sm">
              <Checkbox
                label="启用"
                checked={r.enabled}
                onChange={(e) => setReminder({ ...r, enabled: e.currentTarget.checked })}
              />
              <Select
                label="类型"
                data={[
                  { value: "rotate", label: "定期轮换" },
                  { value: "expire", label: "到期（订阅/证书）" },
                  { value: "custom", label: "自定义" },
                ]}
                value={r.kind}
                onChange={(v) => v && setReminder({ ...r, kind: v })}
              />
              <TextInput type="date" label="到期日" value={r.dueDate} onChange={(e) => setReminder({ ...r, dueDate: e.target.value })} />
            </Stack>
          ) : null}
        </Paper>
      </Stack>
    </Paper>
  );
}
