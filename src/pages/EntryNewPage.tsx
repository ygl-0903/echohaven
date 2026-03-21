import { notifications } from "@mantine/notifications";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import { EntryForm } from "../features/entry/EntryForm";
import { useVaultClipboard } from "../hooks/useVaultClipboard";
import { useVaultReload } from "../contexts/vaultUi";
import { useAppStore } from "../store";
import type { Entry } from "../types";

function newEntry(): Entry {
  return {
    id: crypto.randomUUID(),
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tags: [],
    reminder: null,
  };
}

export function EntryNewPage() {
  const navigate = useNavigate();
  const reload = useVaultReload();
  const copy = useVaultClipboard();
  const tagPresets = useAppStore((s) => s.tagPresets);
  const touchActivity = useAppStore((s) => s.touchActivity);

  const entry = useMemo(() => newEntry(), []);

  const onSave = useCallback(
    async (e: Entry) => {
      if (!e.title.trim()) {
        notifications.show({ title: "请填写标题", message: " ", color: "yellow" });
        return;
      }
      await api.upsertEntry(e);
      await reload();
      notifications.show({ title: "已保存", message: "新密码条目已写入金库", color: "teal" });
      navigate(`/items/${e.id}`, { replace: true });
    },
    [navigate, reload],
  );

  return (
    <EntryForm
      entry={entry}
      mode="new"
      tagPresets={tagPresets}
      onSave={onSave}
      onCancel={() => navigate("/")}
      onCopyPassword={(t) => void copy(t)}
      onOpenUrl={(u) => void openUrl(u)}
      onTouch={() => touchActivity()}
    />
  );
}
