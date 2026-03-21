import { createContext, useCallback, useContext, type ReactNode } from "react";
import * as api from "../api";
import { useAppStore } from "../store";

export const VaultLockContext = createContext<() => void>(() => {});

export function useVaultLock() {
  return useContext(VaultLockContext);
}

export const VaultReloadContext = createContext<() => Promise<void>>(
  async () => {},
);

export function useVaultReload() {
  return useContext(VaultReloadContext);
}

export function VaultReloadProvider({ children }: { children: ReactNode }) {
  const reload = useCallback(async () => {
    try {
      const [entries, presets] = await Promise.all([
        api.listEntries(),
        api.listTagPresets(),
      ]);
      useAppStore.getState().setEntries(entries);
      useAppStore.getState().setTagPresets(presets);
    } finally {
      useAppStore.getState().setVaultListHydrated(true);
    }
  }, []);

  return (
    <VaultReloadContext.Provider value={reload}>
      {children}
    </VaultReloadContext.Provider>
  );
}
