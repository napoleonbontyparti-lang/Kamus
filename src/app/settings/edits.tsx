import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { allEntryEdits } from "../../lib/userdb";
import { shareText } from "../../lib/files";

export default function EditsScreen() {
  const t = useTheme();
  const [rows, setRows] = useState<{ entry_id: number; hw: string; ts: number }[]>([]);
  useFocusEffect(useCallback(() => {
    setRows(allEntryEdits().map((e) => ({ entry_id: e.entry_id, ts: e.ts, hw: JSON.parse(e.data)[0]?.w ?? "?" })));
  }, []));
  const exportJson = () => shareText("katacil-edits.json",
    JSON.stringify(allEntryEdits().map((x) => ({ entry_id: x.entry_id, senses: JSON.parse(x.data) })), null, 2), "application/json");
  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      data={rows}
      keyExtractor={(r) => String(r.entry_id)}
      ListHeaderComponent={
        <View>
          <Stack.Screen options={{ title: "Исправленные статьи",
            headerRight: () => rows.length ? <Pressable hitSlop={8} onPress={exportJson}><Ionicons name="share-outline" size={22} color={t.accent} /></Pressable> : null }} />
          <Text style={{ color: t.muted, lineHeight: 20, marginBottom: 10 }}>
            Статьи, где вы исправили ошибки распознавания. Кнопка вверху выгружает правки в JSON — их можно внести в следующую версию базы.
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={{ color: t.muted }}>Пока правок нет. Карандаш в статье открывает редактор.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: "/entry/[id]", params: { id: String(item.entry_id) } })}
          style={[styles.row, { borderBottomColor: t.faint }]}>
          <Text style={{ color: t.hw, fontSize: 17, fontWeight: "700", flex: 1 }}>{item.hw}</Text>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
