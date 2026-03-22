import {
  Badge,
  Box,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { KeyboardEvent } from "react";
import { IconBell } from "@tabler/icons-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Entry } from "../types";
import { useAppStore } from "../store";

function entrySubtitle(e: Entry): string {
  const u = e.username.trim();
  if (u) return u;
  const raw = e.url.trim();
  if (!raw) return "—";
  try {
    const href = raw.includes("://") ? raw : `https://${raw}`;
    const host = new URL(href).hostname;
    return host || raw;
  } catch {
    return raw;
  }
}

export function EntryListPage() {
  const navigate = useNavigate();
  const entries = useAppStore((s) => s.entries);
  const search = useAppStore((s) => s.search);
  const filterTags = useAppStore((s) => s.filterTags);
  const tagPresets = useAppStore((s) => s.tagPresets);
  const setSearch = useAppStore((s) => s.setSearch);
  const toggleFilterTag = useAppStore((s) => s.toggleFilterTag);
  const clearFilterTags = useAppStore((s) => s.clearFilterTags);
  const touchActivity = useAppStore((s) => s.touchActivity);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterTags.length > 0) {
      list = list.filter((e) => filterTags.every((t) => e.tags.includes(t)));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const hay = [e.title, e.username, e.url, e.notes, ...e.tags]
          .join("\n")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [entries, search, filterTags]);

  const emptyMessage =
    entries.length === 0
      ? "暂无条目，点击侧栏「新建密码」添加。"
      : "没有匹配的条目，试试清空搜索或调整标签。";

  return (
    <Stack gap="md" flex={1} mih={0} miw={0} w="100%" style={{ display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" wrap="wrap" align="flex-end">
        <Title order={3} className="echohaven-page-title">
          密码库
        </Title>
        <Text size="sm" c="dimmed">
          共 {entries.length} 条 · 当前显示 {filtered.length}
        </Text>
      </Group>

      <TextInput
        placeholder="搜索：标题、账号、网址、标签…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          touchActivity();
        }}
      />

      {tagPresets.length > 0 ? (
        <Box>
          <Text size="xs" fw={600} c="dimmed" mb={4}>
            按标签筛选（多选；需同时包含所选标签）
          </Text>
          <Group gap={6}>
            <Badge
              variant={filterTags.length === 0 ? "filled" : "outline"}
              style={{ cursor: "pointer" }}
              onClick={() => {
                clearFilterTags();
                touchActivity();
              }}
            >
              全部
            </Badge>
            {tagPresets.map((t) => (
              <Badge
                key={t.id}
                variant={filterTags.includes(t.name) ? "filled" : "outline"}
                color={t.color ? undefined : "blue"}
                style={{
                  cursor: "pointer",
                  ...(t.color ? { borderColor: t.color, color: t.color } : {}),
                }}
                onClick={() => {
                  toggleFilterTag(t.name);
                  touchActivity();
                }}
              >
                {t.name}
              </Badge>
            ))}
          </Group>
        </Box>
      ) : null}

      <Box flex={1} mih={0} miw={0} style={{ display: "flex", flexDirection: "column" }}>
        <Table.ScrollContainer minWidth={640} mah="100%" mih={0} type="native" style={{ flex: 1 }}>
        <Table className="echohaven-entry-table" striped highlightOnHover stickyHeader withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>标题</Table.Th>
              <Table.Th>用户名</Table.Th>
              <Table.Th>网址 / 摘要</Table.Th>
              <Table.Th>标签</Table.Th>
              <Table.Th w={72}>提醒</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="xl" size="sm">
                    {emptyMessage}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map((e) => (
                <Table.Tr
                  key={e.id}
                  className="echohaven-entry-row"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    navigate(`/items/${e.id}`);
                    touchActivity();
                  }}
                  onKeyDown={(ev: KeyboardEvent<HTMLTableRowElement>) => {
                    if (ev.key !== "Enter" && ev.key !== " ") return;
                    ev.preventDefault();
                    navigate(`/items/${e.id}`);
                    touchActivity();
                  }}
                >
                  <Table.Td>
                    <Text fw={600} size="sm" lineClamp={2}>
                      {e.title || "（无标题）"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {e.username.trim() || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {entrySubtitle(e)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="wrap">
                      {e.tags.length === 0 ? (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      ) : (
                        e.tags.map((t) => (
                          <Badge key={t} size="xs" variant="light">
                            {t}
                          </Badge>
                        ))
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {e.reminder?.enabled ? (
                      <IconBell size={18} aria-label="已启用提醒" color="var(--mantine-color-orange-filled)" />
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        </Table.ScrollContainer>
      </Box>
    </Stack>
  );
}
