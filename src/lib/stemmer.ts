/**
 * Стеммер индонезийского языка для поиска по словарю, построенному по гнёздам.
 *
 * Вместо выбора одного «правильного» корня (как в алгоритме Nazief–Adriani) мы
 * генерируем ВСЕ правдоподобные кандидаты — снятие частиц, притяжательных
 * местоимений, суффиксов, приставок (с восстановлением начальной согласной
 * после назализации me-/pe-) и редупликации. Затем приложение проверяет, какие
 * кандидаты есть в словаре, и показывает самые длинные (наименее «обрезанные»).
 */

export type Candidate = { root: string; steps: string[] };

const VOWELS = /^[aeiou]/;
const PARTICLES = ["lah", "kah", "tah", "pun"];
const POSSESSIVES = ["nya", "ku", "mu"];
const SUFFIXES = ["kan", "an", "i"];

export function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9\-' ]/g, "")
    .trim();
}

/** Варианты слова со снятыми окончаниями: частица → притяжательное → словообразовательный суффикс. */
function suffixVariants(w: string): Candidate[] {
  const out: Candidate[] = [{ root: w, steps: [] }];
  const layer = (src: Candidate[], list: string[]) => {
    const res: Candidate[] = [];
    for (const c of src) {
      for (const s of list) {
        if (c.root.length - s.length >= 3 && c.root.endsWith(s)) {
          res.push({ root: c.root.slice(0, -s.length), steps: [...c.steps, "-" + s] });
        }
      }
    }
    return res;
  };
  const p = layer(out, PARTICLES);
  const pp = layer([...out, ...p], POSSESSIVES);
  const sfx = layer([...out, ...p, ...pp], SUFFIXES);
  return [...out, ...p, ...pp, ...sfx];
}

/** Снятие одной приставки с восстановлением начальной согласной корня. */
function stripPrefixOnce(w: string): Candidate[] {
  const res: Candidate[] = [];
  const add = (root: string, step: string) => {
    if (root.length >= 2) res.push({ root, steps: [step] });
  };

  // простые приставки
  // отрицание в производных: ketidakadilan, ketidakmampuan
  if (w.startsWith("tidak") && w.length > 7) add(w.slice(5), "tidak-");
  for (const p of ["di", "ke", "se", "ku", "kau"]) {
    if (w.startsWith(p)) add(w.slice(p.length), p + "-");
  }
  // ber-/be-/bel-, ter-/te-, per-/pe-
  if (w.startsWith("ber")) add(w.slice(3), "ber-");
  if (w.startsWith("bel")) add(w.slice(3), "bel-"); // belajar
  if (w.startsWith("be")) add(w.slice(2), "be-"); // bekerja, beternak
  if (w.startsWith("ter")) add(w.slice(3), "ter-");
  if (w.startsWith("te")) add(w.slice(2), "te-");
  if (w.startsWith("per")) add(w.slice(3), "per-");

  // me-/pe- с назализацией
  for (const base of ["me", "pe"]) {
    if (!w.startsWith(base)) continue;
    const r = w.slice(base.length);
    const tag = base + "N-";
    if (r.startsWith("nge") && r.length > 4) add(r.slice(3), base + "nge-"); // mengecat → cat
    if (r.startsWith("ng")) {
      const x = r.slice(2);
      add(x, tag); // menggali → gali, menghapus → hapus, mengajar → ajar
      if (VOWELS.test(x)) add("k" + x, tag); // mengirim → kirim
    } else if (r.startsWith("ny")) {
      const x = r.slice(2);
      add("s" + x, tag); // menyapu → sapu
      add("c" + x, tag); // разг. nyuci ← cuci
      add(r, tag); // menyanyi → nyanyi
    } else if (r.startsWith("m")) {
      const x = r.slice(1);
      if (/^[bfvp]/.test(x)) add(x, tag); // membaca → baca
      if (VOWELS.test(x)) {
        add("p" + x, tag); // memukul → pukul
        add("m" + x, tag); // memakan → makan (me- + makan)
      }
      add(r, tag); // memasak? (me- + masak)
    } else if (r.startsWith("n")) {
      const x = r.slice(1);
      if (/^[cdjtsz]/.test(x)) add(x, tag); // mencari → cari, mendengar → dengar
      if (VOWELS.test(x)) {
        add("t" + x, tag); // menulis → tulis
        add("n" + x, tag); // menanti → nanti
      }
      add(r, tag);
    } else {
      // me-/pe- перед l, r, w, y
      add(r, base + "-");
    }
    if (base === "pe" && r.startsWith("r")) add(r.slice(1), "per-");
    if (base === "pe" && r.startsWith("l")) add(r.slice(1), "pel-"); // pelajar
  }
  return res;
}

/** Все кандидаты корней (включая само слово). Порядок: от наименее обрезанных к более. */
export function stemCandidates(input: string): Candidate[] {
  const w = normalize(input);
  if (!w) return [];
  const seen = new Map<string, Candidate>();
  const push = (c: Candidate) => {
    if (c.root.length < 2) return;
    const prev = seen.get(c.root);
    if (!prev || prev.steps.length > c.steps.length) seen.set(c.root, c);
  };

  const process = (word: string, extra: string[]) => {
    for (const s of suffixVariants(word)) {
      const base = { root: s.root, steps: [...extra, ...s.steps] };
      push(base);
      // до трёх слоёв приставок: memper-, diper-, keber-…
      let layer: Candidate[] = [base];
      for (let depth = 0; depth < 3; depth++) {
        const next: Candidate[] = [];
        for (const c of layer) {
          for (const p of stripPrefixOnce(c.root)) {
            const cand = { root: p.root, steps: [...p.steps, ...c.steps] };
            push(cand);
            next.push(cand);
            // конфикс + суффиксы, снятые после приставки (ke-…-an и т. п.)
            for (const s2 of suffixVariants(p.root).slice(1)) {
              const c2 = { root: s2.root, steps: [...cand.steps, ...s2.steps] };
              push(c2);
              next.push(c2);
            }
          }
        }
        layer = next;
      }
    }
  };

  process(w, []);

  // редупликация: buku-buku, sayur-mayur, berlari-lari, pukul-memukul
  if (w.includes("-")) {
    const parts = w.split("-").filter(Boolean);
    for (const part of parts) process(part, ["редупл."]);
  }
  // составные: «tanggung jawab» → ищем и первое слово
  if (w.includes(" ")) {
    process(w.split(" ")[0], ["1-е слово"]);
  }

  return [...seen.values()].sort(
    (a, b) => a.steps.length - b.steps.length || b.root.length - a.root.length,
  );
}

/** Описание разбора для показа пользователю: «di- + kirim + -kan». */
export function describe(c: Candidate): string {
  const pre = c.steps.filter((s) => s.endsWith("-")).reverse(); // внешние приставки — первыми
  const suf = c.steps.filter((s) => s.startsWith("-")).reverse(); // ближние к корню — первыми
  return [...pre, c.root.toUpperCase(), ...suf].join(" + ");
}
