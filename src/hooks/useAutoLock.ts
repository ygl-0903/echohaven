import { useEffect, useRef } from "react";
import * as api from "../api";
import {
  loadAutoLockPreference,
  persistAutoLockPreference,
  useAppStore,
} from "../store";

export function useAutoLock(onLock: () => void) {
  const autoLockMinutes = useAppStore((s) => s.autoLockMinutes);
  const lastActivity = useAppStore((s) => s.lastActivity);
  const touchActivity = useAppStore((s) => s.touchActivity);
  const setAutoLockMinutes = useAppStore((s) => s.setAutoLockMinutes);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setAutoLockMinutes(loadAutoLockPreference());
    }
  }, [setAutoLockMinutes]);

  useEffect(() => {
    persistAutoLockPreference(autoLockMinutes);
  }, [autoLockMinutes]);

  useEffect(() => {
    const onMove = () => touchActivity();
    window.addEventListener("keydown", onMove);
    window.addEventListener("pointerdown", onMove);
    return () => {
      window.removeEventListener("keydown", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [touchActivity]);

  useEffect(() => {
    if (autoLockMinutes <= 0) return;
    const ms = autoLockMinutes * 60 * 1000;
    const t = window.setInterval(() => {
      if (Date.now() - lastActivity >= ms) {
        void api.lockVault().then(() => onLock());
      }
    }, 10_000);
    return () => window.clearInterval(t);
  }, [autoLockMinutes, lastActivity, onLock]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && autoLockMinutes > 0) {
        /* optional: lock on hide — can be aggressive; skip for UX */
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [autoLockMinutes]);
}
