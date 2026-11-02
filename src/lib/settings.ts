/** Настройки пользователя (таблица settings в user.db) с подпиской для React. */
import { useSyncExternalStore } from "react";
import * as Crypto from "expo-crypto";
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

// ───────── вибрация (по умолчанию выключена) ─────────

export const getVibration = () => read<boolean>("vibration", false);
export const setVibration = (v: boolean) => write("vibration", v);
export const useVibration = () => useSyncExternalStore(subscribe, getVibration);

// ───────── ежедневная цель ─────────

export type DailyGoal = { enabled: boolean; count: number };
export const DEFAULT_GOAL: DailyGoal = { enabled: false, count: 20 };
export const getDailyGoal = () => read<DailyGoal>("dailyGoal", DEFAULT_GOAL);
export const setDailyGoal = (patch: Partial<DailyGoal>) => write("dailyGoal", { ...getDailyGoal(), ...patch });
export const useDailyGoal = () => useSyncExternalStore(subscribe, getDailyGoal);

// ───────── профиль ─────────

export type Profile = {
  nick: string;
  code: string;        // уникальный код для друзей, например 7F3Q-9AKD
  key: string;         // ключ восстановления (секрет, показывается пользователю)
  avatar: string;      // data:image/jpeg;base64,… (маленькая квадратная картинка) или ""
  registered: boolean; // профиль уже есть на сервере
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O и 1/I
function randomString(n: number): string {
  const bytes = Crypto.getRandomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[(bytes[i] || Math.floor(Math.random() * 256)) % ALPHABET.length];
  return out;
}

export const newCode = () => { const r = randomString(8); return `${r.slice(0, 4)}-${r.slice(4)}`; };
export const newKey = () => { const r = randomString(16); return r.match(/.{4}/g)!.join("-"); };

export function getProfile(): Profile {
  const p = read<Profile | null>("profile", null);
  if (p && p.code) return p;
  // первый запуск: создаём профиль
  const fresh: Profile = { nick: "Si Kancil", code: newCode(), key: newKey(), avatar: "", registered: false };
  write("profile", fresh);
  return fresh;
}
export const setProfile = (patch: Partial<Profile>) => write("profile", { ...getProfile(), ...patch });
export const useProfile = () => useSyncExternalStore(subscribe, getProfile);

// ───────── автосохранение в облако KataCil ─────────

export type CloudState = { auto: boolean; lastAt: number; lastError: string };
export const getCloudState = () => read<CloudState>("cloud", { auto: true, lastAt: 0, lastError: "" });
export const setCloudState = (patch: Partial<CloudState>) => write("cloud", { ...getCloudState(), ...patch });
export const useCloudState = () => useSyncExternalStore(subscribe, getCloudState);

// ───────── счётчики для достижений ─────────

export type Counters = { ocr: number; friends: number };
export const getCounters = () => read<Counters>("counters", { ocr: 0, friends: 0 });
export const bumpCounter = (k: keyof Counters, value?: number) => {
  const c = getCounters();
  write("counters", { ...c, [k]: value ?? c[k] + 1 });
};
