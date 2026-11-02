/**
 * Пользовательские данные: колоды, карточки, расписание повторений (FSRS),
 * история поиска и правки статей словаря. Хранятся отдельно от словаря,
 * чтобы обновление словаря не стирало карточки.
 */
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { createEmptyCard, fsrs, Rating, State, type Card as FsrsCard, type Grade } from "ts-fsrs";
import type { Sense } from "./dict";

let _db: SQLiteDatabase | null = null;

export function userDb(): SQLiteDatabase {
  if (_db) return _db;
  const db = openDatabaseSync("user.db");
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS decks(
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cards(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      front TEXT NOT NULL,          -- индонезийское слово/выражение
      back TEXT NOT NULL,           -- перевод
      root TEXT,                    -- корень (для тренировки аффиксов)
      entry_id INTEGER, sense INTEGER,
      note TEXT,
      created INTEGER NOT NULL,
      due INTEGER NOT NULL,         -- мс, когда повторять
      state TEXT NOT NULL           -- JSON карточки FSRS
    );
    CREATE INDEX IF NOT EXISTS cards_deck_due ON cards(deck_id, due);
    CREATE TABLE IF NOT EXISTS reviews(
      id INTEGER PRIMARY KEY AUTOINCREMENT, card_id INTEGER NOT NULL, ts INTEGER NOT NULL,
      grade INTEGER NOT NULL, mode TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS history(word TEXT PRIMARY KEY, ts INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS entry_edits(entry_id INTEGER PRIMARY KEY, data TEXT NOT NULL, ts INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(
      id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER, mode TEXT NOT NULL, ts INTEGER NOT NULL,
      total INTEGER NOT NULL, ok INTEGER NOT NULL, bad INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sekti_log(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, amount INTEGER NOT NULL, reason TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS achievements(id TEXT PRIMARY KEY, claimed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS entry_views(entry_id INTEGER PRIMARY KEY, ts INTEGER NOT NULL);
  `);
  // миграция: метка «выучено (1) / не выучено (2)» у карточки
  const cols = db.getAllSync<{ name: string }>("PRAGMA table_info(cards)").map((c) => c.name);
  if (!cols.includes("mark")) db.execSync("ALTER TABLE cards ADD COLUMN mark INTEGER NOT NULL DEFAULT 0");
  db.execSync("CREATE INDEX IF NOT EXISTS cards_created ON cards(created)");
  const n = db.getFirstSync<{ c: number }>("SELECT count(*) c FROM decks");
  if (!n?.c) db.runSync("INSERT INTO decks(name, created) VALUES(?, ?)", ["Мои слова", Date.now()]);
  _db = db;
  return db;
}

// ───────── колоды ─────────

export type Deck = { id: number; name: string; total: number; due: number; fresh: number };

export function listDecks(): Deck[] {
  const now = Date.now();
  return userDb().getAllSync<Deck>(
    `SELECT d.id, d.name,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) total,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id AND c.due <= ? AND json_extract(c.state,'$.state') != 0) due,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id AND json_extract(c.state,'$.state') = 0) fresh
     FROM decks d ORDER BY d.created`, [now]);
}

export function getDeck(id: number): Deck | null {
  return listDecks().find((d) => d.id === id) ?? null;
}

export function createDeck(name: string): number {
  const r = userDb().runSync("INSERT INTO decks(name, created) VALUES(?, ?)", [name.trim() || "Без названия", Date.now()]);
  return Number(r.lastInsertRowId);
}

export function renameDeck(id: number, name: string) {
  userDb().runSync("UPDATE decks SET name = ? WHERE id = ?", [name.trim(), id]);
}

export function deleteDeck(id: number) {
  userDb().runSync("DELETE FROM decks WHERE id = ?", [id]);
}

// ───────── карточки ─────────

export type CardRow = {
  id: number; deck_id: number; front: string; back: string; root: string | null;
  entry_id: number | null; sense: number | null; note: string | null; created: number; due: number; state: string;
  mark: number; // 0 — без метки, 1 — выучено, 2 — не выучено
};

export type NewCard = {
  deckId: number; front: string; back: string; root?: string | null;
  entryId?: number | null; sense?: number | null; note?: string | null;
};

export function addCard(c: NewCard): number {
  const empty = createEmptyCard(new Date());
  const r = userDb().runSync(
    `INSERT INTO cards(deck_id, front, back, root, entry_id, sense, note, created, due, state)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [c.deckId, c.front.trim(), c.back.trim(), c.root ?? null, c.entryId ?? null, c.sense ?? null,
     c.note ?? null, Date.now(), empty.due.getTime(), JSON.stringify(empty)]);
  return Number(r.lastInsertRowId);
}

export function updateCard(id: number, f: { front: string; back: string; note?: string | null; deckId?: number; root?: string | null }) {
  userDb().runSync(
    "UPDATE cards SET front = ?, back = ?, note = ?, root = coalesce(?, root), deck_id = coalesce(?, deck_id) WHERE id = ?",
    [f.front.trim(), f.back.trim(), f.note ?? null, f.root ?? null, f.deckId ?? null, id]);
}

export function deleteCard(id: number) {
  userDb().runSync("DELETE FROM cards WHERE id = ?", [id]);
}

export function getCard(id: number): CardRow | null {
  return userDb().getFirstSync<CardRow>("SELECT * FROM cards WHERE id = ?", [id]);
}

export function cardsInDeck(deckId: number): CardRow[] {
  return userDb().getAllSync<CardRow>("SELECT * FROM cards WHERE deck_id = ? ORDER BY created DESC", [deckId]);
}

/** Есть ли уже карточка на эту форму (чтобы показать «добавлено»). */
export function cardExists(front: string): boolean {
  return !!userDb().getFirstSync("SELECT 1 FROM cards WHERE lower(front) = lower(?)", [front.trim()]);
}

/** Очередь на сегодня: сначала просроченные, потом новые (не больше newLimit). */
export function studyQueue(deckId: number, newLimit = 20): CardRow[] {
  const db = userDb();
  const due = db.getAllSync<CardRow>(
    `SELECT * FROM cards WHERE deck_id = ? AND due <= ? AND json_extract(state,'$.state') != 0 ORDER BY due`,
    [deckId, Date.now()]);
  const fresh = db.getAllSync<CardRow>(
    `SELECT * FROM cards WHERE deck_id = ? AND json_extract(state,'$.state') = 0 ORDER BY created LIMIT ?`,
    [deckId, newLimit]);
  return [...due, ...fresh];
}

// ───────── FSRS ─────────

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true });

function parseState(s: string): FsrsCard {
  const c = JSON.parse(s);
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

export const GRADES: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: "Снова" },
  { grade: Rating.Hard, label: "Трудно" },
  { grade: Rating.Good, label: "Хорошо" },
  { grade: Rating.Easy, label: "Легко" },
];

