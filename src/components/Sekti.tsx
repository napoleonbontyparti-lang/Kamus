import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { sektiSvg } from "./sektiSvg";
import { Text } from "./ui";
import { useTheme } from "../lib/theme";
import { sektiBalance } from "../lib/userdb";
import { useAchievements } from "../lib/achievements";

export function SektiIcon({ size = 18, dim }: { size?: number; dim?: boolean }) {
  const t = useTheme();
  return <SvgXml xml={sektiSvg({ ink: t.text, dim })} width={size} height={size} />;
}

/** Баланс Секти (обновляется после получения наград). */
export function SektiBalance({ size = 20 }: { size?: number }) {
  const t = useTheme();
  useAchievements(); // перерисовка после claim
  const n = sektiBalance();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: t.amberSoft, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}>
      <SektiIcon size={size} />
      <Text style={{ color: t.text, fontWeight: "900", fontSize: size * 0.85, marginLeft: 5 }}>{n.toLocaleString("ru")}</Text>
    </View>
  );
}

