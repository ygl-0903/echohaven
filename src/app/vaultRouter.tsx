import { createBrowserRouter } from "react-router-dom";
import { VaultAppShell } from "./VaultAppShell";
import { EntryDetailPage } from "../pages/EntryDetailPage";
import { EntryNewPage } from "../pages/EntryNewPage";
import { SettingsPage } from "../pages/SettingsPage";
import { EntryListPage } from "../pages/EntryListPage";

export const vaultRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <VaultAppShell />
      </div>
    ),
    children: [
      { index: true, element: <EntryListPage /> },
      { path: "items/new", element: <EntryNewPage /> },
      { path: "items/:id", element: <EntryDetailPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
