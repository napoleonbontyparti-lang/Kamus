import { Tabs } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme";
import { claimableCount, refreshAchievements, useAchievements } from "../../lib/achievements";

export default function TabsLayout() {
  const t = useTheme();
  // Нижняя системная панель Android (жесты / кнопки) — поднимаем вкладки над ней
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const claimable = claimableCount(useAchievements());
  return (
    <Tabs
      screenListeners={{ focus: () => refreshAchievements() }}
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: {
          backgroundColor: t.card, borderTopWidth: 0,
          height: 58 + bottom, paddingTop: 6, paddingBottom: bottom,
          shadowColor: t.shadow, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -2 }, elevation: 8,
        },
        tabBarLabelStyle: { fontFamily: "Nunito_700Bold", fontSize: 11 },
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
        name="awards"
        options={{
          title: "Награды",
          headerShown: false,
          tabBarBadge: claimable > 0 ? claimable : undefined,
          tabBarBadgeStyle: { backgroundColor: t.red, fontFamily: "Nunito_800ExtraBold", fontSize: 11 },
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" color={color as string} size={size} />,
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