/** Интервалы для подписи кнопок: «10 мин», «3 дн.» */
export function previewIntervals(card: CardRow): Record<number, string> {
  const now = new Date();
  const p = scheduler.repeat(parseState(card.state), now);
  const out: Record<number, string> = {};
  for (const g of GRADES) out[g.grade] = humanInterval(p[g.grade].card.due.getTime() - now.getTime());
  return out;
}

function humanInterval(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} мин`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} дн.`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} мес.`;
  return `${(d / 365).toFixed(1)} г.`;
}

export function review(card: CardRow, grade: Grade, mode = "flip") {
  const now = new Date();
  const res = scheduler.next(parseState(card.state), now, grade);
  const db = userDb();
  db.runSync("UPDATE cards SET due = ?, state = ? WHERE id = ?",
    [res.card.due.getTime(), JSON.stringify(res.card), card.id]);
  db.runSync("INSERT INTO reviews(card_id, ts, grade, mode) VALUES(?,?,?,?)", [card.id, now.getTime(), grade, mode]);
}

/** Тренировки без расписания (выбор, письмо, аффиксы) тоже пишем в журнал. */
export function logPractice(cardId: number, correct: boolean, mode: string) {
  userDb().runSync("INSERT INTO reviews(card_id, ts, grade, mode) VALUES(?,?,?,?)",
    [cardId, Date.now(), correct ? Rating.Good : Rating.Again, mode]);
}

export function cardStateLabel(card: CardRow): string {
  const s = parseState(card.state);
  if (s.state === State.New) return "новая";
  if (s.state === State.Learning || s.state === State.Relearning) return "изучается";
  const days = Math.round((s.due.getTime() - Date.now()) / 86400000);
  return days <= 0 ? "пора повторить" : `через ${humanInterval(s.due.getTime() - Date.now())}`;
}

export function stats() {
  const db = userDb();
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const today = db.getFirstSync<{ c: number }>("SELECT count(*) c FROM reviews WHERE ts >= ?", [dayStart.getTime()])?.c ?? 0;
  const cards = db.getFirstSync<{ c: number }>("SELECT count(*) c FROM cards")?.c ?? 0;
  const mature = db.getFirstSync<{ c: number }>(
    "SELECT count(*) c FROM cards WHERE json_extract(state,'$.scheduled_days') >= 21")?.c ?? 0;
  // дни подряд с хотя бы одним ответом (сегодня ещё можно успеть — серия не рвётся)
  const days = new Set(db.getAllSync<{ d: string }>(
    "SELECT DISTINCT date(ts / 1000, 'unixepoch', 'localtime') d FROM reviews WHERE ts >= ?",
    [Date.now() - 400 * 86400000]).map((r) => r.d));
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cur = new Date();
  if (!days.has(key(cur))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (days.has(key(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  const due = db.getFirstSync<{ c: number }>(
    "SELECT count(*) c FROM cards WHERE due <= ? AND json_extract(state,'$.state') != 0", [Date.now()])?.c ?? 0;
  return { today, cards, mature, streak, due };
}

// ───────── история ─────────

export function addHistory(word: string) {
  const w = word.trim();
  if (!w) return;
  userDb().runSync("INSERT OR REPLACE INTO history(word, ts) VALUES(?, ?)", [w, Date.now()]);
}

export function recentHistory(n = 30): string[] {
  return userDb().getAllSync<{ word: string }>("SELECT word FROM history ORDER BY ts DESC LIMIT ?", [n]).map((r) => r.word);
}

export function clearHistory() {
  userDb().runSync("DELETE FROM history");
}

// ───────── правки статей ─────────

export function getEntryEdit(entryId: number): { senses: Sense[] } | null {
  const r = userDb().getFirstSync<{ data: string }>("SELECT data FROM entry_edits WHERE entry_id = ?", [entryId]);
  return r ? { senses: JSON.parse(r.data) } : null;
}

export function saveEntryEdit(entryId: number, senses: Sense[]) {
  userDb().runSync("INSERT OR REPLACE INTO entry_edits(entry_id, data, ts) VALUES(?,?,?)",
    [entryId, JSON.stringify(senses), Date.now()]);
}

export function resetEntryEdit(entryId: number) {
  userDb().runSync("DELETE FROM entry_edits WHERE entry_id = ?", [entryId]);
}

export function allEntryEdits(): { entry_id: number; data: string; ts: number }[] {
  return userDb().getAllSync("SELECT entry_id, data, ts FROM entry_edits ORDER BY entry_id");
}

// ───────── экспорт ─────────

/** TSV, который понимает Anki (Файл → Импорт): слово, перевод, корень, заметка. */
export function exportDeckTsv(deckId: number): string {
  const rows = cardsInDeck(deckId);
  const esc = (s: string | null) => (s ?? "").replace(/[\t\n\r]+/g, " ");
  return ["#separator:tab", "#html:false", "#columns:Front\tBack\tRoot\tNote",
    ...rows.map((r) => [r.front, r.back, r.root, r.note].map(esc).join("\t"))].join("\n");
}

// ───────── метки «выучено / не выучено» ─────────

export const MARK_NONE = 0, MARK_LEARNED = 1, MARK_UNLEARNED = 2;

export function setMark(cardIds: number[], mark: number) {
  if (!cardIds.length) return;
  userDb().runSync(`UPDATE cards SET mark = ? WHERE id IN (${cardIds.map(() => "?").join(",")})`, [mark, ...cardIds]);
}

/** Нажатие на копытце: нет метки → выучено → не выучено → нет метки. */
export function cycleMark(card: CardRow): number {
  const next = (card.mark + 1) % 3;
  setMark([card.id], next);
  return next;
}

// ───────── сессии тренировок ─────────

export const MODE_TITLES: Record<string, string> = {
  flip: "Повторение", "choice-ir": "ID → RU", "choice-ri": "RU → ID",
  write: "Написание", affix: "Аффиксы", truefalse: "Верно/неверно",
};

export function logSession(deckId: number | null, mode: string, total: number, ok: number, bad: number) {
  userDb().runSync("INSERT INTO sessions(deck_id, mode, ts, total, ok, bad) VALUES(?,?,?,?,?,?)",
    [deckId, mode, Date.now(), total, ok, bad]);
}

// ───────── календарь ─────────

const dayRange = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const from = new Date(y, m - 1, d).getTime();
  return [from, from + 86400000] as const;
};

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Счётчики по дням месяца: сколько слов добавлено и сколько тренировок пройдено. */
export function monthCounts(year: number, month0: number): { words: Record<string, number>; tests: Record<string, number> } {
  const from = new Date(year, month0, 1).getTime();
  const to = new Date(year, month0 + 1, 1).getTime();
  const db = userDb();
  const words: Record<string, number> = {};
  const tests: Record<string, number> = {};
  for (const r of db.getAllSync<{ created: number }>("SELECT created FROM cards WHERE created >= ? AND created < ?", [from, to]))
    words[dayKey(new Date(r.created))] = (words[dayKey(new Date(r.created))] ?? 0) + 1;
  for (const r of db.getAllSync<{ ts: number }>("SELECT ts FROM sessions WHERE ts >= ? AND ts < ?", [from, to]))
    tests[dayKey(new Date(r.ts))] = (tests[dayKey(new Date(r.ts))] ?? 0) + 1;
  return { words, tests };
}

export function cardsOnDay(day: string): (CardRow & { deck_name: string })[] {
  const [a, b] = dayRange(day);
  return userDb().getAllSync(
    `SELECT c.*, d.name deck_name FROM cards c JOIN decks d ON d.id = c.deck_id
     WHERE c.created >= ? AND c.created < ? ORDER BY c.created DESC`, [a, b]);
}

export type SessionRow = { id: number; deck_id: number | null; deck_name: string | null; mode: string; ts: number; total: number; ok: number; bad: number };

export function sessionsOnDay(day: string): SessionRow[] {
  const [a, b] = dayRange(day);
  return userDb().getAllSync(
    `SELECT s.*, d.name deck_name FROM sessions s LEFT JOIN decks d ON d.id = s.deck_id
     WHERE s.ts >= ? AND s.ts < ? ORDER BY s.ts DESC`, [a, b]);
}

// ───────── резервная копия ─────────

const BACKUP_TABLES = ["decks", "cards", "reviews", "sessions", "history", "entry_edits", "settings", "sekti_log", "achievements", "entry_views"] as const;

export function exportBackup(): string {
  const db = userDb();
  const data: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) data[t] = db.getAllSync(`SELECT * FROM ${t}`);
  return JSON.stringify({ app: "KataCil", format: 1, exported: Date.now(), data });
}

export function importBackup(json: string): { cards: number; decks: number } {
  const parsed = JSON.parse(json);
  if (parsed?.app !== "KataCil" || !parsed.data) throw new Error("Это не резервная копия KataCil");
  const db = userDb();
  db.withTransactionSync(() => {
    for (const t of BACKUP_TABLES) {
      const rows: Record<string, unknown>[] = parsed.data[t] ?? [];
      db.runSync(`DELETE FROM ${t}`);
      for (const row of rows) {
        const keys = Object.keys(row);
        if (!keys.length) continue;
        db.runSync(`INSERT OR REPLACE INTO ${t}(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")})`,
          keys.map((k) => row[k] as any));
      }
    }
  });
  return { cards: parsed.data.cards?.length ?? 0, decks: parsed.data.decks?.length ?? 0 };
}

