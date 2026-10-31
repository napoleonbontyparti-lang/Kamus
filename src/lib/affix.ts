/**
 * Разбивка словоформы на приставку / корень / суффикс / частицу —
 * для раскраски, как тоны в Pleco: mem|PUKUL|kan|nya.
 */
import { normalize } from "./stemmer";

export type SegKind = "pre" | "root" | "suf" | "clitic" | "plain";
export type Seg = { t: string; k: SegKind };

const PREF = /^(?:(?:me|pe)(?:ng|ny|n|m)?e?|ber|be|bel|ter|te|per|pel|di|ke|se|ku|kau|ketidak|tidak|memper|diper|mem|pem)*$/;
const NASAL = /(?:m|n|ng|ny)$/;
const TAIL = /^(kan|an|i)?(nya|ku|mu)?(lah|kah|tah|pun)?$/;
const COMPOUND = /^([a-z]{3,}?)(?:kan|an|i)?(?:nya|ku|mu)?(?:lah|kah|tah|pun)?$/;

function splitPart(part: string, roots: string[]): Seg[] | null {
  const low = part.toLowerCase();
  for (const r of roots) {
    if (r.length < 2) continue;
    // корень целиком
    let i = low.indexOf(r);
    let len = r.length;
    let ok = i >= 0 && PREF.test(low.slice(0, i));
    // назализация: me+mukul ← pukul, или остаток в удвоении: memukul-MUKUL
    if (!ok && r.length > 3) {
      const j = low.indexOf(r.slice(1));
      const pre = j >= 0 ? low.slice(0, j) : "";
      if (j > 0 && NASAL.test(pre) && (PREF.test(pre) || /^(?:m|n|ng|ny)$/.test(pre))) {
        i = j; len = r.length - 1; ok = true;
      }
    }
    if (!ok) continue;
    let rest = low.slice(i + len);
    let m = TAIL.exec(rest);
    // составной корень: menanda|TANGAN|i ← tanda tangan
    let compound = 0;
    if (!m) {
      const c = COMPOUND.exec(rest);
      if (!c) continue;
      compound = c[1].length;
      rest = rest.slice(compound);
      m = TAIL.exec(rest);
      if (!m) continue;
    }
    const segs: Seg[] = [];
    if (i > 0) segs.push({ t: part.slice(0, i), k: "pre" });
    segs.push({ t: part.slice(i, i + len + compound), k: "root" });
    let p = i + len + compound;
    if (m[1]) { segs.push({ t: part.slice(p, p + m[1].length), k: "suf" }); p += m[1].length; }
    if (m[2]) { segs.push({ t: part.slice(p, p + m[2].length), k: "clitic" }); p += m[2].length; }
    if (m[3]) { segs.push({ t: part.slice(p, p + m[3].length), k: "clitic" }); }
    return segs;
  }
  return null;
}

/** form — словоформа, root — заглавное слово гнезда (может быть составным: «tanda tangan»). */
export function segment(form: string, root: string | null | undefined): Seg[] {
  if (!root) return [{ t: form, k: "plain" }];
  const nr = normalize(root);
  const roots = [nr.replace(/[ \-']/g, ""), nr.split(/[ \-]/)[0]].filter((x, i, a) => x && a.indexOf(x) === i);
  const out: Seg[] = [];
  const parts = form.split(/([\- \[\]\(\)])/);
  let any = false;
  for (const part of parts) {
    if (!part || /^[\- \[\]\(\)]$/.test(part)) { if (part) out.push({ t: part, k: "plain" }); continue; }
    const s = splitPart(part, roots);
    if (s) { out.push(...s); any = true; } else out.push({ t: part, k: "plain" });
  }
  return any ? out : [{ t: form, k: "plain" }];
}
