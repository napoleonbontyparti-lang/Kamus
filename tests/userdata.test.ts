import {
  addCard, listDecks, cycleMark, setMark, monthCounts, cardsOnDay, logSession, sessionsOnDay, dayKey,
  exportBackup, importBackup, unsavedSince, cardsInDeck, userDb,
} from "../src/lib/userdb";
import { setThemeMode, getThemeMode, setAffixColors, getAffixColors, reloadSettings } from "../src/lib/settings";
import { segment } from "../src/lib/affix";
const assert = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok ", m); };

const deck = listDecks()[0];
const a = addCard({ deckId: deck.id, front: "menandatangani", back: "подписывать", root: "tanda" });
const b = addCard({ deckId: deck.id, front: "pengadilan", back: "суд", root: "adil" });
const today = dayKey(new Date());
assert(cardsOnDay(today).length === 2, "2 слова сегодня в календаре");
const d = new Date();
assert(monthCounts(d.getFullYear(), d.getMonth()).words[today] === 2, "счётчик месяца по словам");
let c = cardsInDeck(deck.id).find((x) => x.id === a)!;
assert(c.mark === 0, "метки нет по умолчанию");
assert(cycleMark(c) === 1, "копытце: → выучено");
c = cardsInDeck(deck.id).find((x) => x.id === a)!;
assert(cycleMark(c) === 2 && cycleMark({ ...c, mark: 2 }) === 0, "копытце: → не выучено → без метки");
setMark([a, b], 1);
assert(cardsOnDay(today).every((x) => x.mark === 1), "метка для всех слов дня");
logSession(deck.id, "choice-ir", 2, 2, 0);
logSession(null, "write", 2, 1, 1);
assert(sessionsOnDay(today).length === 2 && monthCounts(d.getFullYear(), d.getMonth()).tests[today] === 2, "тесты в календаре");
setThemeMode("dark"); setAffixColors({ enabled: true });
assert(unsavedSince(0) === 4, "несохранённые изменения считаются");
const json = exportBackup();
// стираем и восстанавливаем
userDb().execSync("DELETE FROM cards; DELETE FROM sessions; DELETE FROM settings;");
reloadSettings();
assert(getThemeMode() === "light" && cardsOnDay(today).length === 0, "данные стёрты");
const r = importBackup(json);
reloadSettings();
assert(r.cards === 2 && cardsOnDay(today).length === 2 && sessionsOnDay(today).length === 2, "копия восстановлена");
assert(getThemeMode() === "dark" && getAffixColors().enabled, "настройки восстановлены");
assert(cardsOnDay(today).every((x) => x.mark === 1), "метки восстановлены");
let bad = false; try { importBackup('{"foo":1}'); } catch { bad = true; }
assert(bad, "чужой файл отклоняется");
console.log(segment("menandatangani", "tanda").map((s) => s.k + ":" + s.t).join(" "));

// профиль, цель, вибрация
import { getProfile, setProfile, getDailyGoal, setDailyGoal, getVibration } from "../src/lib/settings";
import { wordsToday, weekScore, review, studyQueue } from "../src/lib/userdb";
const p = getProfile();
assert(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(p.code) && /^([A-Z2-9]{4}-){3}[A-Z2-9]{4}$/.test(p.key), `код ${p.code} и ключ созданы`);
assert(getProfile().code === p.code, "код постоянный");
setProfile({ nick: "Veronika" });
assert(getProfile().nick === "Veronika" && getProfile().code === p.code, "ник меняется, код остаётся");
assert(getVibration() === false, "вибрация выключена по умолчанию");
assert(getDailyGoal().enabled === false && getDailyGoal().count === 20, "цель выключена, 20 слов по умолчанию");
setDailyGoal({ enabled: true, count: 10 });
const before = wordsToday();
const q = studyQueue(listDecks()[0].id);
review(q[0], 3); review(q[0], 3);
assert(wordsToday() === before + 1, "в цель считаются разные слова, а не ответы");
assert(weekScore() >= 2, "очки рейтинга за неделю");
