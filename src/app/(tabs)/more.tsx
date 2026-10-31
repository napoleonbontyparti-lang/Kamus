import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Text, KancilSays } from "../../components/ui";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { allEntryEdits, listDecks, exportDeckTsv } from "../../lib/userdb";
import { useTheme, soft } from "../../lib/theme";
import { Word } from "../../components/Word";
import { AFFIX_PALETTE, setAffixColors, useAffixColors, type AffixColors } from "../../lib/settings";

export default function MoreScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<{ entry_id: number; hw: string }[]>([]);

  useFocusEffect(useCallback(() => {
    db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM meta").then((rows) =>
      setMeta(Object.fromEntries(rows.map((r) => [r.key, r.value]))));
    const e = allEntryEdits();
    Promise.all(e.map(async (x) => {
      const r = await db.getFirstAsync<{ hw: string }>("SELECT hw FROM entries WHERE id = ?", [x.entry_id]);
      return { entry_id: x.entry_id, hw: JSON.parse(x.data)[0]?.w || r?.hw || "?" };
    })).then(setEdits);
  }, [db]));

  const share = async (name: string, content: string) => {
    const f = new File(Paths.cache, name);
    if (f.exists) f.delete();
    f.create();
    f.write(content);
    await Sharing.shareAsync(f.uri, { mimeType: "text/plain" });
  };

  const exportAll = () => {
    const decks = listDecks();
    if (!decks.length) return Alert.alert("Нет колод");
    const body = decks.map((d) => `#deck:${d.name}\n` + exportDeckTsv(d.id)).join("\n\n");
    share("katacil-cards.txt", body);
  };

  const exportEdits = () => {
    const e = allEntryEdits();
    if (!e.length) return Alert.alert("Правок пока нет");
    share("katacil-edits.json", JSON.stringify(e.map((x) => ({ entry_id: x.entry_id, senses: JSON.parse(x.data) })), null, 2));
  };

  const Row = ({ icon, title, sub, onPress }: { icon: any; title: string; sub?: string; onPress?: () => void }) => (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: t.card }, soft(t)]}>
      <View style={[styles.rowIcon, { backgroundColor: t.accentSoft }]}><Ionicons name={icon} size={20} color={t.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>{title}</Text>
        {sub ? <Text style={{ color: t.muted, marginTop: 2, lineHeight: 19 }}>{sub}</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
      <KancilSays mood="hello" size={112} title="Saya Si Kancil!"
        text="Добро пожаловать в KataCil: kata — «слово», cil — от kancil и kecil. Я маленький, но хитрый оленёк из индонезийских сказок: найду любое слово и не дам его забыть." />
      <Text style={[styles.h, { color: t.muted }]}>СЛОВАРЬ</Text>
      <Row icon="book-outline" title={meta.title ?? "Словарь"}
        sub={`${Number(meta.entries ?? 0).toLocaleString("ru")} гнёзд · ${Number(meta.forms ?? 0).toLocaleString("ru")} словоформ · работает без интернета`} />
      <Row icon="globe-outline" title="KBBI"
        sub="Если слова нет в словаре — кнопка внизу результатов поиска или «KBBI» в статье. Нужен интернет."
        onPress={() => router.push({ pathname: "/kbbi/[word]", params: { word: "kamus" } })} />

      <Text style={[styles.h, { color: t.muted }]}>ЦВЕТНЫЕ АФФИКСЫ</Text>
      <AffixSettings />

      <Text style={[styles.h, { color: t.muted }]}>ЭКСПОРТ</Text>
      <Row icon="share-outline" title="Все карточки (Anki TSV)" sub="Файл → Импорт в Anki; колонки: слово, перевод, корень, заметка" onPress={exportAll} />
      <Row icon="document-text-outline" title="Мои правки словаря (JSON)" sub="Пригодятся, чтобы внести исправления в следующую версию базы" onPress={exportEdits} />

      {edits.length ? (
        <>
          <Text style={[styles.h, { color: t.muted }]}>ИСПРАВЛЕННЫЕ СТАТЬИ ({edits.length})</Text>
          {edits.map((e) => (
            <Pressable key={e.entry_id} onPress={() => router.push({ pathname: "/entry/[id]", params: { id: String(e.entry_id) } })}
              style={[styles.editRow, { borderBottomColor: t.faint }]}>
              <Text style={{ color: t.hw, fontSize: 16, fontWeight: "600" }}>{e.hw}</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <Text style={[styles.h, { color: t.muted }]}>ПОДСКАЗКИ</Text>
      <Text style={{ color: t.text, lineHeight: 22, paddingHorizontal: 4 }}>
        • Поиск понимает аффиксы: di-, me-, ber-, ter-, pe-, per-, ke-…-an, -kan, -i, -nya, -lah, удвоение.{"\n"}
        • Русское слово ищет по переводам.{"\n"}
        • Закладка у слова в статье создаёт карточку.{"\n"}
        • Нашли ошибку распознавания — карандаш в статье.{"\n"}
        • Озвучка использует индонезийский голос телефона; если звука нет, установите голос «Bahasa Indonesia» в настройках синтеза речи.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: 20, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  affix: { padding: 14, borderRadius: 20, marginBottom: 10 },
  preview: { marginTop: 12, padding: 12, borderRadius: 14, alignItems: "center" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  editRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
});

const ROWS: { key: keyof Omit<AffixColors, "enabled">; label: string; ex: string }[] = [
  { key: "pre", label: "Приставки", ex: "me-, ber-, di-, per-, ke-" },
  { key: "root", label: "Корень", ex: "без цвета — обычный" },
  { key: "suf", label: "Суффиксы", ex: "-kan, -an, -i" },
  { key: "clitic", label: "Частицы и местоимения", ex: "-nya, -ku, -mu, -lah, -pun" },
];

function AffixSettings() {
  const t = useTheme();
  const c = useAffixColors();
  return (
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
  );
}
