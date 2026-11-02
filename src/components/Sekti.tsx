import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { sektiSvg, SEKTI_BLUE } from "./sektiSvg";
export { SEKTI_BLUE };
import { Text } from "./ui";
import { useTheme } from "../lib/theme";
import { sektiBalance } from "../lib/userdb";
import { useAchievements } from "../lib/achievements";

export function SektiIcon({ size = 18, dim, white }: { size?: number; dim?: boolean; white?: boolean }) {
  return <SvgXml xml={sektiSvg(white ? { fill: "#FFFFFF", ink: "#FFFFFF" } : { dim })} width={size} height={size} />;
}

/** Баланс Секти (обновляется после получения наград). */
export function SektiBalance({ size = 20 }: { size?: number }) {
  const t = useTheme();
  useAchievements(); // перерисовка после claim
  const n = sektiBalance();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: t.bg === "#FFF8EE" ? "#E3ECFF" : "#14264D", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}>
      <SektiIcon size={size} />
      <Text style={{ color: t.text, fontWeight: "900", fontSize: size * 0.85, marginLeft: 5 }}>{n.toLocaleString("ru")}</Text>
    </View>
  );
}

