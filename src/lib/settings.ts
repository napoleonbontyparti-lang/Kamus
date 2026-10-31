/** Настройки пользователя (хранятся в user.db) с подпиской для React. */
import { useSyncExternalStore } from "react";
import { userDb } from "./userdb";

export type AffixColors = { enabled: boolean; pre: string; root: string; suf: string; clitic: string };

export const AFFIX_PALETTE = [
  "#2F80ED", "#E0533D", "#8E5CC4", "#2E9E6A", "#D9962B", "#D94F8C", "#1BA3B5", "#7A6A58", "",
];

export const DEFAULT_AFFIX: AffixColors = {
  enabled: false, pre: "#2F80ED", root: "", suf: "#E0533D", clitic: "#8E5CC4", // root "" — обычный цвет слова
};

const listeners = new Set<() => void>();
let cache: AffixColors | null = null;

function ensureTable() {
  userDb().execSync("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)");
}

export function getAffixColors(): AffixColors {
  if (cache) return cache;
  ensureTable();
  const r = userDb().getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'affix'");
  cache = r ? { ...DEFAULT_AFFIX, ...JSON.parse(r.value) } : DEFAULT_AFFIX;
  return cache!;
}

export function setAffixColors(patch: Partial<AffixColors>) {
  const next = { ...getAffixColors(), ...patch };
  ensureTable();
  userDb().runSync("INSERT OR REPLACE INTO settings(key, value) VALUES('affix', ?)", [JSON.stringify(next)]);
  cache = next;
  listeners.forEach((l) => l());
}

export function useAffixColors(): AffixColors {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getAffixColors,
  );
}
