import { invoke } from "@tauri-apps/api/core";
import type { DueReminder, Entry, TagPreset, UnlockInfo, VaultFileStat } from "./types";

export async function getDefaultVaultPath(): Promise<string> {
  return invoke("get_default_vault_path");
}

export async function vaultFileExists(path?: string | null): Promise<boolean> {
  return invoke("vault_file_exists", { path: path ?? null });
}

export async function statVaultFile(path: string): Promise<VaultFileStat> {
  return invoke("stat_vault_file", { path });
}

export async function createVault(
  masterPassword: string,
  path: string | null,
  fastKdf: boolean,
): Promise<UnlockInfo> {
  return invoke("create_vault", {
    masterPassword,
    path,
    fastKdf,
  });
}

export async function unlockVault(
  masterPassword: string,
  path: string | null,
): Promise<UnlockInfo> {
  return invoke("unlock_vault", { masterPassword, path });
}

export async function lockVault(): Promise<void> {
  return invoke("lock_vault");
}

export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return invoke("change_master_password", { currentPassword, newPassword });
}

export async function isUnlocked(): Promise<boolean> {
  return invoke("is_unlocked");
}

export async function listEntries(): Promise<Entry[]> {
  return invoke("list_entries");
}

export async function listTagPresets(): Promise<TagPreset[]> {
  return invoke("list_tag_presets");
}

export async function saveTagPresets(presets: TagPreset[]): Promise<void> {
  return invoke("save_tag_presets", { presets });
}

export async function upsertEntry(entry: Entry): Promise<void> {
  return invoke("upsert_entry", { entry });
}

export async function deleteEntry(id: string): Promise<void> {
  return invoke("delete_entry", { id });
}

export async function saveVaultDisk(): Promise<void> {
  return invoke("save_vault_disk");
}

export async function exportVault(toPath: string): Promise<void> {
  return invoke("export_vault", { toPath });
}

export async function exportEntriesDocument(
  toPath: string,
  includePasswords: boolean,
): Promise<void> {
  return invoke("export_entries_document", { toPath, includePasswords });
}

export async function importVaultReplace(
  fromPath: string,
  masterPassword: string,
): Promise<UnlockInfo> {
  return invoke("import_vault_replace", {
    fromPath,
    masterPassword,
  });
}

export async function scanDueReminders(): Promise<DueReminder[]> {
  return invoke("scan_due_reminders");
}

export async function ackDueReminders(entryIds: string[]): Promise<void> {
  return invoke("ack_due_reminders", { entryIds });
}
