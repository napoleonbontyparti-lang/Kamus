/** Друзья и рейтинг: поиск по уникальному коду, добавление, рейтинг за неделю. */
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KancilSays, Text, TextInput } from "../../components/ui";
import { Avatar } from "../../components/Avatar";
import { BlueFlame } from "../../components/BlueFlame";
import { Hoof } from "../../components/Hoof";
import { useTheme, soft } from "../../lib/theme";
import { useProfile } from "../../lib/settings";
import { addFriend, cloudReady, findProfile, leaderboard, removeFriend, type PublicProfile } from "../../lib/cloud";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function FriendsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const me = useProfile();
  const [rows, setRows] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [found, setFound] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cloudReady) return;
    setLoading(true); setError(null);
    try { setRows(await leaderboard()); } catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const lookup = async () => {
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length !== 8) return Alert.alert("Код из 8 символов", "Например: 7F3Q-9AKD");
    const formatted = `${c.slice(0, 4)}-${c.slice(4)}`;
    try {
      const p = await findProfile(formatted);
      if (!p) return Alert.alert("Не найдено", "Пользователь с таким кодом не найден.");
      setFound(p);
    } catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
  };

  const add = async () => {
    if (!found) return;
    try { await addFriend(found.code); setFound(null); setCode(""); load(); }
    catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
  };

  const remove = (p: PublicProfile) => Alert.alert("Удалить из друзей?", p.nick, [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: async () => { try { await removeFriend(p.code); load(); } catch (e: any) { Alert.alert(String(e?.message ?? e)); } } },
  ]);

  if (!cloudReady) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 16 }}>
        <Stack.Screen options={{ title: "Друзья и рейтинг" }} />
        <KancilSays mood="think" size={110} title="Сервер ещё не подключён"
          text="Чтобы находить друзей по коду и соревноваться в рейтинге, приложению нужен общий сервер. Как только он будет подключён, здесь появятся друзья." />
        <Pressable onPress={() => router.push("/settings/profile")} style={[styles.btn, { backgroundColor: t.accentSoft, marginTop: 20 }]}>
          <Text style={{ color: t.accent, fontWeight: "800" }}>Мой код: {me.code}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom }}
      data={rows}
      keyExtractor={(r) => r.code}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.accent} />}
      ListHeaderComponent={
        <View>
          <Stack.Screen options={{ title: "Друзья и рейтинг" }} />
          <View style={[styles.card, { backgroundColor: t.card }, soft(t)]}>
            <Text style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>Добавить друга по коду</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TextInput value={code} onChangeText={(v) => { setCode(v); setFound(null); }} placeholder="XXXX-XXXX"
                placeholderTextColor={t.muted} autoCapitalize="characters" autoCorrect={false} onSubmitEditing={lookup}
                style={[styles.input, { color: t.text, backgroundColor: t.bg, borderColor: t.faint }]} />
              <Pressable onPress={lookup} style={[styles.findBtn, { backgroundColor: t.accent }]}>
                <Ionicons name="search" size={20} color="#fff" />
              </Pressable>
            </View>
            {found ? (
              <View style={[styles.found, { borderColor: t.accent }]}>
                <Avatar uri={found.avatar} nick={found.nick} size={44} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>{found.nick}</Text>
                  <Text style={{ color: t.muted }}>{found.code} · {found.streak} дн. подряд</Text>
                </View>
                <Pressable onPress={add} style={[styles.addBtn, { backgroundColor: t.accent }]}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Добавить</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={{ color: t.muted, fontSize: 13, marginTop: 10 }}>Ваш код: <Text style={{ color: t.accent, fontWeight: "800" }}>{me.code}</Text></Text>
          </View>
          <Text style={[styles.h, { color: t.muted }]}>РЕЙТИНГ ЗА НЕДЕЛЮ · ответов за 7 дней</Text>
          {error ? <Text style={{ color: t.red, marginBottom: 8 }}>{error}</Text> : null}
          {loading && !rows.length ? <ActivityIndicator color={t.accent} /> : null}
        </View>
      }
      ListEmptyComponent={!loading ? <Text style={{ color: t.muted }}>Добавьте друзей — и здесь появится рейтинг.</Text> : undefined}
      renderItem={({ item, index }) => {
        const mine = item.code === me.code;
        return (
          <Pressable onLongPress={() => !mine && remove(item)}
            style={[styles.row, { backgroundColor: mine ? t.accentSoft : t.card }, soft(t)]}>
            <Text style={[styles.rank, { color: t.muted }]}>{MEDALS[index] ?? index + 1}</Text>
            <Avatar uri={item.avatar} nick={item.nick} size={42} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text numberOfLines={1} style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>{item.nick}{mine ? " (вы)" : ""}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <BlueFlame size={14} lit={item.streak > 0} />
                <Text style={{ color: t.muted, fontSize: 13 }}>{item.streak} дн.</Text>
                {item.goal_done ? <><Hoof size={13} color={t.accent} filled /><Text style={{ color: t.accent, fontSize: 13 }}>цель</Text></> : null}
              </View>
            </View>
            <Text style={{ color: t.accent, fontWeight: "900", fontSize: 20 }}>{item.week}</Text>
          </Pressable>
        );
      }}
      ListFooterComponent={rows.length > 1 ? <Text style={{ color: t.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>Долгое нажатие — удалить из друзей. Потяните вниз, чтобы обновить.</Text> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, letterSpacing: 1.5 },
  findBtn: { width: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  found: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, padding: 10, marginTop: 10 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 12, marginBottom: 8 },
  rank: { width: 30, fontSize: 18, fontWeight: "900", textAlign: "center", marginRight: 6 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 16 },
});
