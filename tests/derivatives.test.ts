import { openTest } from "expo-sqlite";
import { search } from "../src/lib/dict";
const db: any = (openTest as any)(process.argv[2]);
(async () => {
  for (const q of ["tanda", "adil", "pukul", "ajar"]) {
    const t0 = performance.now();
    const r = await search(db, q, 10);
    const root = r.find((h) => h.children);
    console.log(`\n${q} (${(performance.now() - t0).toFixed(0)} мс): ${root?.children?.length} производных`);
    console.log("  " + root?.children?.map((c) => c.form + (c.hw.toLowerCase() !== q ? `[${c.hw}]` : "")).join(", "));
  }
})();