/** Сколько изменений не попало в последнюю копию (новые карточки + ответы). */
export function unsavedSince(ts: number): number {
  const db = userDb();
  const c = db.getFirstSync<{ n: number }>("SELECT count(*) n FROM cards WHERE created > ?", [ts])?.n ?? 0;
  const r = db.getFirstSync<{ n: number }>("SELECT count(*) n FROM sessions WHERE ts > ?", [ts])?.n ?? 0;
  return c + r;
}

// ───────── ежедневная цель и рейтинг ─────────

/** Сколько разных слов повторено/изучено сегодня (любой режим). */
export function wordsToday(): number {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return userDb().getFirstSync<{ n: number }>(
    "SELECT count(DISTINCT card_id) n FROM reviews WHERE ts >= ?", [start.getTime()])?.n ?? 0;
}

/** Ответов за последние 7 дней — очки для рейтинга среди друзей. */
export function weekScore(): number {
  return userDb().getFirstSync<{ n: number }>(
    "SELECT count(*) n FROM reviews WHERE ts >= ?", [Date.now() - 7 * 86400000])?.n ?? 0;
}

// ───────── Секти (внутренняя валюта) ─────────

export function sektiBalance(): number {
  return userDb().getFirstSync<{ n: number }>("SELECT coalesce(sum(amount), 0) n FROM sekti_log")?.n ?? 0;
}

