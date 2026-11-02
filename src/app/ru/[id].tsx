/** Статья русско-индонезийского словаря. Индонезийские слова нажимаются — откроется Коригодский. */
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui";
import { getRuEntry, ruNeighbours, search, type RuEntry } from "../../lib/dict";
import { useTheme, soft } from "../../lib/theme";

const LABEL = /^[а-яё]{1,8}\.,?$/i;

export default function RuEntryScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [e, setE] = useState<RuEntry | null>(null);
  const [nb, setNb] = useState<{ prev: { id: number; hw: string } | null; next: { id: number; hw: string } | null }>({ prev: null, next: null });
  const [old, setOld] = useState(false);

  useFocusEffect(useCallback(() => {
    getRuEntry(db, Number(id)).then(setE);
    ruNeighbours(db, Number(id)).then(setNb);
  }, [db, id]));

  const openIndo = async (w: string) => {
    const hits = await search(db, w, 5);
    const h = hits.find((x) => x.how === "exact" || x.how === "stem");
    if (h) router.push({ pathname: "/entry/[id]", params: { id: String(h.entryId), sense: String(h.sense) } });
    else router.navigate({ pathname: "/", params: { q: w } });
  };

  if (!e) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  const text = old ? e.old : e.body;
  // значения с новой строки, фразеология после ◊ — отдельным блоком
  const [main, ...phr] = text.split(/\s*◊\s*/);
  const meanings = main.split(/\s(?=\d{1,2}\.\s)/);

  const Inline = ({ s }: { s: string }) => (
    <>
      {s.split(/(\s+)/).map((tok, i) => {
        if (/^\s+$/.test(tok) || !tok) return tok;
        const bare = tok.replace(/[.,;:()[\]{}!?«»"]/g, "");
        if (/^\d{1,2}\.$/.test(tok)) return <Text key={i} style={{ color: t.accent, fontWeight: "800" }}>{tok}</Text>;
        if (LABEL.test(tok)) return <Text key={i} style={{ color: t.muted, fontStyle: "italic" }}>{tok}</Text>;
        if (/^[a-z][a-z\-']*$/i.test(bare) && bare.length > 1)
          return <Text key={i} style={{ color: t.hw }} onPress={() => openIndo(bare)}>{tok}</Text>;
        if (tok === "—" || tok.startsWith("—")) return <Text key={i} style={{ color: t.accent, fontWeight: "700" }}>{tok.replace("—", "~")}</Text>;
        return <Text key={i}>{tok}</Text>;
      })}
    </>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 50 + insets.bottom }}>
      <Stack.Screen options={{ title: e.hw }} />
      <Text style={{ color: t.muted, fontSize: 13, marginBottom: 10 }}>Русско-индонезийский словарь · стр. {e.page}</Text>
      <View style={[styles.card, { backgroundColor: t.card }, soft(t)]}>
        <Text style={[styles.hw, { color: t.text }]} selectable>{e.hw}</Text>
        {meanings.map((m, i) => (
          <Text key={i} style={[styles.line, { color: t.text }]}><Inline s={m} /></Text>
        ))}
        {phr.length ? (
          <View style={[styles.phr, { borderLeftColor: t.faint }]}>
            {phr.join(" ◊ ").split(/;\s+/).map((p, i) => (
              <Text key={i} style={[styles.line, { color: t.text, fontSize: 15 }]}><Inline s={p} /></Text>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 10, lineHeight: 18 }}>
        «~» — заглавное слово. Индонезийские слова нажимаются — откроется словарь Коригодского.
      </Text>
      <Pressable onPress={() => setOld((o) => !o)} style={[styles.toggle, { borderColor: t.faint }]}>
        <Ionicons name={old ? "time" : "time-outline"} size={18} color={t.accent} />
        <Text style={{ color: t.accent, fontWeight: "700" }}>
          {old ? "  Показать в современной орфографии" : "  Показать как в книге (старая орфография: tj, dj, j)"}
        </Text>
      </Pressable>
      <View style={styles.nav}>
        {nb.prev ? <Pressable onPress={() => router.replace({ pathname: "/ru/[id]", params: { id: String(nb.prev!.id) } })}><Text style={{ color: t.accent }}>‹ {nb.prev.hw}</Text></Pressable> : <View />}
        {nb.next ? <Pressable onPress={() => router.replace({ pathname: "/ru/[id]", params: { id: String(nb.next!.id) } })}><Text style={{ color: t.accent }}>{nb.next.hw} ›</Text></Pressable> : <View />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16 },
  hw: { fontSize: 28, fontWeight: "900", marginBottom: 8 },
  line: { fontSize: 16.5, lineHeight: 24, marginBottom: 4 },
  phr: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 3 },
  toggle: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, padding: 12, marginTop: 14 },
  nav: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, paddingHorizontal: 4 },
});
