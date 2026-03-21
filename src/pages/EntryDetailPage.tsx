import { Center, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ask } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import * as api from "../api";
import { useVaultReload } from "../contexts/vaultUi";
import { EntryForm } from "../features/entry/EntryForm";
import { useVaultClipboard } from "../hooks/useVaultClipboard";
import { useAppStore } from "../store";
import type { Entry } from "../types";

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reload = useVaultReload();
  const copy = useVaultClipboard();
  const entries = useAppStore((s) => s.entries);
  const vaultListHydrated = useAppStore((s) => s.vaultListHydrated);
  const tagPresets = useAppStore((s) => s.tagPresets);
  const touchActivity = useAppStore((s) => s.touchActivity);

  const entry = useMemo(() => entries.find((e) => e.id === id), [entries, id]);

  const onSave = useCallback(
    async (e: Entry) => {
      await api.upsertEntry(e);
      await reload();
      notifications.show({ title: "已保存", message: " ", color: "teal" });
    },
    [reload],
  );

  const onDelete = useCallback(
    async (entryId: string) => {
      const msg = "确定删除此条目？此操作不可撤销。";
      let ok = false;
      try {
        ok = await ask(msg, { title: "余音", kind: "warning" });
      } catch {
        ok = window.confirm(msg);
      }
      if (!ok) return;
      await api.deleteEntry(entryId);
      await reload();
      notifications.show({ title: "已删除", message: " ", color: "gray" });
      navigate("/");
    },
    [navigate, reload],
  );

  if (!id) return <Navigate to="/" replace />;

  if (!vaultListHydrated) {
    return (
      <Center flex={1} mih={320} role="status" aria-live="polite">
        <Loader color="blue" />
      </Center>
    );
  }

  if (!entry) return <Navigate to="/" replace />;

  return (
    <EntryForm
      key={entry.id}
      entry={entry}
      mode="edit"
      tagPresets={tagPresets}
      onSave={(e) => void onSave(e)}
      onDelete={(i) => void onDelete(i)}
      onCopyPassword={(t) => void copy(t)}
      onOpenUrl={(u) => void openUrl(u)}
      onTouch={() => touchActivity()}
    />
  );
}