/** amount > 0 — получено, < 0 — потрачено (пригодится для будущих функций). */
export function addSekti(amount: number, reason: string) {
  userDb().runSync("INSERT INTO sekti_log(ts, amount, reason) VALUES(?,?,?)", [Date.now(), amount, reason]);
}

export function spendSekti(amount: number, reason: string): boolean {
  if (sektiBalance() < amount) return false;
  addSekti(-amount, reason);
  return true;
}

// ───────── данные для достижений ─────────

export function markEntryViewed(entryId: number) {
  userDb().runSync("INSERT OR REPLACE INTO entry_views(entry_id, ts) VALUES(?, ?)", [entryId, Date.now()]);
}

export function claimedLevel(id: string): number {
  return userDb().getFirstSync<{ claimed: number }>("SELECT claimed FROM achievements WHERE id = ?", [id])?.claimed ?? 0;
}

export function setClaimedLevel(id: string, level: number) {
  userDb().runSync("INSERT OR REPLACE INTO achievements(id, claimed) VALUES(?, ?)", [id, level]);
}

/** Все показатели одним проходом. */
export function metrics(goalCount: number) {
  const db = userDb();
  const one = (sql: string, p: any[] = []) => db.getFirstSync<{ n: number }>(sql, p)?.n ?? 0;
  // дни с ответами → самая длинная серия
  const days = db.getAllSync<{ d: string; n: number }>(
    "SELECT date(ts / 1000, 'unixepoch', 'localtime') d, count(DISTINCT card_id) n FROM reviews GROUP BY d ORDER BY d");
  let best = 0, run = 0, prev = 0;
  for (const r of days) {
    const t = Date.parse(r.d + "T00:00:00");
    run = prev && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return {
    cards: one("SELECT count(*) n FROM cards"),
    learned: one("SELECT count(*) n FROM cards WHERE mark = 1"),
    answers: one("SELECT count(*) n FROM reviews"),
    correct: one("SELECT count(*) n FROM reviews WHERE grade >= 2"),
    affixCorrect: one("SELECT count(*) n FROM reviews WHERE mode = 'affix' AND grade >= 3"),
    sessions: one("SELECT count(*) n FROM sessions"),
    flawless: one("SELECT count(*) n FROM sessions WHERE bad = 0 AND total >= 5"),
    goalDays: days.filter((r) => r.n >= goalCount).length,
    bestStreak: best,
    activeDays: days.length,
    viewed: one("SELECT count(*) n FROM entry_views"),
    decks: one("SELECT count(*) n FROM decks"),
  };
}
