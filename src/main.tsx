import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { createTheme, localStorageColorSchemeManager, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const colorSchemeManager = localStorageColorSchemeManager({
  key: "echohaven-color-scheme",
});

/** 琥珀金主色阶：0 最浅 … 9 最深（Mantine 约定） */
const haven = [
  "#fff8e9",
  "#ffefcf",
  "#f0dcb0",
  "#e2c67e",
  "#d4af37",
  "#b8922a",
  "#967522",
  "#6e5618",
  "#4a3a10",
  "#2c220c",
] as const;

const theme = createTheme({
  primaryColor: "haven",
  colors: { haven },
  defaultRadius: "md",
  fontFamily:
    '"Instrument Sans", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  headings: {
    fontFamily:
      '"Noto Serif SC", "Instrument Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", serif',
    fontWeight: "600",
  },
  defaultGradient: { from: "haven.3", to: "haven.7", deg: 125 },
  shadows: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)",
    md: "0 8px 30px rgba(0, 0, 0, 0.18)",
    lg: "0 24px 64px rgba(0, 0, 0, 0.28)",
  },
  components: {
    Button: {
      defaultProps: { radius: "md" },
    },
    Paper: {
      defaultProps: { radius: "lg" },
    },
    Card: {
      defaultProps: { radius: "md" },
    },
    TextInput: {
      defaultProps: { radius: "md" },
    },
    PasswordInput: {
      defaultProps: { radius: "md" },
    },
    Modal: {
      defaultProps: { radius: "lg" },
    },
    NavLink: {
      defaultProps: { radius: "md" },
      styles: {
        root: {
          transition: "background-color 160ms ease, color 160ms ease, box-shadow 200ms ease",
        },
      },
    },
    AppShell: {
      styles: {
        header: {
          backdropFilter: "saturate(140%) blur(14px)",
        },
        navbar: {
          transition: "border-color 200ms ease, background 200ms ease",
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider
      theme={theme}
      defaultColorScheme="dark"
      colorSchemeManager={colorSchemeManager}
    >
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Notifications position="top-right" zIndex={4000} />
        <App />
      </div>
    </MantineProvider>
  </React.StrictMode>,
);
