import type { Reminder } from "../../types";

export function emptyReminder(): Reminder {
  return {
    kind: "rotate",
    dueDate: new Date().toISOString().slice(0, 10),
    enabled: false,
    lastNotifiedOn: null,
  };
}
