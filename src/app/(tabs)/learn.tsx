/** «Учёба»: уроки (скоро), пословицы о животных, слово дня, ежедневная цель. */
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { KancilSays, Text } from "../../components/ui";
import { FadeInUp, PressScale } from "../../components/anim";
import { BlueFlame } from "../../components/BlueFlame";
import { useTheme, soft } from "../../lib/theme";
import { useDailyGoal } from "../../lib/settings";
import { stats, wordsToday } from "../../lib/userdb";

type WordOfDay = { entry_id: number; sense: number; form: string; gloss: string; hw: string };

export default function LearnScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const goal = useDailyGoal();
  const [word, setWord] = useState<WordOfDay | null>(null);
  const [today, setToday] = useState(0);
  const [streak, setStreak] = useState(0);

  useFocusEffect(useCallback(() => {
    setToday(wordsToday()); setStreak(stats().streak);
    // слово дня: одно и то же весь день (по номеру дня)
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    db.getFirstAsync<{ n: number }>("SELECT count(*) n FROM forms WHERE sense = 0 AND length(gloss) > 8").then(async (r) => {
      const n = r?.n ?? 1;
      const w = await db.getFirstAsync<WordOfDay>(
        `SELECT f.entry_id, f.sense, f.form, f.gloss, e.hw FROM forms f JOIN entries e ON e.id = f.entry_id
         WHERE f.sense = 0 AND length(f.gloss) > 8 LIMIT 1 OFFSET ?`, [(day * 7919) % n]);
      setWord(w);
    });
  }, [db]));

  const Card = ({ icon, color, title, sub, onPress, delay, locked }: { icon: any; color: string; title: string; sub: string; onPress?: () => void; delay: number; locked?: boolean }) => (
    <FadeInUp delay={delay}>
      <PressScale onPress={onPress} disabled={!onPress} style={[styles.card, { backgroundColor: t.card, opacity: locked ? 0.75 : 1 }, soft(t)]}>
        <View style={[styles.icon, { backgroundColor: color }]}><Ionicons name={icon} size={22} color="#fff" /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: t.text, fontSize: 17, fontWeight: "900" }}>{title}</Text>
          <Text style={{ color: t.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{sub}</Text>
        </View>
        <Ionicons name={locked ? "lock-closed-outline" : "chevron-forward"} size={20} color={t.muted} />
      </PressScale>
    </FadeInUp>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 12, paddingBottom: 30 }}>
      <FadeInUp>
        <KancilSays mood="read" size={112} title="Ayo belajar!" text="Учим индонезийский понемногу каждый день. Selamat belajar!" />
      </FadeInUp>

      <FadeInUp delay={80}>
        <View style={[styles.statRow, { backgroundColor: t.card }, soft(t)]}>
          <BlueFlame size={26} lit={streak > 0} />
          <Text style={{ color: t.text, fontWeight: "900", fontSize: 18, marginLeft: 6 }}>{streak}</Text>
          <Text style={{ color: t.muted, marginLeft: 6, flex: 1 }}>дн. подряд</Text>
          {goal.enabled ? <Text style={{ color: today >= goal.count ? t.green : t.accent, fontWeight: "900" }}>{Math.min(today, goal.count)}/{goal.count} сегодня</Text>
            : <Pressable onPress={() => router.push("/more")}><Text style={{ color: t.accent, fontWeight: "700" }}>Поставить цель</Text></Pressable>}
        </View>
      </FadeInUp>

      {word ? (
        <FadeInUp delay={140}>
          <Pressable onPress={() => router.push({ pathname: "/entry/[id]", params: { id: String(word.entry_id) } })}
            style={[styles.wod, { backgroundColor: t.accent }]}>
            <Text style={{ color: "#ffffffcc", fontWeight: "800", fontSize: 12, letterSpacing: 0.8 }}>KATA HARI INI · СЛОВО ДНЯ</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", flex: 1 }}>{word.form}</Text>
              <Pressable hitSlop={10} onPress={() => { Speech.stop(); Speech.speak(word.form, { language: "id-ID", rate: 0.9 }); }}>
                <Ionicons name="volume-medium" size={26} color="#fff" />
              </Pressable>
            </View>
            <Text style={{ color: "#fff", fontSize: 15, marginTop: 4 }} numberOfLines={3}>{word.gloss.replace(/~/g, word.form)}</Text>
          </Pressable>
        </FadeInUp>
      ) : null}

      <Text style={[styles.h, { color: t.muted }]}>УЧЁБА</Text>
      <View style={{ gap: 10 }}>
        <Card delay={200} locked icon="book" color="#5B7FB5" title="Уроки индонезийского" sub="Скоро: статьи-уроки по учебникам, слова из уроков — сразу в карточки" />
        <Card delay={260} icon="chatbubbles" color="#D9962B" title="Пословицы о животных" sub="Peribahasa: индонезийские и русские пословицы с культурными комментариями" onPress={() => router.push("/proverbs")} />
        <Card delay={320} icon="repeat" color="#2E7D74" title="Повторить карточки" sub="Интервальное повторение и тренировки" onPress={() => router.navigate("/decks")} />
        <Card delay={380} icon="search" color="#C0605A" title="Словарь" sub="Найти слово в любой форме, по-русски или по фото" onPress={() => router.navigate("/")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 20 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 18, marginTop: 12 },
  wod: { borderRadius: 22, padding: 16, marginTop: 12 },
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4 },
});
