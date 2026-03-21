import { create } from "zustand";
import type { Entry, TagPreset } from "./types";

export type AppStore = {
  vaultPath: string | null;
  entries: Entry[];
  tagPresets: TagPreset[];
  search: string;
  /** 多选：条目需同时包含所选全部标签（空数组表示不过滤） */
  filterTags: string[];
  vaultListHydrated: boolean;
  selectedId: string | null;
  autoLockMinutes: number;
  lastActivity: number;
  importTargetPath: string | null;
  setVaultPath: (p: string | null) => void;
  setEntries: (e: Entry[]) => void;
  setTagPresets: (t: TagPreset[]) => void;
  setSearch: (s: string) => void;
  setFilterTags: (t: string[]) => void;
  toggleFilterTag: (name: string) => void;
  clearFilterTags: () => void;
  setVaultListHydrated: (v: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setAutoLockMinutes: (m: number) => void;
  touchActivity: () => void;
  setImportTargetPath: (p: string | null) => void;
  patchEntry: (id: string, patch: Partial<Entry>) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  vaultPath: null,
  entries: [],
  tagPresets: [],
  search: "",
  filterTags: [],
  vaultListHydrated: false,
  selectedId: null,
  autoLockMinutes: 15,
  lastActivity: Date.now(),
  importTargetPath: null,
  setVaultPath: (vaultPath) => set({ vaultPath }),
  setEntries: (entries) => set({ entries }),
  setTagPresets: (tagPresets) => set({ tagPresets }),
  setSearch: (search) => set({ search }),
  setFilterTags: (filterTags) => set({ filterTags }),
  toggleFilterTag: (name) =>
    set((s) => {
      const has = s.filterTags.includes(name);
      return {
        filterTags: has
          ? s.filterTags.filter((t) => t !== name)
          : [...s.filterTags, name],
      };
    }),
  clearFilterTags: () => set({ filterTags: [] }),
  setVaultListHydrated: (vaultListHydrated) => set({ vaultListHydrated }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
  touchActivity: () => set({ lastActivity: Date.now() }),
  setImportTargetPath: (importTargetPath) => set({ importTargetPath }),
  patchEntry: (id, patch) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
}));

const STORAGE_KEY = "echohaven.autoLockMinutes";

export function loadAutoLockPreference(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      const n = Number(v);
      if ([5, 15, 30, 60, 0].includes(n)) return n;
    }
  } catch {
    /* ignore */
  }
  return 15;
}

export function persistAutoLockPreference(minutes: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(minutes));
  } catch {
    /* ignore */
  }
}
