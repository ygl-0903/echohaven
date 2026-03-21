import { notifications } from "@mantine/notifications";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useAppStore } from "../store";

export function useVaultClipboard() {
  const touchActivity = useAppStore((s) => s.touchActivity);

  return async function copyToClipboard(text: string, seconds = 30) {
    await writeText(text);
    touchActivity();
    notifications.show({
      title: "已复制",
      message: `约 ${seconds} 秒后尝试清空剪贴板`,
      color: "teal",
    });
    window.setTimeout(() => {
      void writeText("").catch(() => {});
    }, seconds * 1000);
  };
}
