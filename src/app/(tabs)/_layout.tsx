import { Tabs } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopWidth: 0, height: 64, paddingTop: 6, paddingBottom: 8,
          shadowColor: t.shadow, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
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
        name="more"
        options={{
          title: "Ещё",
          tabBarIcon: ({ color, size }) => <Ionicons name="paw-outline" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
