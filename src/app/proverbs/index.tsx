/** Пословицы о животных: главы по животным (домашние и дикие, индонезийские и русские). */
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { KancilSays, Text } from "../../components/ui";
import { listChapters, type ProvChapter } from "../../lib/dict";
import { useTheme, soft } from "../../lib/theme";

export default function ProverbsIndex() {
  const t = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [chapters, setChapters] = useState<ProvChapter[]>([]);
  useEffect(() => { listChapters(db).then(setChapters); }, [db]);

  const sections = [
    { title: "ДОМАШНИЕ ЖИВОТНЫЕ · BINATANG PELIHARAAN", data: chapters.filter((c) => c.section === "domestic") },
    { title: "ДИКИЕ ЖИВОТНЫЕ · BINATANG LIAR", data: chapters.filter((c) => c.section === "wild") },
  ];

  return (
    <SectionList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom }}
      sections={sections}
      keyExtractor={(c) => String(c.id)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ marginBottom: 6 }}>
          <Stack.Screen options={{ title: "Пословицы о животных" }} />
          <KancilSays mood="read" size={100} title="Peribahasa binatang"
            text="Индонезийские и русские пословицы о животных с переводом и культурными комментариями. Есть глава и про меня!" />
          <Text style={{ color: t.muted, fontSize: 12, marginTop: 8, marginHorizontal: 4 }}>
            По книге: А. Рахмат, С. В. Банит, Н. Е. Якименко. «Названия животных в пословицах и поговорках русского и индонезийского языков», 2020.
          </Text>
        </View>
      }
      renderSectionHeader={({ section }) => <Text style={[styles.h, { color: t.muted }]}>{section.title}</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: "/proverbs/[id]", params: { id: String(item.id) } })}
          style={[styles.row, { backgroundColor: t.card }, soft(t)]}>
          <View style={[styles.tag, { backgroundColor: item.lang === "id" ? t.accentSoft : t.amberSoft }]}>
            <Text style={{ color: item.lang === "id" ? t.accent : t.amber, fontWeight: "900", fontSize: 12 }}>{item.lang === "id" ? "ID" : "RU"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 17, fontWeight: "800" }}>{item.title_ru} · <Text style={{ color: t.hw }}>{item.title_id}</Text></Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>
              {item.lang === "id" ? "индонезийские пословицы" : "русские пословицы"} · {item.count}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, marginBottom: 8 },
  tag: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
