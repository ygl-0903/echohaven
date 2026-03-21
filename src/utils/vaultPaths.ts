const RECENT_KEY = "echohaven.recentVaultPaths";
const LAST_KEY = "echohaven.lastVaultPath";
const MAX_RECENT = 12;

export function getRecentVaultPaths(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  } catch {
    return [];
  }
}

export function rememberVaultPath(path: string): void {
  const p = path.trim();
  if (!p) return;
  try {
    localStorage.setItem(LAST_KEY, p);
    const prev = getRecentVaultPaths().filter((x) => x !== p);
    const next = [p, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getLastVaultPath(): string | null {
  try {
    const v = localStorage.getItem(LAST_KEY)?.trim();
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function shortVaultLabel(path: string, maxLen = 36): string {
  const t = path.trim();
  if (t.length <= maxLen) return t;
  return `…${t.slice(-(maxLen - 1))}`;
}
