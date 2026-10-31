import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { Text } from "../../components/ui";
import { Stack, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { KBBI_URL } from "../../lib/dict";
import { useTheme } from "../../lib/theme";

/** Официальный KBBI daring прямо внутри приложения. Нужен интернет. */
export default function KbbiScreen() {
  const { word } = useLocalSearchParams<{ word: string }>();
  const t = useTheme();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const url = KBBI_URL(word ?? "");

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen
        options={{
          title: `KBBI: ${word}`,
          headerRight: () => (
            <Pressable hitSlop={8} onPress={() => Linking.openURL(url)}>
              <Ionicons name="open-outline" size={22} color={t.accent} />
            </Pressable>
          ),
        }}
      />
      {failed ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: t.text, fontSize: 16, lineHeight: 23 }}>
            Не удалось открыть KBBI. Проверьте интернет или откройте страницу в браузере (кнопка вверху справа).
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          onLoadEnd={() => setLoading(false)}
          onError={() => setFailed(true)}
          style={{ flex: 1 }}
        />
      )}
      {loading && !failed ? (
        <View style={{ position: "absolute", top: 20, left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : null}
    </View>
  );
}
