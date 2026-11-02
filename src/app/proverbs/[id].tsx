/** Глава о животном: пословицы с переводом и культурный комментарий. */
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui";
import { getChapter, type ProvChapter, type Proverb } from "../../lib/dict";
import { useTheme, soft } from "../../lib/theme";

export default function ChapterScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const [data, setData] = useState<{ chapter: ProvChapter; proverbs: Proverb[] } | null>(null);
  const [tab, setTab] = useState<"list" | "about">("list");
  const list = useRef<FlatList<Proverb>>(null);

  useEffect(() => { getChapter(db, Number(id)).then(setData); }, [db, id]);
  useEffect(() => {
    if (!data || !focus) return;
    const i = data.proverbs.findIndex((p) => p.id === Number(focus));
    if (i > 0) setTimeout(() => list.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.1 }), 300);
  }, [data, focus]);

  if (!data) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  const { chapter, proverbs } = data;

  const addCard = (p: Proverb) => router.push({ pathname: "/card/[id]", params: {
    id: "new",
    front: p.lang === "id" ? p.text : p.meaning_id || p.text,
    back: p.lang === "id" ? (p.meaning_ru || p.meaning_id).split(/(?<=\.)\s/)[0] : p.text,
  } });

  const header = (
    <View>
      <Stack.Screen options={{ title: `${chapter.title_ru} · ${chapter.title_id}` }} />
      <View style={[styles.seg, { backgroundColor: t.faint }]}>
        {([["list", `Пословицы · ${proverbs.length}`], ["about", "Культурный комментарий"]] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && { backgroundColor: t.card }]}>
            <Text style={{ color: tab === k ? t.text : t.muted, fontWeight: "800", fontSize: 13.5 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (tab === "about") {
    return (
      <FlatList
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom }}
        data={chapter.text}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={header}
        renderItem={({ item }) => item.startsWith("## ")
          ? <Text style={[styles.subh, { color: t.accent }]}>{item.slice(3)}</Text>
          : <Text style={[styles.para, { color: t.text }]} selectable>{item}</Text>}
      />
    );
  }

  return (
    <FlatList
      ref={list}
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom }}
      data={proverbs}
      keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={header}
      onScrollToIndexFailed={() => {}}
      renderItem={({ item, index }) => {
        const showGroup = item.grp && (index === 0 || proverbs[index - 1].grp !== item.grp);
        const focused = String(item.id) === focus;
        return (
          <View>
            {showGroup ? <Text style={[styles.group, { color: t.muted }]}>{item.grp}</Text> : null}
            <View style={[styles.card, { backgroundColor: t.card, borderColor: focused ? t.accent : "transparent" }, soft(t)]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <Text style={[styles.prov, { color: item.lang === "id" ? t.hw : t.text, flex: 1 }]} selectable>{item.text}</Text>
                <Pressable hitSlop={10} onPress={() => addCard(item)} style={{ marginLeft: 10 }}>
                  <Ionicons name="bookmark-outline" size={20} color={t.accent} />
                </Pressable>
              </View>
              {item.lang === "id" ? (
                <>
                  {item.meaning_ru ? <Text style={[styles.mean, { color: t.text }]} selectable>{item.meaning_ru}</Text> : null}
                  {item.meaning_id ? <Text style={[styles.meanId, { color: t.muted }]} selectable>{item.meaning_id}</Text> : null}
                </>
              ) : item.meaning_id ? (
                <Text style={[styles.mean, { color: t.hw }]} selectable>{item.meaning_id}</Text>
              ) : null}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: "row", borderRadius: 18, padding: 4, marginBottom: 12 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 14 },
  card: { borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 2 },
  prov: { fontSize: 17, fontWeight: "800", lineHeight: 23 },
  mean: { fontSize: 15, lineHeight: 21, marginTop: 6 },
  meanId: { fontSize: 13.5, lineHeight: 19, marginTop: 6, fontStyle: "italic" },
  group: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, marginTop: 10, marginBottom: 6, marginLeft: 4 },
  subh: { fontSize: 16, fontWeight: "900", marginTop: 14, marginBottom: 6 },
  para: { fontSize: 15.5, lineHeight: 23, marginBottom: 10 },
});
