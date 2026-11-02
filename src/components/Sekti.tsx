import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sektiSvg, SEKTI_BLUE } from "./sektiSvg";
import { Kancil, Text } from "./ui";
import { useTheme } from "../lib/theme";
import { sektiBalance, sektiHistory } from "../lib/userdb";
import { ACHIEVEMENTS, useAchievements } from "../lib/achievements";
export { SEKTI_BLUE };

export function SektiIcon({ size = 18, dim, white }: { size?: number; dim?: boolean; white?: boolean }) {
  return <SvgXml xml={sektiSvg(white ? { fill: "#FFFFFF", ink: "#FFFFFF" } : { dim })} width={size} height={size} />;
}

function reasonLabel(reason: string): string {
  const [kind, id, level] = reason.split(":");
  if (kind === "achievement") {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    return `${a?.name ?? "Достижение"} · уровень ${level}`;
  }
  return reason;
}

const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Баланс Секти. Нажатие открывает «кошелёк»: сколько Секти, откуда они и как получить ещё. */
export function SektiBalance({ size = 20 }: { size?: number }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  useAchievements(); // перерисовка после получения награды
  const [open, setOpen] = useState(false);
  const n = sektiBalance();
  const history = open ? sektiHistory() : [];
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel={`Секти: ${n}`}
        style={({ pressed }) => [styles.pill, { backgroundColor: t.bg === "#FFF8EE" ? "#E3ECFF" : "#14264D", opacity: pressed ? 0.7 : 1 }]}>
        <SektiIcon size={size} />
        <Text style={{ color: t.text, fontWeight: "900", fontSize: size * 0.85, marginLeft: 5 }}>{n.toLocaleString("ru")}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent navigationBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: t.faint }]} />
          <View style={{ alignItems: "center" }}>
            <SektiIcon size={56} />
            <Text style={{ color: SEKTI_BLUE, fontSize: 40, fontWeight: "900", marginTop: 4 }}>{n.toLocaleString("ru")}</Text>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: "800" }}>Секти на вашем счёте</Text>
            <Text style={{ color: t.muted, textAlign: "center", marginTop: 6, lineHeight: 19, paddingHorizontal: 10 }}>
              Sekti — «волшебная сила» канчиля. Получайте их за достижения: 10, 20, 30, 50 и 100 за уровни. Скоро за них откроются новые возможности.
            </Text>
          </View>
          <Pressable onPress={() => { setOpen(false); router.navigate("/awards"); }} style={[styles.btn, { backgroundColor: SEKTI_BLUE }]}>
            <SektiIcon size={18} white />
            <Text style={{ color: "#fff", fontWeight: "900" }}>  Как получить ещё</Text>
          </Pressable>
          <Text style={[styles.h, { color: t.muted }]}>ИСТОРИЯ</Text>
          <FlatList
            style={{ maxHeight: 260 }}
            data={history}
            keyExtractor={(e) => String(e.id)}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 10 }}>
                <Kancil mood="think" size={80} />
                <Text style={{ color: t.muted }}>Пока пусто — получите первое достижение!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.row, { borderBottomColor: t.faint }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: "700" }}>{reasonLabel(item.reason)}</Text>
                  <Text style={{ color: t.muted, fontSize: 12.5 }}>{fmt(item.ts)}</Text>
                </View>
                <Text style={{ color: item.amount > 0 ? SEKTI_BLUE : t.red, fontWeight: "900", fontSize: 17 }}>
                  {item.amount > 0 ? "+" : ""}{item.amount}
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 12 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 18, marginTop: 16 },
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 18, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
