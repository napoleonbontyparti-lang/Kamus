import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui";
import { Word } from "../../components/Word";
import { useTheme, soft } from "../../lib/theme";
import { AFFIX_PALETTE, setAffixColors, useAffixColors, type AffixColors } from "../../lib/settings";

const ROWS: { key: keyof Omit<AffixColors, "enabled">; label: string; ex: string }[] = [
  { key: "pre", label: "Приставки", ex: "me-, ber-, di-, per-, ke-" },
  { key: "root", label: "Корень", ex: "без цвета — обычный" },
  { key: "suf", label: "Суффиксы", ex: "-kan, -an, -i" },
  { key: "clitic", label: "Частицы и местоимения", ex: "-nya, -ku, -mu, -lah, -pun" },
];

export default function AffixScreen() {
  const t = useTheme();
  const c = useAffixColors();
  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
    <Stack.Screen options={{ title: "Цветные аффиксы" }} />
    <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 12, paddingHorizontal: 4 }}>
      Как тоны в Pleco: каждая часть слова — своим цветом. Помогает видеть, как строится слово. Работает в статьях, поиске и карточках.
    </Text>
    <View style={[styles.affix, { backgroundColor: t.card }, soft(t)]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>Раскрашивать части слова</Text>
          <Text style={{ color: t.muted, marginTop: 2 }}>В статьях, поиске и карточках</Text>
        </View>
        <Switch value={c.enabled} onValueChange={(v) => setAffixColors({ enabled: v })}
          trackColor={{ true: t.accent, false: t.faint }} thumbColor="#fff" />
      </View>
      <View style={[styles.preview, { backgroundColor: t.bg }]}>
        <Word force form="mempertanggungjawabkannya" root="tanggung jawab" style={{ fontSize: 19, fontWeight: "800", color: t.hw }} />
        <Word force form="ditandatanganilah" root="tanda" style={{ fontSize: 19, fontWeight: "800", color: t.hw, marginTop: 2 }} />
      </View>
      {ROWS.map((r) => (
        <View key={r.key} style={{ marginTop: 12, opacity: c.enabled ? 1 : 0.55 }}>
          <Text style={{ color: t.text, fontWeight: "700" }}>{r.label} <Text style={{ color: t.muted, fontWeight: "400" }}>{r.ex}</Text></Text>
          <View style={styles.swatches}>
            {AFFIX_PALETTE.map((col) => {
              const on = c[r.key] === col;
              return (
                <Pressable key={col || "none"} onPress={() => setAffixColors({ [r.key]: col })} hitSlop={4}
                  style={[styles.swatch, { backgroundColor: col || t.bg, borderColor: on ? t.text : col ? "transparent" : t.faint }]}>
                  {!col ? <Ionicons name="remove" size={16} color={t.muted} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  affix: { padding: 14, borderRadius: 20, marginBottom: 10 },
  preview: { marginTop: 12, padding: 12, borderRadius: 14, alignItems: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
});
