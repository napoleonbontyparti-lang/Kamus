/**
 * Достижения (Pencapaian): у каждого несколько уровней, за каждый уровень — Секти.
 * Названия — милые индонезийские, описание — по-русски.
 */
import { useSyncExternalStore } from "react";
import { addSekti, claimedLevel, metrics, setClaimedLevel } from "./userdb";
import { getCounters, getDailyGoal } from "./settings";

export type Metric =
  | "cards" | "learned" | "correct" | "affixCorrect" | "sessions" | "flawless"
  | "goalDays" | "bestStreak" | "viewed" | "ocr" | "friends";

export type AchievementDef = {
  id: string; name: string; meaning: string; desc: string; metric: Metric;
  tiers: number[]; rewards: number[]; color: string; icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "api-biru", name: "Api Biru", meaning: "синий огонь", desc: "Занимайтесь несколько дней подряд",
    metric: "bestStreak", tiers: [3, 7, 30, 100], rewards: [10, 30, 100, 250], color: "#2F80ED", icon: "flame" },
  { id: "si-rajin", name: "Si Rajin", meaning: "старательный", desc: "Выполняйте ежедневную цель",
    metric: "goalDays", tiers: [1, 7, 30, 100], rewards: [5, 25, 80, 200], color: "#3E9B5F", icon: "flag" },
  { id: "pengumpul-kata", name: "Pengumpul Kata", meaning: "собиратель слов", desc: "Добавляйте слова в карточки",
    metric: "cards", tiers: [10, 50, 200, 500, 1000], rewards: [5, 15, 40, 80, 150], color: "#D9962B", icon: "albums" },
  { id: "kancil-cerdik", name: "Kancil Cerdik", meaning: "хитрый канчиль", desc: "Отвечайте правильно в тренировках",
    metric: "correct", tiers: [50, 500, 2000, 10000], rewards: [5, 25, 80, 200], color: "#C0605A", icon: "bulb" },
  { id: "tanpa-cela", name: "Tanpa Cela", meaning: "без изъяна", desc: "Тренировки без единой ошибки (от 5 слов)",
    metric: "flawless", tiers: [1, 10, 50], rewards: [5, 30, 100], color: "#8A6BB0", icon: "checkmark-done" },
  { id: "hafal-luar-kepala", name: "Hafal Luar Kepala", meaning: "знаю назубок", desc: "Отмечайте слова выученными копытцем",
    metric: "learned", tiers: [10, 50, 200, 500], rewards: [5, 20, 60, 120], color: "#2E7D74", icon: "school" },
  { id: "jago-imbuhan", name: "Jago Imbuhan", meaning: "мастер аффиксов", desc: "Правильные ответы в режиме «Аффиксы»",
    metric: "affixCorrect", tiers: [10, 50, 200], rewards: [10, 30, 80], color: "#D94F8C", icon: "git-branch" },
  { id: "latihan-terus", name: "Latihan Terus", meaning: "тренируйся дальше", desc: "Проходите тренировки до конца",
    metric: "sessions", tiers: [1, 10, 50, 200], rewards: [3, 15, 50, 120], color: "#1BA3B5", icon: "barbell" },
  { id: "penjelajah-kamus", name: "Penjelajah Kamus", meaning: "исследователь словаря", desc: "Открывайте разные статьи словаря",
    metric: "viewed", tiers: [20, 100, 500, 2000], rewards: [5, 15, 40, 100], color: "#9A5A28", icon: "book" },
  { id: "mata-elang", name: "Mata Elang", meaning: "орлиный глаз", desc: "Ищите слова по фото",
    metric: "ocr", tiers: [1, 10, 50], rewards: [5, 15, 40], color: "#5B7FB5", icon: "camera" },
  { id: "teman-sejati", name: "Teman Sejati", meaning: "настоящий друг", desc: "Добавляйте друзей по коду",
    metric: "friends", tiers: [1, 3, 10], rewards: [10, 25, 60], color: "#E0533D", icon: "people" },
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
    const claimable = a.rewards.slice(claimed, reached).reduce((s, x) => s + x, 0);
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
