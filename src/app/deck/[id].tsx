import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../components/ui";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  cardStateLabel, cardsInDeck, deleteDeck, exportDeckTsv, getDeck, renameDeck, type CardRow, type Deck,
} from "../../lib/userdb";
import { normalize } from "../../lib/stemmer";
import { useTheme, soft } from "../../lib/theme";

const MODES = [
  { key: "flip", icon: "repeat", title: "Повторение", sub: "интервальное (FSRS)", color: "#2E7D74" },
  { key: "choice-ir", icon: "list", title: "ID → RU", sub: "выбор перевода", color: "#D9962B" },
  { key: "choice-ri", icon: "swap-horizontal", title: "RU → ID", sub: "выбор слова", color: "#C0605A" },
  { key: "write", icon: "pencil", title: "Написание", sub: "впишите слово", color: "#5B7FB5" },
  { key: "affix", icon: "git-branch", title: "Аффиксы", sub: "корень → форма", color: "#8A6BB0" },
  { key: "truefalse", icon: "flash", title: "Верно/неверно", sub: "на скорость", color: "#3E9B5F" },
] as const;

export default function DeckScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deckId = Number(id);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");

  const refresh = useCallback(() => {
    const d = getDeck(deckId);
    setDeck(d); setName(d?.name ?? ""); setCards(cardsInDeck(deckId));
  }, [deckId]);
  useFocusEffect(refresh);

  const affixCount = cards.filter((c) => c.root && normalize(c.root) !== normalize(c.front)).length;

  const start = (mode: string) => {
    if (!cards.length) return Alert.alert("Колода пуста", "Добавьте слова из словаря кнопкой-закладкой.");
    if (mode === "affix" && affixCount === 0)
      return Alert.alert("Нет производных слов", "Для этого режима нужны карточки с производными формами (например, mengadukan ← adu).");
    if (mode.startsWith("choice") && cards.length < 2)
      return Alert.alert("Мало карточек", "Для режима выбора нужно хотя бы 2 карточки.");
    router.push({ pathname: "/study/[deckId]", params: { deckId: String(deckId), mode } });
  };

  const exportTsv = async () => {
    const f = new File(Paths.cache, `${(deck?.name ?? "deck").replace(/[^\wа-яё\- ]/gi, "_")}.txt`);
    if (f.exists) f.delete();
    f.create();
    f.write(exportDeckTsv(deckId));
    await Sharing.shareAsync(f.uri, { mimeType: "text/plain", dialogTitle: "Экспорт колоды (Anki TSV)" });
  };

  const remove = () =>
    Alert.alert("Удалить колоду?", `«${deck?.name}» и все её карточки (${cards.length}) будут удалены.`, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => { deleteDeck(deckId); router.back(); } },
    ]);

  const shown = filter ? cards.filter((c) => (c.front + " " + c.back).toLowerCase().includes(filter.toLowerCase())) : cards;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen
        options={{
          title: deck?.name ?? "Колода",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Pressable hitSlop={8} onPress={exportTsv}><Ionicons name="share-outline" size={22} color={t.accent} /></Pressable>
              <Pressable hitSlop={8} onPress={() => setRenaming((r) => !r)}><Ionicons name="pencil" size={20} color={t.accent} /></Pressable>
              <Pressable hitSlop={8} onPress={remove}><Ionicons name="trash-outline" size={21} color={t.red} /></Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={shown}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            {renaming ? (
              <View style={[styles.rename, { backgroundColor: t.card, borderColor: t.accent }]}>
                <TextInput value={name} onChangeText={setName} autoFocus style={{ flex: 1, fontSize: 17, color: t.text }} />
                <Pressable onPress={() => { renameDeck(deckId, name); setRenaming(false); refresh(); }}>
                  <Text style={{ color: t.accent, fontWeight: "700" }}>Сохранить</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.grid}>
              {MODES.map((m) => (
                <Pressable key={m.key} onPress={() => start(m.key)}
                  style={({ pressed }) => [styles.mode, { backgroundColor: t.card, transform: [{ scale: pressed ? 0.97 : 1 }] }, soft(t)]}>
                  <View style={[styles.modeIcon, { backgroundColor: m.color }]}>
                    <Ionicons name={m.icon} size={20} color="#fff" />
                  </View>
                  <Text style={[styles.modeTitle, { color: t.text }]}>{m.title}</Text>
                  <Text style={{ color: t.muted, fontSize: 12 }}>
                    {m.key === "flip" && deck ? `${deck.due} к повтор. · ${deck.fresh} нов.` : m.sub}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.listHead}>
              <TextInput value={filter} onChangeText={setFilter} placeholder={`Фильтр (${cards.length})`}
                placeholderTextColor={t.muted} autoCapitalize="none"
                style={[styles.filter, { color: t.text, backgroundColor: t.card, borderColor: t.faint }]} />
              <Pressable onPress={() => router.push({ pathname: "/card/[id]", params: { id: "new", deckId: String(deckId) } })}
                style={[styles.addBtn, { backgroundColor: t.accent }]}>
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: t.muted, padding: 12, lineHeight: 21 }}>
            Пока пусто. Откройте статью в словаре и нажмите на закладку рядом со словом — карточка появится здесь.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: "/card/[id]", params: { id: String(item.id) } })}
            style={[styles.card, { borderBottomColor: t.faint }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.hw, fontSize: 17, fontWeight: "700" }}>{item.front}
                {item.root && normalize(item.root) !== normalize(item.front) ?
                  <Text style={{ color: t.muted, fontWeight: "400", fontSize: 13 }}>  ← {item.root}</Text> : null}
              </Text>
              <Text numberOfLines={1} style={{ color: t.text, marginTop: 2 }}>{item.back}</Text>
            </View>
            <Text style={{ color: t.muted, fontSize: 12 }}>{cardStateLabel(item)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  mode: { width: "48.5%", borderRadius: 22, padding: 14, gap: 2 },
  modeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  modeTitle: { fontSize: 16, fontWeight: "800", marginTop: 6 },
  rename: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  listHead: { flexDirection: "row", gap: 8, marginBottom: 6 },
  filter: { flex: 1, borderWidth: 1, borderRadius: 21, paddingHorizontal: 16, height: 42, fontSize: 15 },
  addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
});
