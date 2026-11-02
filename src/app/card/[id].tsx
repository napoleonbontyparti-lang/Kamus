import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../components/ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { addCard, deleteCard, getCard, listDecks, updateCard, type Deck } from "../../lib/userdb";
import { useTheme } from "../../lib/theme";

/** Создание (id = "new") и редактирование карточки. */
export default function CardScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{
    id: string; front?: string; back?: string; root?: string; entryId?: string; sense?: string; deckId?: string;
  }>();
  const isNew = p.id === "new";
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState<number | null>(p.deckId ? Number(p.deckId) : null);
  const [front, setFront] = useState(p.front ?? "");
  const [back, setBack] = useState(p.back ?? "");
  const [root, setRoot] = useState(p.root ?? "");
  const [note, setNote] = useState("");

  useEffect(() => {
    const ds = listDecks();
    setDecks(ds);
    if (!isNew) {
      const c = getCard(Number(p.id));
      if (c) { setFront(c.front); setBack(c.back); setRoot(c.root ?? ""); setNote(c.note ?? ""); setDeckId(c.deck_id); }
    } else if (deckId === null && ds.length) setDeckId(ds[0].id);
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!front.trim() || !back.trim()) return Alert.alert("Заполните слово и перевод");
    if (deckId === null) return Alert.alert("Выберите колоду");
    if (isNew) {
      addCard({ deckId, front, back, root: root || null, note: note || null,
        entryId: p.entryId ? Number(p.entryId) : null, sense: p.sense ? Number(p.sense) : null });
    } else {
      updateCard(Number(p.id), { front, back, note: note || null, deckId, root: root || null });
    }
    router.back();
  };

  const remove = () => Alert.alert("Удалить карточку?", front, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => { deleteCard(Number(p.id)); router.back(); } },
  ]);

  const field = (label: string, value: string, set: (s: string) => void, opts: { multiline?: boolean; big?: boolean } = {}) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
      <TextInput value={value} onChangeText={set} multiline={opts.multiline} autoCapitalize="none"
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.faint },
          opts.big && { fontSize: 20, fontWeight: "700" }, opts.multiline && { minHeight: 90, textAlignVertical: "top" }]} />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{
        title: isNew ? "Новая карточка" : "Карточка",
        headerRight: () => <Pressable onPress={save} hitSlop={8}><Text style={{ color: t.accent, fontWeight: "700", fontSize: 16 }}>Сохранить</Text></Pressable>,
      }} />
      {field("СЛОВО (ИНДОНЕЗИЙСКИЙ)", front, setFront, { big: true })}
      {field("ПЕРЕВОД", back, setBack, { multiline: true })}
      {field("КОРЕНЬ (для тренировки аффиксов)", root, setRoot)}
      {field("ЗАМЕТКА / ПРИМЕР", note, setNote, { multiline: true })}
      <Text style={[styles.label, { color: t.muted }]}>КОЛОДА</Text>
      <View style={styles.chips}>
        {decks.map((d) => (
          <Pressable key={d.id} onPress={() => setDeckId(d.id)}
            style={[styles.chip, { borderColor: deckId === d.id ? t.accent : t.faint, backgroundColor: deckId === d.id ? t.accentSoft : t.card }]}>
            <Text style={{ color: deckId === d.id ? t.accent : t.text, fontWeight: deckId === d.id ? "700" : "400" }}>{d.name}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={save} style={[styles.save, { backgroundColor: t.accent }]}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>{isNew ? "Добавить в колоду" : "Сохранить"}</Text>
      </Pressable>
      {!isNew ? (
        <Pressable onPress={remove}><Text style={{ color: t.red, textAlign: "center", marginTop: 16 }}>Удалить карточку</Text></Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 18, padding: 14, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  save: { marginTop: 24, padding: 16, borderRadius: 24, alignItems: "center" },
});
