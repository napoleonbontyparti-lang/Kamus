/**
 * Сервер KataCil (Supabase): профили, друзья, рейтинг, облачная копия и восстановление.
 * Адрес и публичный ключ — в app.json → expo.extra.supabase. Пока их нет, функции
 * не вызываются, а интерфейс показывает «сервер не подключён».
 */
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { getProfile, setProfile, getDailyGoal } from "./settings";
import { exportBackup, stats, weekScore, wordsToday } from "./userdb";

type Cfg = { url: string; anonKey: string };
const cfg: Cfg | undefined = (Constants.expoConfig?.extra as any)?.supabase;

export const cloudReady = !!(cfg?.url && cfg?.anonKey);

export type PublicProfile = {
  code: string; nick: string; avatar: string; streak: number; week: number; total_cards: number;
  goal_done: boolean; updated_at: string;
};

const ERRORS: Record<string, string> = {
  not_found: "Пользователь с таким кодом не найден",
  not_owner: "Код или ключ восстановления не подходят",
  code_taken: "Этот код уже занят — создайте новый",
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!cfg) throw new Error("Сервер не подключён");
  const res = await fetch(`${cfg.url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) {
    const msg = (() => { try { return JSON.parse(text).message as string; } catch { return text; } })();
    const known = Object.keys(ERRORS).find((k) => msg?.includes(k));
    throw new Error(known ? ERRORS[known] : `Ошибка сервера: ${msg || res.status}`);
  }
  return text ? JSON.parse(text) : (null as T);
}

export const keyHash = (key: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key.replace(/-/g, "").toUpperCase());

/** Отправить свой профиль и статистику (создаёт профиль при первом вызове). */
export async function syncProfile(): Promise<void> {
  if (!cloudReady) return;
  const p = getProfile();
  const s = stats();
  const goal = getDailyGoal();
  await rpc("upsert_profile", {
    p_code: p.code, p_key_hash: await keyHash(p.key), p_nick: p.nick, p_avatar: p.avatar,
    p_streak: s.streak, p_week: weekScore(), p_total: s.cards,
    p_goal_done: goal.enabled && wordsToday() >= goal.count,
  });
  if (!p.registered) setProfile({ registered: true });
}

export async function findProfile(code: string): Promise<PublicProfile | null> {
  return rpc<PublicProfile | null>("find_profile", { p_code: code });
}

export async function addFriend(code: string): Promise<PublicProfile> {
  const p = getProfile();
  if (code.toUpperCase().trim() === p.code) throw new Error("Это ваш собственный код");
  await syncProfile();
  return rpc<PublicProfile>("add_friend", { p_code: p.code, p_key_hash: await keyHash(p.key), p_friend: code });
}

export async function removeFriend(code: string): Promise<void> {
  const p = getProfile();
  await rpc("remove_friend", { p_code: p.code, p_key_hash: await keyHash(p.key), p_friend: code });
}

export async function leaderboard(): Promise<PublicProfile[]> {
  const p = getProfile();
  await syncProfile();
  return rpc<PublicProfile[]>("leaderboard", { p_code: p.code });
}

/** Облачная копия всех данных — для восстановления аккаунта на другом телефоне. */
export async function saveCloudBackup(): Promise<void> {
  const p = getProfile();
  await syncProfile();
  await rpc("save_backup", { p_code: p.code, p_key_hash: await keyHash(p.key), p_data: exportBackup() });
}

export async function recoverAccount(code: string, key: string):
  Promise<{ nick: string; avatar: string; backup: string | null; backup_at: string | null }> {
  return rpc("recover", { p_code: code.toUpperCase().trim(), p_key_hash: await keyHash(key) });
}
