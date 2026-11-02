/** Медаль в лавровом венке (как в примере): цвет — у полученных уровней, серый — пока нет. */
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

function laurelSvg(color: string, leaf: string): string {
  const leaves: string[] = [];
  // левая ветвь — дуга от низа (120°) к верху-слева (230°); правая — зеркально
  for (let k = 0; k < 6; k++) {
    const deg = 122 + k * 21;
    const a = (deg * Math.PI) / 180;
    const x = 50 + 38 * Math.cos(a), y = 52 + 38 * Math.sin(a);
    const rot = deg + 18;
    leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.6" ry="9" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${leaf}"/>`);
    leaves.push(`<ellipse cx="${(100 - x).toFixed(1)}" cy="${y.toFixed(1)}" rx="4.6" ry="9" transform="rotate(${(-rot).toFixed(0)} ${(100 - x).toFixed(1)} ${y.toFixed(1)})" fill="${leaf}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M30 86 A38 38 0 0 1 22 22" stroke="${leaf}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M70 86 A38 38 0 0 0 78 22" stroke="${leaf}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${leaves.join("")}
    <path d="M41 66 L36 90 L45 85 L50 92 L52 70 Z" fill="${color}" opacity=".8"/>
    <path d="M59 66 L64 90 L55 85 L50 92 L48 70 Z" fill="${color}" opacity=".8"/>
    <circle cx="50" cy="50" r="22" fill="${color}"/>
    <circle cx="50" cy="50" r="16.5" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".55"/>
  </svg>`;
}

export function Laurel({ size = 76, color, active, icon }: { size?: number; color: string; active: boolean; icon: string }) {
  const c = active ? color : "#C9C2B8";
  const leaf = active ? color + "99" : "#D8D2C9"; // листья светлее медали
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <SvgXml xml={laurelSvg(c, leaf)} width={size} height={size} style={{ position: "absolute" }} />
      <Ionicons name={icon as any} size={size * 0.24} color="#fff" style={{ marginBottom: size * 0.0 }} />
    </View>
  );
}
