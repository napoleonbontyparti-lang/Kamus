/** «Настройки»: профиль, друзья, резервная копия на Google Диске, цель, вибрация, тема. */
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { Kancil, Text } from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { useTheme, soft } from "../../lib/theme";
import {
  allEntryEdits, exportBackup, exportDeckTsv, importBackup, listDecks, unsavedSince,
} from "../../lib/userdb";
import {
  THEME_LABELS, reloadSettings, setLastBackup, setThemeMode, useAffixColors, useLastBackup, useThemeMode, type ThemeMode,
} from "../../lib/settings";
import { shareText } from "../../lib/files";
import { Avatar } from "../../components/Avatar";
import { cloudReady, saveCloudBackup } from "../../lib/cloud";
import { setDailyGoal, setVibration, useDailyGoal, useProfile, useVibration, useCloudState, setCloudState, MODE_INFO, useAppMode, useShowWelcome, setShowWelcome } from "../../lib/settings";
import { buzz } from "../../lib/haptics";
import { SektiBalance } from "../../components/Sekti";

function DriveIcon({ size = 26 }: { size?: number }) {
  // упрощённый значок «Диск»: три цветные грани
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 3h8l7 12h-8z" fill="#FBBC04" />
      <Path d="M8 3 1 15l4 6 7-12z" fill="#34A853" />
      <Path d="M5 21h14l4-6H9z" fill="#4285F4" />
    </Svg>
  );
}

