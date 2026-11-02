/**
 * Календарь (как в VoCat): по дням видно, какие слова добавлены и какие тренировки пройдены.
 * Долгое нажатие на день — меню с метками «выучено / не выучено» для слов этого дня.
 */
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { Kancil, Text } from "../../components/ui";
import { Word } from "../../components/Word";
import { Hoof, HoofButton } from "../../components/Hoof";
import { Sheet } from "../../components/Sheet";
import {
  MARK_LEARNED, MARK_NONE, MARK_UNLEARNED, MODE_TITLES, cardsOnDay, cycleMark, dayKey, monthCounts,
  sessionsOnDay, setMark, type CardRow, type SessionRow,
} from "../../lib/userdb";
import { useTheme, soft } from "../../lib/theme";

const WEEK = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type DayCard = CardRow & { deck_name: string };

const hhmm = (ts: number) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export default function CalendarScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const today = dayKey(new Date());
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [tab, setTab] = useState<"words" | "tests">("words");
  const [day, setDay] = useState(today);
  const [counts, setCounts] = useState<{ words: Record<string, number>; tests: Record<string, number> }>({ words: {}, tests: {} });
  const [cards, setCards] = useState<DayCard[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [menuDay, setMenuDay] = useState<string | null>(null);

  const reload = useCallback(() => {
    setCounts(monthCounts(ym.y, ym.m));
    setCards(cardsOnDay(day));
    setSessions(sessionsOnDay(day));
  }, [ym, day]);
  useFocusEffect(reload);

  // сетка месяца, неделя с понедельника
  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1);
    const shift = (first.getDay() + 6) % 7;
    const days = new Date(ym.y, ym.m + 1, 0).getDate();
    const out: (string | null)[] = Array(shift).fill(null);
    for (let d = 1; d <= days; d++) out.push(dayKey(new Date(ym.y, ym.m, d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [ym]);

  const move = (delta: number) => setYm(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const dayLabel = (k: string) => { const [, m, d] = k.split("-").map(Number); return `${d} ${MONTHS_GEN[m - 1]}`; };
  const map = tab === "words" ? counts.words : counts.tests;

  const markDay = (k: string, mark: number) => { setMark(cardsOnDay(k).map((c) => c.id), mark); reload(); };

  const header = (
    <View>
      <View style={styles.top}>
        <Pressable hitSlop={12} onPress={() => move(-1)}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
        <Text style={[styles.month, { color: t.text }]}>{MONTHS[ym.m]} {ym.y}</Text>
        <Pressable hitSlop={12} onPress={() => move(1)}><Ionicons name="chevron-forward" size={24} color={t.text} /></Pressable>
        <View style={{ flex: 1 }} />
        <View style={[styles.seg, { backgroundColor: t.faint }]}>
          {(["words", "tests"] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && { backgroundColor: t.card }]}>
              <Text style={{ color: tab === k ? t.accent : t.muted, fontWeight: "800" }}>{k === "words" ? "Слова" : "Тесты"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.week}>
        {WEEK.map((w, i) => (
          <Text key={w} style={[styles.weekDay, { color: i >= 5 ? t.amber : t.muted }]}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((k, i) => {
          if (!k) return <View key={i} style={styles.cell} />;
          const n = map[k] ?? 0;
          const sel = k === day;
          const isToday = k === today;
          return (
            <Pressable key={k} style={styles.cell} onPress={() => setDay(k)}
              onLongPress={() => { setDay(k); setMenuDay(k); }} delayLongPress={350}>
              <View style={[styles.dayBox, sel && { borderColor: t.accent, borderWidth: 2 }, isToday && !sel && { backgroundColor: t.accentSoft }]}>
                <Text style={{ fontSize: 17, color: i % 7 >= 5 ? t.amber : t.text, fontWeight: isToday || sel ? "800" : "500" }}>
                  {Number(k.slice(8))}
                </Text>
              </View>
              {n > 0 ? (
                <Text style={[styles.badge, { color: tab === "words" ? t.accent : t.amber, borderColor: tab === "words" ? t.accent : t.amber, backgroundColor: t.bg }]}>
                  {n}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.toolbar, { borderBottomColor: t.faint }]}>
        <Kancil mood={(tab === "words" ? cards.length : sessions.length) ? "hello" : "sleep"} size={58} style={{ marginBottom: -6 }} />
        <Text style={[styles.dayTitle, { color: t.text }]}>{dayLabel(day)}</Text>
        {tab === "words" && cards.length ? (
          <Pressable hitSlop={10} onPress={() => router.push({ pathname: "/study/[deckId]", params: { deckId: "0", mode: "choice-ir", day } })}>
            <Ionicons name="play-circle-outline" size={26} color={t.accent} />
          </Pressable>
        ) : null}
        <Pressable hitSlop={10} onPress={() => setMenuDay(day)} style={{ marginLeft: 14 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={t.text} />
        </Pressable>
      </View>
    </View>
  );

  const empty = (
    <View style={{ alignItems: "center", padding: 30 }}>
      <Text style={{ color: t.muted, textAlign: "center", lineHeight: 21 }}>
        {tab === "words" ? "В этот день новых слов не было." : "В этот день тренировок не было."}
        {"\n"}Долгое нажатие на день открывает меню.
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {tab === "words" ? (
        <FlatList
          data={cards}
          keyExtractor={(c) => String(c.id)}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => <WordRow item={item} onChange={reload} />}
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => <SessionRowView s={item} />}
        />
      )}

      <Sheet
        visible={!!menuDay}
        title={menuDay ? dayLabel(menuDay) : ""}
        onClose={() => setMenuDay(null)}
        items={menuDay ? [
          { label: "Отметить слова как выученные", color: t.accent, icon: <Hoof size={20} color={t.accent} filled />, onPress: () => markDay(menuDay, MARK_LEARNED) },
          { label: "Отметить слова как невыученные", color: t.amber, icon: <Hoof size={20} color={t.amber} filled />, onPress: () => markDay(menuDay, MARK_UNLEARNED) },
          { label: "Снять метки", icon: <Hoof size={20} color={t.muted} />, onPress: () => markDay(menuDay, MARK_NONE) },
          { label: "Потренировать слова дня", icon: <Ionicons name="play-circle-outline" size={20} color={t.text} />,
            onPress: () => router.push({ pathname: "/study/[deckId]", params: { deckId: "0", mode: "choice-ir", day: menuDay } }) },
        ] : []}
      />
    </View>
  );
}

function WordRow({ item, onChange }: { item: DayCard; onChange: () => void }) {
  const t = useTheme();
  const [mark, setMarkState] = useState(item.mark);
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <Hoof size={16} color={t.accent} />
        <Text style={[styles.time, { color: t.accent }]}>{hhmm(item.created)}</Text>
        <View style={[styles.line, { backgroundColor: t.faint }]} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={{ color: t.muted, flex: 1 }} numberOfLines={1}>{item.deck_name}</Text>
          <HoofButton mark={mark} onPress={() => { setMarkState(cycleMark({ ...item, mark })); onChange(); }} />
          <Pressable hitSlop={10} style={{ marginLeft: 18 }} onPress={() => { Speech.stop(); Speech.speak(item.front, { language: "id-ID", rate: 0.9 }); }}>
            <Ionicons name="volume-medium-outline" size={22} color={t.text} />
          </Pressable>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/card/[id]", params: { id: String(item.id) } })}>
          <Word form={item.front} root={item.root} style={[styles.front, { color: t.hw }]} />
          <View style={[styles.backBox, { borderColor: t.faint, backgroundColor: t.card }, soft(t)]}>
            <Text style={{ color: t.text, fontSize: 15.5, lineHeight: 21 }}>{item.back}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function SessionRowView({ s }: { s: SessionRow }) {
  const t = useTheme();
  const share = s.total ? Math.round((s.ok / Math.max(1, s.ok + s.bad)) * 100) : 0;
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <Ionicons name="ribbon-outline" size={16} color={t.amber} />
        <Text style={[styles.time, { color: t.amber }]}>{hhmm(s.ts)}</Text>
        <View style={[styles.line, { backgroundColor: t.faint }]} />
      </View>
      <View style={[styles.sessionBox, { backgroundColor: t.card }, soft(t)]}>
        <Text style={{ color: t.text, fontSize: 17, fontWeight: "800" }}>{MODE_TITLES[s.mode] ?? s.mode}</Text>
        <Text style={{ color: t.muted, marginTop: 2 }}>{s.deck_name ?? "Слова дня"} · {s.total} карточек</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Text style={[styles.chip, { color: t.green, backgroundColor: t.greenSoft }]}>✓ {s.ok}</Text>
          <Text style={[styles.chip, { color: t.red, backgroundColor: t.redSoft }]}>✗ {s.bad}</Text>
          <Text style={[styles.chip, { color: t.accent, backgroundColor: t.accentSoft }]}>{share}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  month: { fontSize: 20, fontWeight: "800", minWidth: 120, textAlign: "center" },
  seg: { flexDirection: "row", borderRadius: 14, padding: 3 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 11 },
  week: { flexDirection: "row", paddingHorizontal: 8, marginTop: 6 },
  weekDay: { flex: 1, textAlign: "center", fontWeight: "700", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 },
  cell: { width: `${100 / 7}%`, height: 50, alignItems: "center", justifyContent: "center" },
  dayBox: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", borderColor: "transparent", borderWidth: 2 },
  badge: { position: "absolute", right: 3, bottom: 1, fontSize: 10.5, fontWeight: "800", borderWidth: 1, borderRadius: 7, paddingHorizontal: 4, overflow: "hidden" },
  toolbar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 14, marginTop: 6, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  dayTitle: { flex: 1, fontSize: 16, fontWeight: "800", marginLeft: 6, marginBottom: 8 },
  row: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 14 },
  timeline: { width: 46, alignItems: "center" },
  time: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  line: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  rowHead: { flexDirection: "row", alignItems: "center" },
  front: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  backBox: { marginTop: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, alignSelf: "flex-start", maxWidth: "100%" },
  sessionBox: { flex: 1, borderRadius: 18, padding: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: "hidden", fontWeight: "800" },
});
