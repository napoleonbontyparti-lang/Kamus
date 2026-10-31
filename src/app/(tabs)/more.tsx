import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, KancilSays } from "../../components/ui";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { allEntryEdits, listDecks, exportDeckTsv } from "../../lib/userdb";
import { useTheme, soft } from "../../lib/theme";

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
    share("kamus-cards.txt", body);
  };

  const exportEdits = () => {
    const e = allEntryEdits();
    if (!e.length) return Alert.alert("Правок пока нет");
    share("kamus-edits.json", JSON.stringify(e.map((x) => ({ entry_id: x.entry_id, senses: JSON.parse(x.data) })), null, 2));
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
        text="Маленький, но хитрый оленёк из индонезийских сказок. Помогу найти любое слово и не дам его забыть." />
      <Text style={[styles.h, { color: t.muted }]}>СЛОВАРЬ</Text>
      <Row icon="book-outline" title={meta.title ?? "Словарь"}
        sub={`${Number(meta.entries ?? 0).toLocaleString("ru")} гнёзд · ${Number(meta.forms ?? 0).toLocaleString("ru")} словоформ · работает без интернета`} />
      <Row icon="globe-outline" title="KBBI"
        sub="Если слова нет в словаре — кнопка внизу результатов поиска или «KBBI» в статье. Нужен интернет."
        onPress={() => router.push({ pathname: "/kbbi/[word]", params: { word: "kamus" } })} />

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
  editRow: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
});
