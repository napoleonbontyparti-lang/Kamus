import { Tabs } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  // Нижняя системная панель Android (жесты / кнопки) — поднимаем вкладки над ней
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: {
          backgroundColor: t.card, borderTopWidth: 0,
          height: 58 + bottom, paddingTop: 6, paddingBottom: bottom,
          shadowColor: t.shadow, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -2 }, elevation: 8,
        },
        tabBarLabelStyle: { fontFamily: "Nunito_700Bold", fontSize: 12 },
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: t.text, fontFamily: "Nunito_800ExtraBold", fontSize: 22 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Словарь",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: "Карточки",
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Календарь",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Настройки",
          headerTitle: "Настройки",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
