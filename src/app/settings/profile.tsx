/** Профиль: аватар, никнейм, уникальный код, ключ восстановления и восстановление аккаунта. */
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "../../components/ui";
import { Avatar } from "../../components/Avatar";
import { Sheet } from "../../components/Sheet";
import { useTheme, soft } from "../../lib/theme";
import { setProfile, useProfile, reloadSettings, newCode, newKey } from "../../lib/settings";
import { pickImage, toAvatar } from "../../lib/images";
import { cloudReady, recoverAccount, saveCloudBackup, syncProfile } from "../../lib/cloud";
import { importBackup } from "../../lib/userdb";

export default function ProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const p = useProfile();
  const [nick, setNick] = useState(p.nick);
  const [menu, setMenu] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [rCode, setRCode] = useState("");
  const [rKey, setRKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const changeAvatar = async (src: "camera" | "library") => {
    const uri = await pickImage(src, { square: true, quality: 0.8 });
    if (!uri) return;
    setProfile({ avatar: await toAvatar(uri) });
    syncProfile().catch(() => {});
  };

  const saveNick = () => {
    const n = nick.trim().slice(0, 40);
    if (!n) return setNick(p.nick);
    setProfile({ nick: n });
    syncProfile().catch(() => {});
  };

  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Скопировано", what);
  };

  const cloudSave = async () => {
    setBusy("save");
    try { await saveCloudBackup(); Alert.alert("Готово", "Копия всех данных сохранена на сервере KataCil."); }
    catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
    finally { setBusy(null); }
  };

  const recover = async () => {
    if (!rCode.trim() || !rKey.trim()) return Alert.alert("Введите код и ключ восстановления");
    setBusy("recover");
    try {
      const r = await recoverAccount(rCode, rKey);
      Alert.alert("Аккаунт найден", `«${r.nick}». ${r.backup ? "Восстановить карточки и историю? Данные на этом телефоне будут заменены." : "Облачной копии данных нет — восстановится только профиль."}`, [
        { text: "Отмена", style: "cancel" },
        {
          text: "Восстановить", style: "destructive", onPress: () => {
            try {
              if (r.backup) importBackup(r.backup);
              reloadSettings();
              setProfile({ code: rCode.toUpperCase().trim(), key: rKey.toUpperCase().trim(), nick: r.nick, avatar: r.avatar, registered: true });
              setNick(r.nick);
              setRCode(""); setRKey("");
              Alert.alert("Готово", "Аккаунт восстановлен.");
            } catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
          },
        },
      ]);
    } catch (e: any) { Alert.alert("Не получилось", String(e?.message ?? e)); }
    finally { setBusy(null); }
  };

  const regenerate = () => Alert.alert("Новый код и ключ?", "Друзьям придётся добавить вас заново по новому коду.", [
    { text: "Отмена", style: "cancel" },
    { text: "Создать", style: "destructive", onPress: () => setProfile({ code: newCode(), key: newKey(), registered: false }) },
  ]);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Профиль" }} />
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <Pressable onPress={() => setMenu(true)}>
          <Avatar uri={p.avatar} size={112} />
          <View style={[styles.cam, { backgroundColor: t.accent, borderColor: t.bg }]}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu(true)}>
          <Text style={{ color: t.accent, fontWeight: "800", marginTop: 12, letterSpacing: 0.5 }}>ИЗМЕНИТЬ АВАТАР</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: t.text }]}>Никнейм</Text>
      <TextInput value={nick} onChangeText={setNick} onBlur={saveNick} onSubmitEditing={saveNick} maxLength={40}
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.faint }]} />

      <Text style={[styles.label, { color: t.text }]}>Уникальный код</Text>
      <Pressable onPress={() => copy(p.code, "Код скопирован — отправьте его друзьям.")}
        style={[styles.input, styles.codeRow, { backgroundColor: t.card, borderColor: t.faint }]}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: "900", letterSpacing: 2, flex: 1 }}>{p.code}</Text>
        <Ionicons name="copy-outline" size={20} color={t.accent} />
      </Pressable>
      <Text style={[styles.hint, { color: t.muted }]}>По этому коду друзья находят вас и добавляют в рейтинг.</Text>

      <Text style={[styles.label, { color: t.text }]}>Ключ восстановления</Text>
      <View style={[styles.input, styles.codeRow, { backgroundColor: t.card, borderColor: t.faint }]}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: "800", letterSpacing: 1, flex: 1 }}>
          {showKey ? p.key : "••••-••••-••••-••••"}
        </Text>
        <Pressable hitSlop={8} onPress={() => setShowKey((s) => !s)} style={{ marginRight: 16 }}>
          <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={20} color={t.accent} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => copy(p.key, "Ключ скопирован. Сохраните его в надёжном месте и никому не показывайте.")}>
          <Ionicons name="copy-outline" size={20} color={t.accent} />
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: t.muted }]}>
        Код + ключ = ваш аккаунт. Запишите их: с ними можно восстановить профиль, друзей и карточки на новом телефоне.
      </Text>

      <Text style={[styles.h, { color: t.muted }]}>ВОССТАНОВЛЕНИЕ</Text>
      {!cloudReady ? (
        <View style={[styles.box, { backgroundColor: t.amberSoft }]}>
          <Text style={{ color: t.text, lineHeight: 20 }}>Сервер KataCil ещё не подключён — облачная копия и восстановление появятся после подключения. Пока пользуйтесь резервной копией на Google Диске в «Настройках».</Text>
        </View>
      ) : (
        <>
          <Pressable onPress={cloudSave} style={[styles.btn, { backgroundColor: t.accent }]}>
            {busy === "save" ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
            <Text style={{ color: "#fff", fontWeight: "800" }}>  Сохранить все данные в облако</Text>
          </Pressable>
          <View style={[styles.box, { backgroundColor: t.card, marginTop: 12 }, soft(t)]}>
            <Text style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>Восстановить аккаунт</Text>
            <Text style={{ color: t.muted, marginTop: 4, lineHeight: 19 }}>Введите код и ключ со старого телефона.</Text>
            <TextInput value={rCode} onChangeText={setRCode} placeholder="КОД, например 7F3Q-9AKD" placeholderTextColor={t.muted}
              autoCapitalize="characters" style={[styles.input, { color: t.text, backgroundColor: t.bg, borderColor: t.faint, marginTop: 10 }]} />
            <TextInput value={rKey} onChangeText={setRKey} placeholder="Ключ восстановления" placeholderTextColor={t.muted}
              autoCapitalize="characters" style={[styles.input, { color: t.text, backgroundColor: t.bg, borderColor: t.faint, marginTop: 8 }]} />
            <Pressable onPress={recover} style={[styles.btn, { backgroundColor: t.accentSoft, marginTop: 10 }]}>
              {busy === "recover" ? <ActivityIndicator color={t.accent} /> : <Ionicons name="refresh" size={18} color={t.accent} />}
              <Text style={{ color: t.accent, fontWeight: "800" }}>  Восстановить</Text>
            </Pressable>
          </View>
        </>
      )}

      <Pressable onPress={regenerate} style={{ marginTop: 22 }}>
        <Text style={{ color: t.red, textAlign: "center" }}>Создать новый код и ключ</Text>
      </Pressable>

      <Sheet visible={menu} title="Аватар" onClose={() => setMenu(false)} items={[
        { label: "Сделать фото", icon: <Ionicons name="camera-outline" size={20} color={t.text} />, onPress: () => changeAvatar("camera") },
        { label: "Выбрать из галереи", icon: <Ionicons name="images-outline" size={20} color={t.text} />, onPress: () => changeAvatar("library") },
        ...(p.avatar ? [{ label: "Вернуть канчиля", color: t.red, icon: <Ionicons name="trash-outline" size={20} color={t.red} />,
          onPress: () => { setProfile({ avatar: "" }); syncProfile().catch(() => {}); } }] : []),
      ]} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cam: { position: "absolute", right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 3 },
  label: { fontSize: 16, fontWeight: "800", marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 17 },
  codeRow: { flexDirection: "row", alignItems: "center" },
  hint: { fontSize: 13, marginTop: 6, lineHeight: 18, paddingHorizontal: 4 },
  h: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 26, marginBottom: 8, marginLeft: 4 },
  box: { borderRadius: 18, padding: 14 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 16 },
});
