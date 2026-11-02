/**
 * Поиск по фото (как в Pleco): фото → распознанный текст → каждое слово можно нажать,
 * найденные в словаре слова сразу показаны с переводом.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { KancilSays, Text } from "../components/ui";
import { Word } from "../components/Word";
import { search, type Hit } from "../lib/dict";
import { shrinkForOcr } from "../lib/images";
import { normalize } from "../lib/stemmer";
import { useTheme, soft } from "../lib/theme";
import { bumpCounter } from "../lib/settings";
import { refreshAchievements } from "../lib/achievements";

type Token = { text: string; key: string; hit?: Hit | null };

const WORD = /[A-Za-zÀ-ÿ]+(?:-[A-Za-zÀ-ÿ]+)*/g;

export default function OcrScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [lines, setLines] = useState<Token[][] | null>(null);
  const [found, setFound] = useState<Record<string, Hit | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!isSupported) throw new Error("Распознавание текста не поддерживается на этом устройстве.");
        const small = await shrinkForOcr(uri);
        const raw = await extractTextFromImage(small);
        const ls = raw.join("\n").split(/\n+/).map((l) => l.trim()).filter(Boolean);
        const tokenLines: Token[][] = ls.map((l) => {
          const out: Token[] = [];
          let last = 0;
          for (const m of l.matchAll(WORD)) {
            if (m.index! > last) out.push({ text: l.slice(last, m.index), key: "" });
            out.push({ text: m[0], key: normalize(m[0]) });
            last = m.index! + m[0].length;
          }
          if (last < l.length) out.push({ text: l.slice(last), key: "" });
          return out;
        });
        setLines(tokenLines);
        bumpCounter("ocr"); refreshAchievements(); // «Mata Elang»
        // ищем каждое уникальное слово
        const uniq = [...new Set(tokenLines.flat().map((x) => x.key).filter((k) => k.length >= 2))].slice(0, 120);
        const res: Record<string, Hit | null> = {};
        for (const k of uniq) {
          const hits = await search(db, k, 3);
          res[k] = hits.find((h) => h.how === "exact" || h.how === "stem") ?? null;
        }
        setFound(res);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, [uri, db]);

  const openWord = (k: string) => {
    const h = found[k];
    if (h) router.push({ pathname: "/entry/[id]", params: { id: String(h.entryId), sense: String(h.sense) } });
    else router.navigate({ pathname: "/", params: { q: k } });
  };

  const known = Object.entries(found).filter(([, h]) => h) as [string, Hit][];
  const unknown = Object.entries(found).filter(([, h]) => !h).map(([k]) => k);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom }}>
      <Stack.Screen options={{ title: "Поиск по фото" }} />
      {uri ? <Image source={{ uri }} style={[styles.photo, { backgroundColor: t.faint }]} resizeMode="contain" /> : null}

      {error ? (
        <KancilSays mood="sad" size={100} title="Не получилось" text={error} />
      ) : !lines ? (
        <View style={{ alignItems: "center", padding: 24 }}>
          <ActivityIndicator color={t.accent} />
          <Text style={{ color: t.muted, marginTop: 10 }}>Si Kancil читает текст…</Text>
        </View>
      ) : !lines.length ? (
        <KancilSays mood="think" size={100} title="Текст не найден"
          text="Попробуйте снять ближе, ровнее и при хорошем свете, а при обрезке выделить только нужные строки." />
      ) : (
        <>
          <Text style={[styles.h, { color: t.muted }]}>РАСПОЗНАННЫЙ ТЕКСТ · нажмите на слово</Text>
          <View style={[styles.textBox, { backgroundColor: t.card }, soft(t)]}>
            {lines.map((ln, i) => (
              <Text key={i} style={{ fontSize: 18, lineHeight: 30, color: t.text }}>
                {ln.map((tok, j) => tok.key ? (
                  <Text key={j} onPress={() => openWord(tok.key)}
                    style={{ color: found[tok.key] ? t.accent : found[tok.key] === null ? t.text : t.muted,
                      fontWeight: found[tok.key] ? "700" : "400",
                      textDecorationLine: found[tok.key] ? "underline" : "none" }}>
                    {tok.text}
                  </Text>
                ) : <Text key={j}>{tok.text}</Text>)}
              </Text>
            ))}
          </View>

          {known.length ? <Text style={[styles.h, { color: t.muted }]}>В СЛОВАРЕ · {known.length}</Text> : null}
          {known.map(([k, h]) => (
            <Pressable key={k} onPress={() => openWord(k)} style={[styles.row, { backgroundColor: t.card }, soft(t)]}>
              <View style={{ flex: 1 }}>
                <Text>
                  <Word form={k} root={h.hw} style={{ fontSize: 18, fontWeight: "800", color: t.hw }} />
                  {normalize(h.form) !== k ? <Text style={{ color: t.muted }}>  → {h.form}</Text> : null}
                </Text>
                <Text numberOfLines={2} style={{ color: t.text, marginTop: 2 }}>{h.gloss.replace(/~/g, h.form)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Pressable>
          ))}

          {unknown.length ? (
            <>
              <Text style={[styles.h, { color: t.muted }]}>НЕТ В СЛОВАРЕ · искать в KBBI</Text>
              <View style={styles.chips}>
                {unknown.map((k) => (
                  <Pressable key={k} onPress={() => router.push({ pathname: "/kbbi/[word]", params: { word: k } })}
                    style={[styles.chip, { backgroundColor: t.redSoft }]}>
                    <Text style={{ color: t.red, fontWeight: "700" }}>{k}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", height: 220, borderRadius: 18, marginBottom: 12 },
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, marginTop: 14, marginBottom: 8, marginLeft: 4 },
  textBox: { borderRadius: 18, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 12, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
});
