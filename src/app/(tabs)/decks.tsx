import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, KancilSays } from "../../components/ui";
import { createDeck, listDecks, stats, wordsToday, type Deck } from "../../lib/userdb";
import { useDailyGoal } from "../../lib/settings";
import { BlueFlame } from "../../components/BlueFlame";
import { useTheme, soft } from "../../lib/theme";

const DECK_COLORS = ["#2E7D74", "#D9962B", "#C0605A", "#5B7FB5", "#8A6BB0", "#3E9B5F"];

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default function DecksScreen() {
  const t = useTheme();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [st, setSt] = useState({ today: 0, cards: 0, mature: 0, streak: 0, due: 0 });
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [today, setToday] = useState(0);
  const goal = useDailyGoal();

  const refresh = useCallback(() => { setDecks(listDecks()); setSt(stats()); setToday(wordsToday()); }, []);
  useFocusEffect(refresh);

  const create = () => {
    if (!name.trim()) return;
    createDeck(name);
    setName(""); setAdding(false); refresh();
  };

  const goalDone = goal.enabled && today >= goal.count;
  const mood = st.cards === 0 ? "hello" : goalDone ? "yay" : st.due > 0 ? "read" : st.today > 0 ? "yay" : "sleep";
  const title = st.cards === 0 ? "Ayo belajar!" : goalDone ? "Цель на сегодня выполнена!"
    : st.due > 0 ? `${st.due} ${plural(st.due, "слово ждёт", "слова ждут", "слов ждут")} повторения`
    : st.today > 0 ? "Bagus sekali!" : "Всё повторено";
  const text = st.cards === 0
    ? "Открой статью в словаре и нажми на закладку — слово появится здесь."
    : st.due > 0 ? "Повторим, пока я не забыл? Канчили славятся хитростью, а не памятью."
    : st.today > 0 ? `Сегодня ${st.today} ${plural(st.today, "ответ", "ответа", "ответов")}. Можно отдохнуть или потренироваться ещё.`
    : "Новые повторения появятся позже. Можно потренироваться в других режимах.";

  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      data={decks}
      keyExtractor={(d) => String(d.id)}
      ListHeaderComponent={
        <View>
          <KancilSays mood={mood} size={118} title={title} text={text} />
          {goal.enabled ? (
            <View style={[styles.goal, { backgroundColor: t.card }, soft(t)]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: t.text, fontWeight: "800" }}>Цель на сегодня</Text>
                <Text style={{ color: goalDone ? t.green : t.accent, fontWeight: "900" }}>{Math.min(today, goal.count)} / {goal.count}</Text>
              </View>
              <View style={[styles.bar, { backgroundColor: t.faint }]}>
                <View style={{ width: `${Math.min(100, (today / goal.count) * 100)}%`, height: "100%", borderRadius: 5, backgroundColor: goalDone ? t.green : t.accent }} />
              </View>
            </View>
          ) : null}
          <View style={styles.stats}>
            <Stat flame={st.streak > 0} icon="flame" color={t.amber} bg={t.amberSoft} n={st.streak} label={plural(st.streak, "день подряд", "дня подряд", "дней подряд")} />
            <Stat icon="albums" color={t.accent} bg={t.accentSoft} n={st.cards} label="карточек" />
            <Stat icon="leaf" color={t.green} bg={t.greenSoft} n={st.mature} label="выучено" />
          </View>
        </View>
      }
      renderItem={({ item, index }) => {
        const c = DECK_COLORS[index % DECK_COLORS.length];
        return (
          <Pressable
            onPress={() => router.push({ pathname: "/deck/[id]", params: { id: String(item.id) } })}
            style={({ pressed }) => [styles.deck, { backgroundColor: t.card, transform: [{ scale: pressed ? 0.98 : 1 }] }, soft(t)]}
          >
            <View style={[styles.deckIcon, { backgroundColor: c }]}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>{item.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deckName, { color: t.text }]}>{item.name}</Text>
              <Text style={{ color: t.muted, marginTop: 2 }}>{item.total} {plural(item.total, "карточка", "карточки", "карточек")}</Text>
            </View>
            {item.due > 0 ? <Text style={[styles.pill, { backgroundColor: t.redSoft, color: t.red }]}>{item.due}</Text> : null}
            {item.fresh > 0 ? <Text style={[styles.pill, { backgroundColor: t.accentSoft, color: t.accent }]}>+{item.fresh}</Text> : null}
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </Pressable>
        );
      }}
      ListFooterComponent={
        adding ? (
          <View style={[styles.deck, { backgroundColor: t.card }, soft(t)]}>
            <TextInput
              autoFocus value={name} onChangeText={setName} onSubmitEditing={create}
              placeholder="Название колоды" placeholderTextColor={t.muted}
              style={{ flex: 1, fontSize: 17, color: t.text }}
            />
            <Pressable onPress={create} style={[styles.smallBtn, { backgroundColor: t.accent }]}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Создать</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} style={[styles.add, { borderColor: t.accent }]}>
            <Ionicons name="add-circle" size={22} color={t.accent} />
            <Text style={{ color: t.accent, fontWeight: "800" }}> Новая колода</Text>
          </Pressable>
        )
      }
    />
  );
}

function Stat({ n, label, icon, color, bg, flame }: { n: number; label: string; icon: any; color: string; bg: string; flame?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.card }, soft(t)]}>
      <View style={[styles.statIcon, { backgroundColor: flame !== undefined ? "#DCEBFF" : bg }]}>
        {flame !== undefined ? <BlueFlame size={20} lit={flame} /> : <Ionicons name={icon} size={18} color={color} />}
      </View>
      <Text style={{ fontSize: 22, fontWeight: "900", color: t.text, marginTop: 4 }}>{n}</Text>
      <Text style={{ fontSize: 11.5, color: t.muted, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 16 },
  goal: { borderRadius: 18, padding: 14, marginTop: 12 },
  bar: { height: 10, borderRadius: 5, marginTop: 8, overflow: "hidden" },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 20 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  deck: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 22, marginBottom: 12 },
  deckIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  deckName: { fontSize: 18, fontWeight: "800" },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, overflow: "hidden", fontWeight: "800", fontSize: 13 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 22, borderWidth: 2, borderStyle: "dashed" },
});
