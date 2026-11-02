/** Настройки пользователя (таблица settings в user.db) с подпиской для React. */
import { useSyncExternalStore } from "react";
import { userDb } from "./userdb";

const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function read<T>(key: string, def: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const r = userDb().getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  let v: T = def;
  if (r) {
    try {
      const parsed = JSON.parse(r.value);
      v = def && typeof def === "object" && !Array.isArray(def) ? { ...def, ...parsed } : parsed;
    } catch { /* повреждённое значение — берём умолчание */ }
  }
  cache.set(key, v);
  return v;
}

function write(key: string, value: unknown) {
  userDb().runSync("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", [key, JSON.stringify(value)]);
  cache.set(key, value);
  listeners.forEach((l) => l());
}

/** После восстановления из копии — перечитать всё из базы. */
export function reloadSettings() {
  cache.clear();
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

// ───────── тема ─────────

export type ThemeMode = "light" | "dark" | "system";
export const THEME_LABELS: Record<ThemeMode, string> = { light: "Светлая", dark: "Тёмная", system: "Как в системе" };

export const getThemeMode = () => read<ThemeMode>("theme", "light");
export const setThemeMode = (m: ThemeMode) => write("theme", m);
export const useThemeMode = () => useSyncExternalStore(subscribe, getThemeMode);

// ───────── цветные аффиксы ─────────

export type AffixColors = { enabled: boolean; pre: string; root: string; suf: string; clitic: string };

export const AFFIX_PALETTE = [
  "#2F80ED", "#E0533D", "#8E5CC4", "#2E9E6A", "#D9962B", "#D94F8C", "#1BA3B5", "#7A6A58", "",
];

export const DEFAULT_AFFIX: AffixColors = {
  enabled: false, pre: "#2F80ED", root: "", suf: "#E0533D", clitic: "#8E5CC4", // root "" — обычный цвет слова
};

export const getAffixColors = () => read<AffixColors>("affix", DEFAULT_AFFIX);
export const setAffixColors = (patch: Partial<AffixColors>) => write("affix", { ...getAffixColors(), ...patch });
export const useAffixColors = () => useSyncExternalStore(subscribe, getAffixColors);

// ───────── резервная копия ─────────

export const getLastBackup = () => read<number>("lastBackup", 0);
export const setLastBackup = (ts: number) => write("lastBackup", ts);
export const useLastBackup = () => useSyncExternalStore(subscribe, getLastBackup);