const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function MyScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const themeMode = useThemeMode();
  const affix = useAffixColors();
  const lastBackup = useLastBackup();
  const [unsaved, setUnsaved] = useState(0);
  const [edits, setEdits] = useState(0);
  const [entries, setEntries] = useState("");
  const [themeSheet, setThemeSheet] = useState(false);
  const [goalSheet, setGoalSheet] = useState(false);
  const profile = useProfile();
  const goal = useDailyGoal();
  const vibration = useVibration();
  const cloud = useCloudState();
  const appMode = useAppMode();
  const showWelcome = useShowWelcome();
  const [saving, setSaving] = useState(false);
  const saveNow = async () => {
    setSaving(true);
    try { await saveCloudBackup(); } catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
    finally { setSaving(false); }
  };

  useFocusEffect(useCallback(() => {
    setUnsaved(unsavedSince(lastBackup));
    setEdits(allEntryEdits().length);
    db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'entries'").then((r) =>
      setEntries(r ? Number(r.value).toLocaleString("ru") : ""));
  }, [db, lastBackup]));

  const backup = async () => {
    const d = new Date();
    const name = `KataCil-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
    await shareText(name, exportBackup(), "application/json", "Сохранить копию на Google Диск");
    setLastBackup(Date.now());
    setUnsaved(0);
  };

  const restore = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    try {
      const text = await new File(res.assets[0].uri).text();
      Alert.alert("Восстановить из копии?", "Текущие колоды, карточки и история будут заменены данными из файла.", [
        { text: "Отмена", style: "cancel" },
        {
          text: "Восстановить", style: "destructive", onPress: () => {
            try {
              const r = importBackup(text);
              reloadSettings();
              Alert.alert("Готово", `Восстановлено: ${r.decks} колод, ${r.cards} карточек.`);
            } catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Не удалось прочитать файл", String(e?.message ?? e));
    }
  };

  const exportAll = () => {
    const decks = listDecks();
    if (!decks.length) return Alert.alert("Нет колод");
    shareText("katacil-cards.txt", decks.map((d) => `#deck:${d.name}\n` + exportDeckTsv(d.id)).join("\n\n"));
  };

  const Row = ({ icon, label, value, onPress, last }: { icon: React.ReactNode; label: string; value?: string; onPress: () => void; last?: boolean }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: t.faint, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, backgroundColor: pressed ? t.accentSoft : "transparent" }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
      {value ? <Text style={{ color: t.muted, fontSize: 15 }}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={20} color={t.muted} style={{ marginLeft: 6 }} />
    </Pressable>
  );
  const ic = (name: any) => <Ionicons name={name} size={22} color={t.text} />;
  const SwitchRow = ({ icon, label, sub, value, onChange, last }: { icon: React.ReactNode; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) => (
    <View style={[styles.row, { borderBottomColor: t.faint, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
        {sub ? <Text style={{ color: t.muted, fontSize: 13, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent, false: t.faint }} thumbColor="#fff" />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {/* профиль */}
      <Pressable onPress={() => router.push("/settings/profile")} style={[styles.profile, { backgroundColor: t.card }, soft(t)]}>
        <Avatar uri={profile.avatar} size={60} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ color: t.text, fontSize: 19, fontWeight: "900" }} numberOfLines={1}>{profile.nick}</Text>
          <Text style={{ color: t.muted, marginTop: 2 }}>Код: <Text style={{ color: t.accent, fontWeight: "800", letterSpacing: 1 }}>{profile.code}</Text></Text>
        </View>
        <SektiBalance size={16} />
        <Ionicons name="chevron-forward" size={20} color={t.muted} style={{ marginLeft: 6 }} />
      </Pressable>
      <View style={[styles.group, { backgroundColor: t.card, marginTop: 10 }, soft(t)]}>
        <Row icon={ic("people-outline")} label="Друзья и рейтинг" value={cloudReady ? undefined : "скоро"} onPress={() => router.push("/settings/friends")} last />
      </View>

      {/* облако KataCil */}
      {cloudReady ? (
        <>
          <Text style={[styles.h, { color: t.muted }]}>ОБЛАКО KATACIL</Text>
          <View style={[styles.group, { backgroundColor: t.card }, soft(t)]}>
            <SwitchRow icon={ic("cloud-done-outline")} label="Автосохранение"
              sub={cloud.lastAt ? `Сохранено ${fmtDate(cloud.lastAt)}${cloud.lastError ? " · последняя попытка не удалась (нет сети?)" : ""}` : "Ещё не сохранялось"}
              value={cloud.auto} onChange={(v) => setCloudState({ auto: v })} />
            <Row icon={ic(saving ? "hourglass-outline" : "cloud-upload-outline")} label={saving ? "Сохраняю…" : "Сохранить сейчас"} onPress={saveNow} last />
          </View>
          <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 6, marginHorizontal: 6, lineHeight: 18 }}>
            Копия сохраняется сама при закрытии приложения. На новом телефоне: Профиль → «Восстановить аккаунт» по коду и ключу.
          </Text>
        </>
      ) : null}

      {/* резервная копия */}
      <View style={{ marginTop: 18 }}>
        <Kancil mood="hello" size={70} style={styles.peek} />
        <View style={[styles.card, { backgroundColor: t.card }, soft(t)]}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <DriveIcon />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: "800" }}>Резервная копия на Google Диске</Text>
              <Text style={{ color: t.muted, marginTop: 4, lineHeight: 20 }}>
                Все карточки хранятся на телефоне. Если удалить приложение, они пропадут —{" "}
                <Text style={{ color: t.accent, fontWeight: "700" }}>сохраняйте копию на Google Диск</Text> время от времени.
              </Text>
              <Text style={{ color: unsaved ? t.amber : t.green, marginTop: 8, fontWeight: "700" }}>
                {unsaved ? `Несохранённые изменения: ${unsaved}` : "Всё сохранено"}
              </Text>
              <Text style={{ color: t.muted, fontSize: 13, marginTop: 2 }}>
                {lastBackup ? `Последняя копия: ${fmtDate(lastBackup)}` : "Копий ещё не было"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable onPress={backup} style={[styles.btn, { backgroundColor: t.accent }]}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800" }}> Сохранить</Text>
            </Pressable>
            <Pressable onPress={restore} style={[styles.btn, { backgroundColor: t.accentSoft }]}>
              <Ionicons name="cloud-download-outline" size={18} color={t.accent} />
              <Text style={{ color: t.accent, fontWeight: "800" }}> Восстановить</Text>
            </Pressable>
          </View>
          <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 10, lineHeight: 18 }}>
            «Сохранить» откроет меню «Поделиться» — выберите «Диск». «Восстановить» — выберите файл KataCil-backup на Диске.
          </Text>
        </View>
      </View>

      {/* настройки */}
      <Text style={[styles.h, { color: t.muted }]}>РЕЖИМ</Text>
      <View style={[styles.group, { backgroundColor: t.card }, soft(t)]}>
        <Row icon={ic("apps-outline")} label="Как использовать" value={MODE_INFO[appMode].title} onPress={() => router.push("/welcome")} />
        <SwitchRow icon={ic("albums-outline")} label="Меню при запуске" sub="Выбор режима после заставки"
          value={showWelcome} onChange={setShowWelcome} last />
      </View>

      <Text style={[styles.h, { color: t.muted }]}>ОБУЧЕНИЕ</Text>
      <View style={[styles.group, { backgroundColor: t.card }, soft(t)]}>
        <SwitchRow icon={ic("flag-outline")} label="Ежедневная цель"
          sub={goal.enabled ? `${goal.count} слов в день — нажмите, чтобы изменить` : "Сколько слов повторять или учить каждый день"}
          value={goal.enabled} onChange={(v) => { setDailyGoal({ enabled: v }); if (v) setGoalSheet(true); }} />
        {goal.enabled ? (
          <Row icon={<View />} label="Слов в день" value={String(goal.count)} onPress={() => setGoalSheet(true)} />
        ) : null}
        <SwitchRow icon={ic("phone-portrait-outline")} label="Вибрация" sub="При ответах в тренировках"
          value={vibration} onChange={(v) => { setVibration(v); if (v) buzz("success"); }} last />
      </View>

      <Text style={[styles.h, { color: t.muted }]}>ОФОРМЛЕНИЕ</Text>
      <View style={[styles.group, { backgroundColor: t.card }, soft(t)]}>
        <Row icon={ic(themeMode === "dark" ? "moon-outline" : "sunny-outline")} label="Тема" value={THEME_LABELS[themeMode]} onPress={() => setThemeSheet(true)} />
        <Row icon={ic("color-palette-outline")} label="Цветные аффиксы" value={affix.enabled ? "Вкл." : "Выкл."} onPress={() => router.push("/settings/affix")} last />
      </View>

      <Text style={[styles.h, { color: t.muted }]}>СЛОВАРЬ</Text>
      <View style={[styles.group, { backgroundColor: t.card }, soft(t)]}>
        <Row icon={ic("book-outline")} label="Словари" value={entries ? `${entries} гнёзд` : undefined} onPress={() => router.push("/settings/about")} />
        <Row icon={ic("chatbubbles-outline")} label="Пословицы о животных" onPress={() => router.push("/proverbs")} />
        <Row icon={ic("create-outline")} label="Исправленные статьи" value={String(edits)} onPress={() => router.push("/settings/edits")} />
        <Row icon={ic("globe-outline")} label="KBBI" value="онлайн" onPress={() => router.push({ pathname: "/kbbi/[word]", params: { word: "kata" } })} last />
      </View>

      <Text style={[styles.h, { color: t.muted }]}>ЭКСПОРТ</Text>
      <View style={[styles.group, { backgroundColor: t.card }, soft(t)]}>
        <Row icon={ic("share-outline")} label="Карточки для Anki" value="TSV" onPress={exportAll} last />
      </View>

      <Sheet
        visible={goalSheet}
        title="Ежедневная цель: слов в день"
        onClose={() => setGoalSheet(false)}
        items={[5, 10, 15, 20, 30, 50, 100].map((n) => ({
          label: `${n} слов${n === goal.count ? "  ✓" : ""}`,
          color: n === goal.count ? t.accent : undefined,
          onPress: () => setDailyGoal({ enabled: true, count: n }),
        }))}
      />
      <Sheet
        visible={themeSheet}
        title="Тема"
        onClose={() => setThemeSheet(false)}
        items={(["light", "dark", "system"] as ThemeMode[]).map((m) => ({
          label: THEME_LABELS[m] + (m === themeMode ? "  ✓" : ""),
          color: m === themeMode ? t.accent : undefined,
          icon: <Ionicons name={m === "light" ? "sunny-outline" : m === "dark" ? "moon-outline" : "phone-portrait-outline"} size={20} color={m === themeMode ? t.accent : t.text} />,
          onPress: () => setThemeMode(m),
        }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 14 },
  peek: { position: "absolute", right: 14, top: -46, zIndex: 0 },
  card: { borderRadius: 22, padding: 16, zIndex: 1 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 16 },
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  group: { borderRadius: 20, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 },
  rowIcon: { width: 32 },
  rowLabel: { flex: 1, fontSize: 17, fontWeight: "600" },
});
