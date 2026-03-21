export interface Reminder {
  kind: string;
  dueDate: string;
  enabled: boolean;
  lastNotifiedOn?: string | null;
}

export interface TagPreset {
  id: string;
  name: string;
  color?: string | null;
}

export interface Entry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
  reminder?: Reminder | null;
}

export interface UnlockInfo {
  entryCount: number;
  vaultPath: string;
  /** 整库导入替换前自动备份的路径（若有） */
  preImportBackupPath?: string | null;
}

export interface VaultFileStat {
  sizeBytes: number;
  modifiedIso: string | null;
}

export interface DueReminder {
  entryId: string;
  title: string;
  dueDate: string;
}
