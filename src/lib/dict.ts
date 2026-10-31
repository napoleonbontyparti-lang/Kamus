/** Запросы к базе словаря Коригодского (только чтение) с учётом правок пользователя. */
import type { SQLiteDatabase } from "expo-sqlite";
import { normalize, stemCandidates, describe } from "./stemmer";
import { getEntryEdit } from "./userdb";

export type Sense = { w: string; d: string };
export type Entry = { id: number; hw: string; hom: number | null; page: number; senses: Sense[]; edited?: boolean };

export type Hit = {
  entryId: number;
  sense: number;
  form: string;
  hw: string;
  hom: number | null;
  gloss: string;
  /** как найдено: точная форма / начало слова / через корень / по-русски */
  how: "exact" | "prefix" | "stem" | "ru";
  analysis?: string;
};

type FormRow = { form: string; entry_id: number; sense: number; gloss: string; hw: string; hom: number | null };

const FORM_SELECT = `SELECT f.form, f.entry_id, f.sense, f.gloss, e.hw, e.hom
  FROM forms f JOIN entries e ON e.id = f.entry_id`;

const toHit = (r: FormRow, how: Hit["how"], analysis?: string): Hit => ({
  entryId: r.entry_id, sense: r.sense, form: r.form, hw: r.hw, hom: r.hom,
  gloss: r.gloss || "", how, analysis,
});

const CYR = /[а-яё]/i;

export async function search(db: SQLiteDatabase, query: string, limit = 60): Promise<Hit[]> {
  const raw = query.trim();
  if (!raw) return [];
  if (CYR.test(raw)) return searchRussian(db, raw, limit);

  const q = normalize(raw);
  if (!q) return [];
  const flat = q.replace(/[ \-']/g, "");
  const hits: Hit[] = [];
  const seen = new Set<string>();
  const add = (h: Hit) => {
    // одна строка на пару «статья + форма»: значения одной формы видны в статье
    const k = `${h.entryId}:${normalize(h.form)}`;
    if (!seen.has(k)) { seen.add(k); hits.push(h); }
  };

  // 1. точное совпадение формы (корень или производное)
  const exact = await db.getAllAsync<FormRow>(
    `${FORM_SELECT} WHERE f.norm = ? OR f.flat = ? ORDER BY f.sense = 0 DESC, e.hom`, [q, flat]);
  exact.forEach((r) => add(toHit(r, "exact")));

  // 2. разбор аффиксов: ищем корни-кандидаты
  if (q.length >= 4) {
    const cands = stemCandidates(q).filter((c) => c.steps.length > 0).slice(0, 80);
    if (cands.length) {
      const roots = cands.map((c) => c.root);
      const ph = roots.map(() => "?").join(",");
      const rows = await db.getAllAsync<FormRow & { norm: string; flat: string }>(
        `SELECT f.norm, f.flat, f.form, f.entry_id, f.sense, f.gloss, e.hw, e.hom
         FROM forms f JOIN entries e ON e.id = f.entry_id
         WHERE f.norm IN (${ph}) OR f.flat IN (${ph})`, [...roots, ...roots]);
      // сохраняем порядок кандидатов: сначала наименее «обрезанные»
      for (const c of cands) {
        for (const r of rows) {
          if (r.norm === c.root || r.flat === c.root) add(toHit(r, "stem", describe(c)));
        }
      }
    }
  }

  // 3. слова, начинающиеся с введённого (подсказки по мере набора)
  const upper = q + "￿";
  const prefix = await db.getAllAsync<FormRow>(
    `${FORM_SELECT} WHERE f.norm >= ? AND f.norm < ? ORDER BY length(f.norm), f.norm LIMIT ?`,
    [q, upper, limit]);
  prefix.forEach((r) => add(toHit(r, "prefix")));

  return hits.slice(0, limit);
}

/** Обратный поиск: русское слово в толкованиях. */
async function searchRussian(db: SQLiteDatabase, raw: string, limit: number): Promise<Hit[]> {
  const q = raw.toLowerCase().replace(/ё/g, "е");
  const rows = await db.getAllAsync<{ id: number; hw: string; hom: number | null; data: string }>(
    `SELECT id, hw, hom, data FROM entries WHERE replace(ru,'ё','е') LIKE ? LIMIT 400`, [`%${q}%`]);
  const word = new RegExp(`(^|[^а-яё])${escapeRe(q)}`, "i");
  const scored: { h: Hit; score: number }[] = [];
  for (const r of rows) {
    const senses: Sense[] = JSON.parse(r.data);
    senses.forEach((s, i) => {
      const d = s.d.replace(/ё/g, "е");
      const dl = d.toLowerCase();
      const pos = dl.indexOf(q);
      if (pos < 0) return;
      // выше — где слово стоит в начале толкования, а не в примере после ◊
      const main = dl.split("◊")[0];
      let score = pos;
      if (!main.includes(q)) score += 500;
      if (!word.test(dl)) score += 200;
      if (new RegExp(`(^|[\\s,;.\\d])${escapeRe(q)}($|[\\s,;.])`).test(main)) score -= 300;
      scored.push({
        score,
        h: { entryId: r.id, sense: i, form: s.w, hw: r.hw, hom: r.hom, gloss: s.d.split(" ◊ ")[0].slice(0, 140), how: "ru" },
      });
    });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.h);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getEntry(db: SQLiteDatabase, id: number): Promise<Entry | null> {
  const r = await db.getFirstAsync<{ id: number; hw: string; hom: number | null; page: number; data: string }>(
    "SELECT id, hw, hom, page, data FROM entries WHERE id = ?", [id]);
  if (!r) return null;
  const edit = getEntryEdit(id);
  return {
    id: r.id, hw: r.hw, hom: r.hom, page: r.page,
    senses: edit ? edit.senses : JSON.parse(r.data),
    edited: !!edit,
  };
}

/** Соседние статьи — листать словарь как бумажный. */
export async function neighbours(db: SQLiteDatabase, id: number) {
  const prev = await db.getFirstAsync<{ id: number; hw: string }>("SELECT id, hw FROM entries WHERE id = ?", [id - 1]);
  const next = await db.getFirstAsync<{ id: number; hw: string }>("SELECT id, hw FROM entries WHERE id = ?", [id + 1]);
  return { prev, next };
}

export async function randomGlosses(db: SQLiteDatabase, n: number): Promise<{ w: string; d: string }[]> {
  const rows = await db.getAllAsync<{ form: string; gloss: string }>(
    "SELECT form, gloss FROM forms WHERE length(gloss) > 3 AND gloss NOT LIKE 'см.%' ORDER BY random() LIMIT ?", [n]);
  return rows.map((r) => ({ w: r.form, d: r.gloss }));
}

export const KBBI_URL = (word: string) =>
  `https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(normalize(word))}`;
