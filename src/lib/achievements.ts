/**
 * Достижения (Pencapaian): у каждого пять уровней, за уровни — 10, 20, 30, 50 и 100 Секти.
 * Названия и подписи — милые индонезийские, ниже — перевод по-русски.
 */
import { useSyncExternalStore } from "react";
import { addSekti, claimedLevel, metrics, setClaimedLevel } from "./userdb";
import { getCounters, getDailyGoal } from "./settings";
import type { AchIcon } from "../components/Laurel";

export type Metric =
  | "cards" | "learned" | "correct" | "affixCorrect" | "flawless"
  | "goalDays" | "bestStreak" | "visitDays" | "viewed" | "ocr" | "friends";

export type AchievementDef = {
  id: string;
  name: string;      // название по-индонезийски
  caption: string;   // милая подпись по-индонезийски, {n} — цель уровня
  ru: string;        // перевод/пояснение по-русски
  metric: Metric; tiers: number[]; color: string; icon: AchIcon;
};

/** Награда за уровни 1–5 (Секти). */
export const TIER_REWARDS = [10, 20, 30, 50, 100];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "rajin-datang", name: "Rajin Datang", caption: "Mampir belajar {n} hari — Kancil senang sekali!",
    ru: "Заходите в приложение в разные дни", metric: "visitDays", tiers: [3, 7, 14, 30, 100], color: "#2E7D74", icon: "kuku" },
  { id: "api-biru", name: "Api Biru", caption: "{n} hari berturut-turut, apinya tetap menyala!",
    ru: "Занимайтесь дни подряд", metric: "bestStreak", tiers: [3, 7, 14, 30, 100], color: "#2F80ED", icon: "api-biru" },
  { id: "hafal-luar-kepala", name: "Hafal Luar Kepala", caption: "Sudah hafal {n} kata. Pintar sekali!",
    ru: "Выучите слова (отметьте копытцем)", metric: "learned", tiers: [10, 50, 100, 300, 1000], color: "#3E9B5F", icon: "wayang" },
  { id: "pengumpul-kata", name: "Pengumpul Kata", caption: "{n} kata sudah masuk keranjang Kancil",
    ru: "Добавьте слова в карточки", metric: "cards", tiers: [10, 50, 100, 300, 1000], color: "#D9962B", icon: "songket" },
  { id: "si-rajin", name: "Si Rajin", caption: "Target harian tercapai {n} kali. Mantap!",
    ru: "Выполните ежедневную цель", metric: "goalDays", tiers: [1, 7, 14, 30, 100], color: "#1BA3B5", icon: "gamelan" },
  { id: "kancil-cerdik", name: "Kancil Cerdik", caption: "{n} jawaban benar — cerdik seperti Kancil!",
    ru: "Правильные ответы в тренировках", metric: "correct", tiers: [50, 200, 500, 2000, 10000], color: "#C0605A", icon: "kancil" },
  { id: "tanpa-cela", name: "Tanpa Cela", caption: "{n} latihan tanpa salah sedikit pun. Sempurna!",
    ru: "Тренировки без единой ошибки (от 5 слов)", metric: "flawless", tiers: [1, 5, 10, 30, 100], color: "#8A6BB0", icon: "kamboja" },
  { id: "jago-imbuhan", name: "Jago Imbuhan", caption: "{n} imbuhan dijawab dengan benar. Jago!",
    ru: "Правильные ответы в режиме «Аффиксы»", metric: "affixCorrect", tiers: [10, 30, 100, 300, 1000], color: "#D94F8C", icon: "komodo" },
  { id: "penjelajah-kamus", name: "Penjelajah Kamus", caption: "Sudah menjelajahi {n} kata di kamus",
    ru: "Откройте разные статьи словаря", metric: "viewed", tiers: [20, 100, 300, 1000, 3000], color: "#9A5A28", icon: "meru" },
  { id: "mata-elang", name: "Mata Elang", caption: "{n} kali mencari kata lewat foto. Tajam!",
    ru: "Ищите слова по фото", metric: "ocr", tiers: [1, 5, 10, 30, 100], color: "#5B7FB5", icon: "mata" },
  { id: "teman-sejati", name: "Teman Sejati", caption: "Punya {n} teman belajar. Makin seru!",
    ru: "Добавьте друзей по коду", metric: "friends", tiers: [1, 2, 3, 5, 10], color: "#E0533D", icon: "teman" },
];

export type AchievementState = AchievementDef & {
  value: number;    // текущий показатель
  reached: number;  // сколько уровней достигнуто
  claimed: number;  // сколько уровней забрано
  claimable: number; // сумма Секти, которую можно забрать
  target: number;   // следующая цель
};

function compute(): AchievementState[] {
  const goal = getDailyGoal();
  const m = { ...metrics(goal.count), ...getCounters() } as Record<Metric, number>;
  return ACHIEVEMENTS.map((a) => {
    const value = m[a.metric] ?? 0;
    const reached = a.tiers.filter((t) => value >= t).length;
    const claimed = Math.min(claimedLevel(a.id), reached);
    const claimable = TIER_REWARDS.slice(claimed, reached).reduce((s, x) => s + x, 0);
    const target = a.tiers[Math.min(reached, a.tiers.length - 1)];
    return { ...a, value, reached, claimed, claimable, target };
  });
}

// ───────── хранилище с подпиской (для бейджа на вкладке) ─────────

const listeners = new Set<() => void>();
let cache: AchievementState[] | null = null;

export function getAchievements(): AchievementState[] {
  if (!cache) cache = compute();
  return cache;
}

/** Пересчитать (после тренировки, новой карточки, метки…). */
export function refreshAchievements() {
  try { cache = compute(); } catch { return; }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useAchievements = () => useSyncExternalStore(subscribe, getAchievements);

export const claimableCount = (list: AchievementState[]) => list.filter((a) => a.claimable > 0).length;

/** Забрать награду за все достигнутые уровни. Возвращает, сколько Секти получено. */
export function claim(id: string): number {
  const a = getAchievements().find((x) => x.id === id);
  if (!a || a.claimable <= 0) return 0;
  addSekti(a.claimable, `achievement:${id}:${a.reached}`);
  setClaimedLevel(id, a.reached);
  const got = a.claimable;
  refreshAchievements();
  return got;
}
