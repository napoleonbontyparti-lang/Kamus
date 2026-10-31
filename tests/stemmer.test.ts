import { stemCandidates, describe } from "../src/lib/stemmer";
import fs from "node:fs";
const forms = new Set<string>(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
const cases: [string, string][] = [
  ["diadukan", "adu"], ["membaca", "baca"], ["memukul", "pukul"], ["menulis", "tulis"],
  ["mengirimkan", "kirim"], ["menyapu", "sapu"], ["mempertanggungjawabkan", "tanggung jawab"],
  ["bukunya", "buku"], ["rumahnya", "rumah"], ["keadilan", "adil"], ["pengadilannya", "pengadilan"],
  ["diberikan", "beri"], ["berlari-lari", "lari"], ["buku-buku", "buku"], ["mencarikan", "cari"],
  ["ketidakadilan", "adil"], ["menggali", "gali"], ["mengecat", "cat"], ["pelajaran", "pelajaran"],
  ["dimakannya", "makan"], ["kesaksiannya", "kesaksian"], ["terbunuh", "bunuh"], ["sepengetahuan", "tahu"],
  ["memperbaiki", "baik"], ["didengarkan", "dengar"], ["bekerja", "kerja"], ["belajarlah", "belajar"],
];
let ok = 0;
for (const [w, expect] of cases) {
  const found = stemCandidates(w).filter((c) => forms.has(c.root));
  const hit = found.find((c) => c.root === expect);
  const top = found.slice(0, 3).map(describe).join(" | ");
  if (hit) ok++;
  console.log(hit ? "OK  " : "MISS", w.padEnd(24), "→", top);
}
console.log(`${ok}/${cases.length}`);
