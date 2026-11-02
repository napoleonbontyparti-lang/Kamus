import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../components/ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { getEntry, type Sense } from "../../lib/dict";
import { resetEntryEdit, saveEntryEdit } from "../../lib/userdb";
import { useTheme } from "../../lib/theme";

/**
 * Исправление ошибок распознавания в статье. Правка хранится у пользователя
 * поверх исходной базы и переживает обновления словаря.
 */
export default function EditEntryScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [senses, setSenses] = useState<Sense[]>([]);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    getEntry(db, Number(id)).then((e) => { if (e) { setSenses(e.senses); setEdited(!!e.edited); } });
  }, [db, id]);

  const set = (i: number, k: keyof Sense, v: string) => setSenses((s) => s.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const save = () => { saveEntryEdit(Number(id), senses.filter((s) => s.w.trim() || s.d.trim())); router.back(); };

  const reset = () => Alert.alert("Вернуть исходный текст?", "Ваши правки этой статьи будут удалены.", [
    { text: "Отмена", style: "cancel" },
    { text: "Вернуть", style: "destructive", onPress: () => { resetEntryEdit(Number(id)); router.back(); } },
  ]);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{
        headerRight: () => <Pressable onPress={save} hitSlop={8}><Text style={{ color: t.accent, fontWeight: "700", fontSize: 16 }}>Готово</Text></Pressable>,
      }} />
      <Text style={{ color: t.muted, marginBottom: 14, lineHeight: 20 }}>
        Первая строка — заглавное слово, дальше производные. «~» заменяет слово, «◊» открывает фразеологию, «‖» отделяет значение прилагательного.
      </Text>
      {senses.map((s, i) => (
        <View key={i} style={[styles.box, { backgroundColor: t.card, borderColor: t.faint }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput value={s.w} onChangeText={(v) => set(i, "w", v)} autoCapitalize="none" autoCorrect={false}
              style={[styles.word, { color: t.hw, borderColor: t.faint }]} />
            {i > 0 ? (
              <Pressable hitSlop={8} onPress={() => setSenses((x) => x.filter((_, j) => j !== i))}>
                <Ionicons name="remove-circle-outline" size={22} color={t.red} />
              </Pressable>
            ) : null}
          </View>
          <TextInput value={s.d} onChangeText={(v) => set(i, "d", v)} multiline
            style={[styles.def, { color: t.text, borderColor: t.faint }]} />
        </View>
      ))}
      <Pressable onPress={() => setSenses((s) => [...s, { w: "", d: "" }])} style={[styles.add, { borderColor: t.accent }]}>
        <Text style={{ color: t.accent, fontWeight: "600" }}>+ производное слово</Text>
      </Pressable>
      {edited ? <Pressable onPress={reset}><Text style={{ color: t.red, textAlign: "center", marginTop: 18 }}>Вернуть исходный текст</Text></Pressable> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  word: { flex: 1, fontSize: 18, fontWeight: "700", borderBottomWidth: 1, paddingVertical: 4, marginRight: 8 },
  def: { fontSize: 15, lineHeight: 21, minHeight: 60, textAlignVertical: "top", marginTop: 6 },
  add: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, padding: 12, alignItems: "center" },
});
