import {
  AppShell,
  Box,
  Burger,
  Button,
  Group,
  NavLink as MantineNavLink,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconKey,
  IconLock,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import * as api from "../api";
import { useVaultLock, useVaultReload } from "../contexts/vaultUi";
import { useAutoLock } from "../hooks/useAutoLock";
import { useReminderPoller } from "../hooks/useReminderPoller";
import { useAppStore } from "../store";

const SIDEBAR_WIDTH_KEY = "echohaven.sidebarWidth";

function readInitialNavbarWidth(): number {
  try {
    const n = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(n)) {
      const w = Math.round(n);
      if (w >= 200 && w <= 400) return w;
    }
  } catch {
    /* ignore */
  }
  return 240;
}

export function VaultAppShell() {
  const location = useLocation();
  const onLocked = useVaultLock();
  const reload = useVaultReload();

  const vaultPath = useAppStore((s) => s.vaultPath);
  const touchActivity = useAppStore((s) => s.touchActivity);

  const [navbarWidth, setNavbarWidth] = useState(readInitialNavbarWidth);
  const navbarWidthRef = useRef(navbarWidth);
  navbarWidthRef.current = navbarWidth;

  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 48em)");

  useAutoLock(onLocked);
  useReminderPoller(true);

  useEffect(() => {
    void reload();
  }, [reload]);

  const vaultLabel = useMemo(() => {
    const p = vaultPath?.trim();
    if (!p) return "本地金库";
    const norm = p.replace(/\\/g, "/");
    const seg = norm.split("/").filter(Boolean);
    return seg[seg.length - 1] || p;
  }, [vaultPath]);

  const startNavbarResize = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = navbarWidthRef.current;
    const onMove = (ev: globalThis.MouseEvent) => {
      const next = Math.min(400, Math.max(200, startW + ev.clientX - startX));
      navbarWidthRef.current = next;
      setNavbarWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(navbarWidthRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const handleLock = useCallback(async () => {
    await api.lockVault();
    onLocked();
  }, [onLocked]);

  return (
    <AppShell
      mode="static"
      header={{ height: 56 }}
      navbar={{
        width: navbarWidth,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened },
      }}
      padding={0}
      styles={{
        // 切勿覆盖 root 的 display：static 模式下 Mantine 使用 CSS grid 排布
        // Header / Navbar / Main，写成 flex 会导致导航与主区整体错位。
        root: {
          flex: 1,
          minHeight: 0,
          // 不要用 overflow:hidden：会裁剪 sticky 顶栏/侧栏，在 Tauri WebView 里顶栏可能整块看不见
        },
        header: {
          borderBottom: "1px solid var(--mantine-color-default-border)",
        },
        main: {
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignContent: "flex-start",
        },
        navbar: { minHeight: 0 },
      }}
    >
      <AppShell.Header px="md" py="xs">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Title order={4}>余音</Title>
            <Tooltip
              label={vaultPath ?? ""}
              disabled={!vaultPath}
              position="bottom"
              openDelay={400}
              maw={520}
            >
              <Text
                component="span"
                size="xs"
                c="dimmed"
                visibleFrom="sm"
                lineClamp={1}
                maw={220}
                style={{ cursor: vaultPath ? "help" : undefined }}
              >
                {vaultLabel}
              </Text>
            </Tooltip>
          </Group>
          <Button
            leftSection={<IconLock size={16} />}
            variant="light"
            size="sm"
            onClick={() => void handleLock()}
          >
            锁定
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        pr={14}
        style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <Box
          aria-label="拖动调整侧栏宽度"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startNavbarResize}
          className="echohaven-navbar-resize"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 6,
            height: "100%",
            cursor: "col-resize",
            zIndex: 1,
          }}
        />
        <AppShell.Section grow={false}>
          <Text size="xs" fw={600} c="dimmed" mb="xs">
            导航
          </Text>
          <MantineNavLink
            component={Link}
            to="/"
            label="密码库"
            leftSection={<IconKey size={18} />}
            active={location.pathname === "/"}
            onClick={() => {
              touchActivity();
              closeMobile();
            }}
          />
          <MantineNavLink
            component={Link}
            to="/items/new"
            label="新建密码"
            leftSection={<IconPlus size={18} />}
            active={location.pathname === "/items/new"}
            onClick={() => {
              touchActivity();
              closeMobile();
            }}
          />
          <MantineNavLink
            component={Link}
            to="/settings"
            label="设置"
            leftSection={<IconSettings size={18} />}
            active={location.pathname === "/settings"}
            onClick={() => {
              touchActivity();
              closeMobile();
            }}
          />
        </AppShell.Section>

        {isMobile ? (
          <Text size="xs" c="dimmed" mt="md">
            在「密码库」页面以表格浏览全部条目。
          </Text>
        ) : null}
      </AppShell.Navbar>

      <AppShell.Main>
        <Box
          p="md"
          w="100%"
          flex={1}
          mih={0}
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch",
          }}
        >
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
