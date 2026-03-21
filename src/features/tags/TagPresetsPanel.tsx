import {
  ActionIcon,
  Button,
  ColorInput,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { TagPreset } from "../../types";

type Props = {
  presets: TagPreset[];
  onSave: (next: TagPreset[]) => void | Promise<void>;
};

export function TagPresetsPanel({ presets, onSave }: Props) {
  const [local, setLocal] = useState<TagPreset[]>(presets);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(presets);
  }, [presets]);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        预设标签用于在编辑条目时一键添加，并可在列表侧栏筛选。保存后写入加密金库。
      </Text>
      {local.map((p, i) => (
        <Paper key={p.id} withBorder p="sm">
          <Group align="flex-end" wrap="nowrap" grow>
            <TextInput
              label="名称"
              value={p.name}
              onChange={(e) => {
                const v = e.target.value;
                setLocal((xs) => xs.map((x, j) => (j === i ? { ...x, name: v } : x)));
              }}
            />
            <ColorInput
              label="颜色（可选）"
              format="hex"
              swatches={[
                "#228be6",
                "#15aabf",
                "#12b886",
                "#40c057",
                "#fab005",
                "#fd7e14",
                "#fa5252",
                "#e64980",
                "#be4bdb",
                "#7950f2",
              ]}
              value={p.color ?? ""}
              onChange={(c) => {
                setLocal((xs) =>
                  xs.map((x, j) => (j === i ? { ...x, color: c || null } : x)),
                );
              }}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              aria-label="删除"
              onClick={() => setLocal((xs) => xs.filter((_, j) => j !== i))}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      ))}
      <Group>
        <Button
          variant="light"
          onClick={() =>
            setLocal((xs) => [
              ...xs,
              { id: crypto.randomUUID(), name: "", color: null },
            ])
          }
        >
          添加预设
        </Button>
        <Button
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const cleaned = local
                .map((x) => ({
                  ...x,
                  name: x.name.trim(),
                }))
                .filter((x) => x.name.length > 0);
              await onSave(cleaned);
            } finally {
              setSaving(false);
            }
          }}
        >
          保存到金库
        </Button>
      </Group>
    </Stack>
  );
}
