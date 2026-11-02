/** «Награды»: достижения с уровнями (за них дают Секти) и статистика. */
import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Kancil, Text } from "../../components/ui";
import { Laurel } from "../../components/Laurel";
import { SektiBalance, SektiIcon } from "../../components/Sekti";
import { BlueFlame } from "../../components/BlueFlame";
import { useTheme, soft } from "../../lib/theme";
import { claim, claimableCount, refreshAchievements, useAchievements, type AchievementState } from "../../lib/achievements";
import { metrics } from "../../lib/userdb";
import { getDailyGoal } from "../../lib/settings";
import { buzz } from "../../lib/haptics";

export default function AwardsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const list = useAchievements();
  const [tab, setTab] = useState<"ach" | "stats">("ach");
  const [reward, setReward] = useState<{ name: string; amount: number } | null>(null);
  useFocusEffect(useCallback(() => { refreshAchievements(); }, []));
  const n = claimableCount(list);

  const take = (a: AchievementState) => {
    const got = claim(a.id);
    if (got) { buzz("success"); setReward({ name: a.name, amount: got }); }
  };

  // сначала то, что можно забрать, потом по прогрессу
  const sorted = [...list].sort((a, b) =>
    (b.claimable > 0 ? 1 : 0) - (a.claimable > 0 ? 1 : 0) || b.value / b.target - a.value / a.target);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.top}>
        <View style={[styles.seg, { backgroundColor: t.faint }]}>
          {([["ach", "Достижения"], ["stats", "Статистика"]] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && { backgroundColor: t.card }]}>
              <Text style={{ color: tab === k ? t.text : t.muted, fontWeight: "800", fontSize: 15 }}>{label}</Text>
              {k === "ach" && n > 0 ? <View style={[styles.dot, { backgroundColor: t.red }]}><Text style={styles.dotText}>{n}</Text></View> : null}
            </Pressable>
          ))}
        </View>
        <SektiBalance />
      </View>

      {tab === "ach" ? (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
          {sorted.map((a) => <AchievementCard key={a.id} a={a} onClaim={() => take(a)} />)}
          <Text style={{ color: t.muted, fontSize: 12.5, textAlign: "center", marginTop: 6, lineHeight: 18 }}>
            Секти — волшебные звёздочки канчиля. Копите их: скоро за них откроются новые возможности.
          </Text>
        </ScrollView>
      ) : (
        <Stats />
      )}

      <Modal visible={!!reward} transparent animationType="fade" onRequestClose={() => setReward(null)}>
        <Pressable style={styles.backdrop} onPress={() => setReward(null)}>
          <View style={[styles.rewardBox, { backgroundColor: t.card }]}>
            <Kancil mood="yay" size={150} />
            <Text style={{ color: t.text, fontSize: 24, fontWeight: "900" }}>Hore!</Text>
            <Text style={{ color: t.muted, marginTop: 2 }}>{reward?.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <SektiIcon size={34} />
              <Text style={{ color: t.amber, fontSize: 30, fontWeight: "900", marginLeft: 6 }}>+{reward?.amount}</Text>
            </View>
            <Text style={{ color: t.muted, marginTop: 4 }}>Секти</Text>
            <Pressable onPress={() => setReward(null)} style={[styles.ok, { backgroundColor: t.accent }]}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Terima kasih!</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function AchievementCard({ a, onClaim }: { a: AchievementState; onClaim: () => void }) {
  const t = useTheme();
  const max = a.reached >= a.tiers.length && a.claimable === 0;
  const level = Math.min(a.claimed + 1, a.tiers.length);
  const shown = Math.min(a.value, a.target);
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: a.claimable ? t.amber : "transparent" }, soft(t)]}>
      <View style={{ alignItems: "center", width: 84 }}>
        <Laurel color={a.color} active={a.reached > 0} icon={a.icon} size={76} />
        <View style={[styles.level, { backgroundColor: t.faint }]}>
          <Text style={{ color: a.reached ? a.color : t.muted, fontWeight: "800", fontSize: 12.5 }}>{max ? "MAX" : `Level ${level}`}</Text>
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: "900" }}>{a.name}</Text>
        <Text style={{ color: t.muted, fontSize: 12.5, fontStyle: "italic" }}>«{a.meaning}»</Text>
        <Text style={{ color: t.text, fontSize: 13.5, marginTop: 2 }}>{a.desc}</Text>
        <View style={[styles.bar, { backgroundColor: t.faint }]}>
          <View style={{ width: `${Math.min(100, (shown / a.target) * 100)}%`, height: "100%", backgroundColor: a.color, borderRadius: 4 }} />
        </View>
        <Text style={{ color: a.color, fontWeight: "900", alignSelf: "flex-end", marginTop: 3 }}>{shown}/{a.target}</Text>
        <View style={styles.tiers}>
          {a.rewards.map((r, i) => (
            <View key={i} style={styles.tier}>
              <SektiIcon size={17} dim={i >= a.reached} />
              <Text style={{ color: i < a.claimed ? t.muted : i < a.reached ? t.amber : t.muted, fontWeight: "800", fontSize: 13,
                textDecorationLine: i < a.claimed ? "line-through" : "none" }}> {r}</Text>
            </View>
          ))}
        </View>
        {a.claimable > 0 ? (
          <Pressable onPress={onClaim} style={[styles.get, { backgroundColor: "#F4C152" }]}>
            <Text style={{ color: "#3A2A1E", fontWeight: "900", fontSize: 16 }}>Ambil!  +{a.claimable}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Stats() {
  const t = useTheme();
  const m = metrics(getDailyGoal().count);
  const acc = m.answers ? Math.round((m.correct / m.answers) * 100) : 0;
  const rows: [React.ReactNode, string, string | number][] = [
    [<BlueFlame size={22} />, "Лучшая серия", `${m.bestStreak} дн.`],
    [<Ionicons name="calendar" size={20} color={t.accent} />, "Дней с занятиями", m.activeDays],
    [<Ionicons name="albums" size={20} color={t.amber} />, "Карточек", m.cards],
    [<Ionicons name="school" size={20} color={t.accent} />, "Выучено (копытце)", m.learned],
    [<Ionicons name="chatbubbles" size={20} color={t.red} />, "Ответов всего", m.answers],
    [<Ionicons name="checkmark-circle" size={20} color={t.green} />, "Точность", `${acc}%`],
    [<Ionicons name="barbell" size={20} color="#1BA3B5" />, "Тренировок", m.sessions],
    [<Ionicons name="book" size={20} color={t.hw} />, "Открыто статей", m.viewed],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <View style={styles.grid}>
        {rows.map(([icon, label, v], i) => (
          <View key={i} style={[styles.statCell, { backgroundColor: t.card }, soft(t)]}>
            {icon}
            <Text style={{ color: t.text, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{v}</Text>
            <Text style={{ color: t.muted, fontSize: 12.5, textAlign: "center" }}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  seg: { flex: 1, flexDirection: "row", borderRadius: 22, padding: 4 },
  segBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 18 },
  dot: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: 6, paddingHorizontal: 5 },
  dotText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  card: { flexDirection: "row", borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 2 },
  level: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginTop: 2 },
  bar: { height: 8, borderRadius: 4, marginTop: 8, overflow: "hidden" },
  tiers: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  tier: { flexDirection: "row", alignItems: "center" },
  get: { alignSelf: "flex-end", marginTop: 8, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  rewardBox: { width: "80%", borderRadius: 28, padding: 22, alignItems: "center" },
  ok: { marginTop: 18, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCell: { width: "48.3%", borderRadius: 20, padding: 14, alignItems: "center" },
});
