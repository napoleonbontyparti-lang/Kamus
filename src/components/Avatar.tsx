import { Image, View } from "react-native";
import { Kancil, Text } from "./ui";
import { useTheme } from "../lib/theme";

/** Круглый аватар: фото пользователя или канчиль по умолчанию. */
export function Avatar({ uri, size = 56, nick }: { uri?: string; size?: number; nick?: string }) {
  const t = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2, overflow: "hidden" as const, backgroundColor: t.accentSoft,
    alignItems: "center" as const, justifyContent: "center" as const };
  if (uri) return <View style={box}><Image source={{ uri }} style={{ width: size, height: size }} /></View>;
  if (nick && size < 44) {
    return <View style={box}><Text style={{ color: t.accent, fontWeight: "900", fontSize: size * 0.42 }}>{nick.slice(0, 1).toUpperCase()}</Text></View>;
  }
  return <View style={box}><Kancil mood="hello" size={size * 1.15} style={{ marginTop: size * 0.12 }} /></View>;
}
