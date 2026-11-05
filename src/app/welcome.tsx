/** Меню после заставки: как использовать KataCil — словарь, карточки или изучение языка. */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Kancil, Text } from "../components/ui";
import { Bob, FadeInUp, PressScale } from "../components/anim";
import { useTheme, soft } from "../lib/theme";
import { MODE_INFO, getShowWelcome, setAppMode, setShowWelcome, useAppMode, type AppMode } from "../lib/settings";

const OPTIONS: { mode: AppMode; icon: any; title: string; sub: string; color: string }[] = [
  { mode: "dict", icon: "search", title: "Словарь", sub: "Коригодский, русско-индонезийский, пословицы, KBBI, поиск по фото", color: "#2E7D74" },
  { mode: "cards", icon: "albums", title: "Карточки", sub: "Колоды, интервальное повторение, календарь, награды", color: "#D9962B" },
  { mode: "learn", icon: "school", title: "Изучение языка", sub: "Уроки, пословицы о животных, слово дня и ежедневная цель", color: "#5B7FB5" },
];

export default function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useAppMode();
  const [remember, setRemember] = useState(!getShowWelcome());

  const choose = (m: AppMode) => {
    setAppMode(m);
    setShowWelcome(!remember);
    router.replace(MODE_INFO[m].tab as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false, animation: "fade" }} />
      <FadeInUp style={{ alignItems: "center" }}>
        <Bob amount={5}><Kancil mood="hello" size={150} /></Bob>
        <Text style={[styles.title, { color: t.text }]}>Selamat datang!</Text>
        <Text style={{ color: t.muted, fontSize: 16, marginTop: 4 }}>Как будете заниматься сегодня?</Text>
      </FadeInUp>

      <View style={{ gap: 12, marginTop: 26 }}>
        {OPTIONS.map((o, i) => (
          <FadeInUp key={o.mode} delay={150 + i * 120}>
            <PressScale onPress={() => choose(o.mode)} style={[styles.card, { backgroundColor: t.card, borderColor: current === o.mode ? o.color : "transparent" }, soft(t)]}>
              <View style={[styles.icon, { backgroundColor: o.color }]}><Ionicons name={o.icon} size={26} color="#fff" /></View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ color: t.text, fontSize: 19, fontWeight: "900" }}>{o.title}</Text>
                <Text style={{ color: t.muted, fontSize: 13.5, marginTop: 2, lineHeight: 18 }}>{o.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={t.muted} />
            </PressScale>
          </FadeInUp>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <FadeInUp delay={560}>
        <Pressable onPress={() => setRemember((r) => !r)} style={styles.remember} hitSlop={8}>
          <Ionicons name={remember ? "checkbox" : "square-outline"} size={22} color={t.accent} />
          <Text style={{ color: t.text, marginLeft: 8 }}>Запомнить выбор и не показывать это меню</Text>
        </Pressable>
        <Text style={{ color: t.muted, fontSize: 12.5, textAlign: "center", marginTop: 6 }}>Сменить режим можно в «Настройках».</Text>
      </FadeInUp>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18 },
  title: { fontSize: 30, fontWeight: "900", marginTop: 6 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 24, borderWidth: 2 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  remember: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
