import { Suspense, useEffect } from "react";
import { AppState } from "react-native";
import { refreshWidget } from "../widget/handler";
import { syncProfile } from "../lib/cloud";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider, deleteDatabaseSync } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import {
  useFonts, Nunito_400Regular, Nunito_400Regular_Italic, Nunito_600SemiBold, Nunito_600SemiBold_Italic,
  Nunito_700Bold, Nunito_700Bold_Italic, Nunito_800ExtraBold, Nunito_800ExtraBold_Italic,
  Nunito_900Black, Nunito_900Black_Italic,
} from "@expo-google-fonts/nunito";
import { Kancil, Text } from "../components/ui";
import { useTheme, useIsDark } from "../lib/theme";
import { userDb } from "../lib/userdb";

// Имя файла меняется вместе с версией словаря — тогда новая база копируется заново.
const DICT_DB = "dictionary-v2.db";

/** Старые версии базы словаря больше не нужны — освобождаем ~25 МБ. */
let cleaned = false;
function cleanupOldDictionaries() {
  if (cleaned) return;
  cleaned = true;
  for (const old of ["dictionary-v1.db"]) {
    try { deleteDatabaseSync(old); } catch { /* файла нет — ничего страшного */ }
  }
}

function Loading({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
      <Kancil mood="sleep" size={170} />
      <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
      <Text style={{ marginTop: 10, color: t.muted }}>{text}</Text>
    </View>
  );
}

export default function RootLayout() {
  const t = useTheme();
  const dark = useIsDark();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular, Nunito_400Regular_Italic, Nunito_600SemiBold, Nunito_600SemiBold_Italic,
    Nunito_700Bold, Nunito_700Bold_Italic, Nunito_800ExtraBold, Nunito_800ExtraBold_Italic,
    Nunito_900Black, Nunito_900Black_Italic,
  });
  userDb(); // создать таблицы пользователя при старте
  cleanupOldDictionaries();
  // при сворачивании приложения — обновить виджет и рейтинг
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") { refreshWidget(); syncProfile().catch(() => {}); }
    });
    return () => sub.remove();
  }, []);
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  return (
    <Suspense fallback={<Loading text="Si Kancil раскладывает словарь…" />}>
      <SQLiteProvider
        databaseName={DICT_DB}
        assetSource={{ assetId: require("../../assets/dictionary-v2.db") }}
        options={{ useNewConnection: false }}
        useSuspense
      >
        <StatusBar style={dark ? "light" : "dark"} />
        <NavigationBar style={dark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.bg },
            headerShadowVisible: false,
            headerTintColor: t.accent,
            headerTitleStyle: { color: t.text, fontFamily: "Nunito_800ExtraBold" },
            contentStyle: { backgroundColor: t.bg },
            headerBackTitle: "Назад",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="entry/[id]" options={{ title: "" }} />
          <Stack.Screen name="kbbi/[word]" options={{ title: "KBBI" }} />
          <Stack.Screen name="deck/[id]" options={{ title: "Колода" }} />
          <Stack.Screen name="study/[deckId]" options={{ title: "Тренировка" }} />
          <Stack.Screen name="card/[id]" options={{ title: "Карточка", presentation: "modal" }} />
          <Stack.Screen name="edit-entry/[id]" options={{ title: "Правка статьи", presentation: "modal" }} />
          <Stack.Screen name="ocr" options={{ title: "Поиск по фото" }} />
          <Stack.Screen name="settings/profile" options={{ title: "Профиль" }} />
          <Stack.Screen name="settings/friends" options={{ title: "Друзья и рейтинг" }} />
          <Stack.Screen name="settings/affix" options={{ title: "Цветные аффиксы" }} />
          <Stack.Screen name="settings/about" options={{ title: "О словаре" }} />
          <Stack.Screen name="settings/edits" options={{ title: "Исправленные статьи" }} />
        </Stack>
      </SQLiteProvider>
    </Suspense>
  );
}
