import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, Keyboard } from "react-native";
import { Text, TextInput, KancilSays } from "../../components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { search, type Hit } from "../../lib/dict";
import { addHistory, clearHistory, recentHistory } from "../../lib/userdb";
import { useTheme, soft } from "../../lib/theme";

const HOW_LABEL: Record<Hit["how"], string> = { exact: "", prefix: "", stem: "разбор", ru: "" };

export default function SearchScreen() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? "");
  const [hits, setHits] = useState<Hit[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const reqId = useRef(0);

  useEffect(() => { if (params.q) setQ(params.q); }, [params.q]);
  useFocusEffect(useCallback(() => { setHistory(recentHistory()); }, []));

  useEffect(() => {
    const id = ++reqId.current;
    if (!q.trim()) { setHits([]); return; }
    setBusy(true);
    const h = setTimeout(async () => {
      const res = await search(db, q);
      if (id === reqId.current) { setHits(res); setBusy(false); }
    }, 120);
    return () => clearTimeout(h);
  }, [q, db]);

  const open = (h: Hit) => {
    addHistory(q.trim());
    Keyboard.dismiss();
    router.push({ pathname: "/entry/[id]", params: { id: String(h.entryId), sense: String(h.sense) } });
  };

  const isRu = /[а-яё]/i.test(q);
  const nothing = q.trim().length > 0 && !busy && hits.length === 0;
  const onlyPrefix = hits.length > 0 && hits.every((h) => h.how === "prefix");

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top + 8 }]}>
      <View style={[styles.searchBox, { backgroundColor: t.card }, soft(t)]}>
        <Ionicons name="search" size={20} color={t.accent} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="kata, imbuhan… или русское слово"
          placeholderTextColor={t.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: t.text }]}
          clearButtonMode="never"
        />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={t.muted} />
          </Pressable>
        ) : null}
      </View>

      {!q.trim() ? (
        <FlatList
          data={history}
          keyExtractor={(w) => w}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={{ marginTop: 14, marginBottom: 6 }}>
                <KancilSays mood="read" size={124} title="Halo! Cari kata apa hari ini?"
                  text={history.length
                    ? "Пиши слово в любой форме — я сам отрежу приставки и суффиксы."
                    : "Пиши слово в любой форме: «rumahnya», «ketidakadilan», «dipertanggungjawabkan» — я найду корень. Можно и по-русски."} />
              </View>
              {history.length ? (
                <View style={styles.histHead}>
                  <Text style={[styles.section, { color: t.muted }]}>НЕДАВНО ИСКАЛИ</Text>
                  <Pressable onPress={() => { clearHistory(); setHistory([]); }}>
                    <Text style={{ color: t.accent, fontWeight: "700" }}>Очистить</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setQ(item)} style={[styles.histRow, { backgroundColor: t.card }]}>
              <Ionicons name="time-outline" size={16} color={t.accent} />
              <Text style={[styles.histText, { color: t.text }]}>{item}</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(h) => `${h.entryId}:${h.sense}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            nothing || onlyPrefix ? (
              <View style={{ marginTop: 10 }}>
                <KancilSays mood="think" size={110}
                  title={nothing ? "Hmm… такого слова нет" : "Точного совпадения нет"}
                  text={nothing
                    ? `«${q.trim()}» не нашлось у Коригодского. Давай заглянем в KBBI!`
                    : `Вот похожие слова. Не то? Посмотри «${q.trim()}» в KBBI.`} />
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [
              styles.row, { backgroundColor: pressed ? t.accentSoft : t.card }]}>
              <View style={styles.rowHead}>
                <Text style={[styles.form, { color: t.hw }]}>{item.form}</Text>
                {item.hom ? <Text style={[styles.hom, { color: t.muted }]}>{item.hom}</Text> : null}
                {item.form.toLowerCase() !== item.hw.toLowerCase() ? (
                  <Text style={[styles.rootLabel, { color: t.muted }]}>  ← {item.hw}</Text>
                ) : null}
                {item.analysis ? (
                  <Text style={[styles.badge, { color: t.accent, backgroundColor: t.accentSoft }]}>
                    {HOW_LABEL[item.how]}: {item.analysis}
                  </Text>
                ) : null}
              </View>
              <Text numberOfLines={2} style={[styles.gloss, { color: t.text }]}>
                {item.gloss.replace(/~/g, item.form) || "—"}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            !isRu && q.trim() ? (
              <Pressable
                onPress={() => { addHistory(q.trim()); router.push({ pathname: "/kbbi/[word]", params: { word: q.trim() } }); }}
                style={[styles.kbbi, { backgroundColor: nothing || onlyPrefix ? t.red : t.redSoft }]}
              >
                <Ionicons name="globe-outline" size={18} color={nothing || onlyPrefix ? "#fff" : t.red} />
                <Text style={{ color: nothing || onlyPrefix ? "#fff" : t.red, fontWeight: "800" }}>  Искать «{q.trim()}» в KBBI</Text>
              </Pressable>
            ) : <View style={{ height: 24 }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBox: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 8,
    paddingHorizontal: 16, borderRadius: 26, height: 52,
  },
  input: { flex: 1, fontSize: 17, marginLeft: 8, paddingVertical: 0 },
  row: { marginHorizontal: 12, marginVertical: 4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 },
  rowHead: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 2 },
  form: { fontSize: 19, fontWeight: "800" },
  hom: { fontSize: 12, marginLeft: 2, fontWeight: "600" },
  rootLabel: { fontSize: 14 },
  badge: { fontSize: 11, marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden", fontWeight: "700" },
  gloss: { fontSize: 15, marginTop: 2, lineHeight: 20 },
  kbbi: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", margin: 16, padding: 14,
    borderRadius: 24, marginBottom: 40,
  },
  histHead: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 },
  section: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 12, marginVertical: 3, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  histText: { fontSize: 16, fontWeight: "600" },
});
