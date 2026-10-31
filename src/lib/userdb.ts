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
  `);
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
