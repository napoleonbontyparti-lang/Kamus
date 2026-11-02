import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../components/ui";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { getEntry, neighbours, search, type Entry } from "../../lib/dict";
import { cardExists } from "../../lib/userdb";
import { Definition, shortGloss } from "../../components/Definition";
import { useTheme, soft } from "../../lib/theme";
import { Word } from "../../components/Word";

export default function EntryScreen() {
  const db = useSQLiteContext();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, sense } = useLocalSearchParams<{ id: string; sense?: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [nb, setNb] = useState<{ prev: { id: number; hw: string } | null; next: { id: number; hw: string } | null }>({ prev: null, next: null });
  const [, force] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const ys = useRef<Record<number, number>>({});
  const scrolled = useRef(false);

  const load = useCallback(async () => {
    const e = await getEntry(db, Number(id));
    setEntry(e);
    setNb(await neighbours(db, Number(id)));
  }, [db, id]);

  useFocusEffect(useCallback(() => { load(); force((x) => x + 1); }, [load]));
  useEffect(() => { scrolled.current = false; }, [id]);

  const speak = (w: string) => {
    Speech.stop();
    Speech.speak(w.replace(/[\[\]\(\)~]/g, ""), { language: "id-ID", rate: 0.9 });
  };

  const onLink = async (w: string) => {
    const hits = await search(db, w, 5);
    const exact = hits.find((h) => h.how === "exact");
    if (exact) router.push({ pathname: "/entry/[id]", params: { id: String(exact.entryId), sense: String(exact.sense) } });
    else router.navigate({ pathname: "/", params: { q: w } });
  };

  const addCard = (si: number) => {
    if (!entry) return;
    const s = entry.senses[si];
    const back = shortGloss(s.d || entry.senses[0].d || "", 200).replace(/~/g, s.w);
    router.push({
      pathname: "/card/[id]",
      params: { id: "new", front: s.w, back, root: entry.hw, entryId: String(entry.id), sense: String(si) },
    });
  };

  if (!entry) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  const target = sense ? Number(sense) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen
        options={{
          title: entry.hw,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Pressable hitSlop={8} onPress={() => router.push({ pathname: "/edit-entry/[id]", params: { id: String(entry.id) } })}>
                <Ionicons name="create-outline" size={22} color={t.accent} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => router.push({ pathname: "/kbbi/[word]", params: { word: entry.hw } })}>
                <Text style={{ color: t.red, fontWeight: "800", fontSize: 15 }}>KBBI</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom }}>
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: t.muted }]}>
            Коригодский, стр. {entry.page}{entry.hom ? ` · омоним ${entry.hom}` : ""}{entry.edited ? " · исправлено вами" : ""}
          </Text>
        </View>

        {entry.senses.map((s, i) => {
          const isRoot = i === 0;
          const added = cardExists(s.w);
          return (
            <View
              key={i}
              onLayout={(e) => {
                ys.current[i] = e.nativeEvent.layout.y;
                if (!scrolled.current && i === target && target > 0) {
                  scrolled.current = true;
                  setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, ys.current[i] - 8), animated: true }), 50);
                }
              }}
              style={[
                styles.sense,
                { backgroundColor: t.card, borderColor: i === target && target > 0 ? t.accent : "transparent" },
                soft(t),
                !isRoot && styles.derived,
              ]}
            >
              <View style={styles.senseHead}>
                <Text style={{ flexShrink: 1 }}>
                  <Word form={s.w} root={isRoot ? null : entry.hw} style={[isRoot ? styles.hw : styles.form, { color: t.hw }]} />
                  {isRoot && entry.hom ? <Text style={{ fontSize: 14, color: t.muted }}> {entry.hom}</Text> : null}
                </Text>
                <View style={styles.actions}>
                  <Pressable hitSlop={8} onPress={() => speak(s.w)}>
                    <Ionicons name="volume-medium-outline" size={22} color={t.accent} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => addCard(i)}>
                    <Ionicons name={added ? "bookmark" : "bookmark-outline"} size={21} color={added ? t.green : t.accent} />
                  </Pressable>
                </View>
              </View>
              {s.d ? (
                <Definition text={s.d} word={s.w} onLink={onLink} />
              ) : (
                <Text style={{ color: t.muted, fontStyle: "italic" }}>самостоятельно не употребляется</Text>
              )}
            </View>
          );
        })}

        <View style={styles.nav}>
          {nb.prev ? (
            <Pressable onPress={() => router.replace({ pathname: "/entry/[id]", params: { id: String(nb.prev!.id) } })}>
              <Text style={{ color: t.accent }}>‹ {nb.prev.hw}</Text>
            </Pressable>
          ) : <View />}
          {nb.next ? (
            <Pressable onPress={() => router.replace({ pathname: "/entry/[id]", params: { id: String(nb.next!.id) } })}>
              <Text style={{ color: t.accent }}>{nb.next.hw} ›</Text>
            </Pressable>
          ) : <View />}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { marginBottom: 10 },
  metaText: { fontSize: 13 },
  sense: { borderRadius: 22, borderWidth: 2, padding: 16, marginBottom: 12 },
  derived: { marginLeft: 12 },
  senseHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  hw: { fontSize: 30, fontWeight: "900", flexShrink: 1 },
  form: { fontSize: 21, fontWeight: "800", flexShrink: 1 },
  actions: { flexDirection: "row", gap: 16, marginLeft: 12 },
  nav: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingHorizontal: 4 },
});
