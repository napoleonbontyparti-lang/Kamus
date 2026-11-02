import { openTest } from "expo-sqlite";
import { search, getRuEntry, listChapters, getChapter } from "../src/lib/dict";
const db: any = (openTest as any)(process.argv[2]);
(async () => {
  for (const q of ["брат", "браться", "собака", "kancil", "harimau", "лиса"]) {
    const r = await search(db, q, 8);
    console.log(`\n${q}:`); for (const h of r.slice(0, 6)) console.log(`  [${h.how}] ${h.form.slice(0, 50)} — ${h.gloss.slice(0, 60)}`);
  }
  const ch = await listChapters(db); console.log("\nглав:", ch.length, ch.map((c) => `${c.title_ru}:${c.count}`).join(", "));
  const k = await getChapter(db, ch.find((c) => c.title_ru === "Канчиль")!.id); console.log(k?.proverbs[0].text, "|", k?.chapter.text.length, "абзацев");
  console.log((await getRuEntry(db, 1))?.hw);
})();
