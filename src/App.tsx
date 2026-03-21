import { Center, Loader } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import * as api from "./api";
import { vaultRouter } from "./app/vaultRouter";
import { AuthFlow } from "./components/AuthFlow";
import { VaultLockContext, VaultReloadProvider } from "./contexts/vaultUi";
import { useAppStore } from "./store";

function App() {
  const setEntries = useAppStore((s) => s.setEntries);
  const setTagPresets = useAppStore((s) => s.setTagPresets);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const setSearch = useAppStore((s) => s.setSearch);
  const clearFilterTags = useAppStore((s) => s.clearFilterTags);
  const setVaultListHydrated = useAppStore((s) => s.setVaultListHydrated);
  const [phase, setPhase] = useState<"boot" | "auth" | "vault">("boot");

  useEffect(() => {
    void api.isUnlocked().then((ok) => {
      setPhase(ok ? "vault" : "auth");
    });
  }, []);

  const onAuthed = useCallback(() => {
    setPhase("vault");
  }, []);

  const onLocked = useCallback(() => {
    setEntries([]);
    setTagPresets([]);
    setSelectedId(null);
    setSearch("");
    clearFilterTags();
    setVaultListHydrated(false);
    setPhase("auth");
  }, [setEntries, setTagPresets, setSelectedId, setSearch, clearFilterTags, setVaultListHydrated]);

  if (phase === "boot") {
    return (
      <Center flex={1} role="status" aria-live="polite">
        <Loader color="blue" />
      </Center>
    );
  }

  if (phase === "auth") {
    return (
      <main role="main" style={{ flex: 1, minHeight: 0 }}>
        <AuthFlow onAuthed={onAuthed} />
      </main>
    );
  }

  return (
    <main role="main" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <VaultLockContext.Provider value={onLocked}>
        <VaultReloadProvider>
          <RouterProvider router={vaultRouter} />
        </VaultReloadProvider>
      </VaultLockContext.Provider>
    </main>
  );
}

export default App;
