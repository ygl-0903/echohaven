import { useEffect } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import * as api from "../api";

export function useReminderPoller(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    async function tick() {
      try {
        const hits = await api.scanDueReminders();
        if (hits.length === 0) return;

        let ok = await isPermissionGranted();
        if (!ok) {
          const p = await requestPermission();
          ok = p === "granted";
        }

        if (!ok) return;

        for (const h of hits) {
          await sendNotification({
            title: "余音 · 提醒",
            body: `「${h.title}」到期日：${h.dueDate}`,
          });
        }
        await api.ackDueReminders(hits.map((h) => h.entryId));
      } catch {
        /* ignore */
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 60_000);
    return () => window.clearInterval(id);
  }, [enabled]);
}
