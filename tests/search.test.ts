import { openTest, openDatabaseSync } from "expo-sqlite";
import { search, getEntry } from "../src/lib/dict";
import { addCard, studyQueue, review, previewIntervals, listDecks, exportDeckTsv } from "../src/lib/userdb";
import { Rating } from "ts-fsrs";
const db: any = (openTest as any)(process.argv[2]);
(async () => {
  for (const q of ["rumahnya", "dipertanggungjawabkan", "mengadukan", "ketidakadilan", "memukul", "pengadilan", "суд", "отравление", "makan", "buku-buku", "tanggung jawab", "zzqx"]) {
    const t0 = performance.now();
    const r = await search(db, q, 5);
    const ms = (performance.now() - t0).toFixed(0);
    console.log(`\n${q} (${ms} мс):`);
    for (const h of r.slice(0, 4)) console.log(`  [${h.how}] ${h.form} ← ${h.hw}${h.hom ? " " + h.hom : ""} ${h.analysis ? "{" + h.analysis + "}" : ""} — ${h.gloss.slice(0, 60)}`);
  }
  const e = await getEntry(db, (await search(db, "adu", 1))[0].entryId);
  console.log("\nentry:", e?.hw, e?.senses.length, "senses");
  // карточки и FSRS
  const deck = listDecks()[0];
  const id = addCard({ deckId: deck.id, front: "mengadukan", back: "жаловаться", root: "adu" });
  const q = studyQueue(deck.id);
  console.log("queue", q.length, "intervals", previewIntervals(q[0]));
  review(q[0], Rating.Good);
  console.log("deck after review", listDecks()[0]);
  console.log(exportDeckTsv(deck.id));
})();
