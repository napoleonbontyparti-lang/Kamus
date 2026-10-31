import { useColorScheme } from "react-native";

/** Тёплая «джунглевая» палитра: кремовый фон, бирюза, шерсть канчиля. */
const light = {
  bg: "#FFF8EE",
  card: "#FFFFFF",
  text: "#3A2A1E",
  muted: "#9A8574",
  faint: "#F1E4D3",
  accent: "#2E7D74", // бирюза джунглей
  accentSoft: "#DDF0EC",
  red: "#D9534F",
  redSoft: "#FDE3DF",
  green: "#3E9B5F",
  greenSoft: "#E0F3E5",
  amber: "#D9962B",
  amberSoft: "#FDF0D8",
  hw: "#9A5A28", // заглавные слова — цвет шерсти канчиля
  shadow: "#B98A5A",
  radius: 20,
};

const dark: typeof light = {
  bg: "#1D1813",
  card: "#28211B",
  text: "#F3E9DD",
  muted: "#B4A08C",
  faint: "#3A3027",
  accent: "#6CC4B7",
  accentSoft: "#1F3B37",
  red: "#F2877E",
  redSoft: "#41241F",
  green: "#7CCB95",
  greenSoft: "#203A28",
  amber: "#F0BA5C",
  amberSoft: "#3E2F18",
  hw: "#E7A86C",
  shadow: "#000000",
  radius: 20,
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

/** Мягкая тень для карточек. */
export const soft = (t: Theme) => ({
  shadowColor: t.shadow, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
});
