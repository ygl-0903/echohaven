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

const theme = createTheme({
  primaryColor: "blue",
  fontFamily:
    'ui-sans-serif, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
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
