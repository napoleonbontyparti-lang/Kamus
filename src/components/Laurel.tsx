/**
 * Иконка достижения в лавровом венке: линейные иконки индонезийской культуры
 * (меру, франжипани, ваянг, комодо, гамелан, сонгкет) и иконки канчиля.
 * Цветная — если уровень получен, серая — пока нет. Пропорции иконок не меняются.
 */
import { Image, View } from "react-native";
import { SvgXml } from "react-native-svg";

export const ACH_ICONS = {
  meru: require("../../assets/achievements/meru.png"),
  kamboja: require("../../assets/achievements/kamboja.png"),
  wayang: require("../../assets/achievements/wayang.png"),
  komodo: require("../../assets/achievements/komodo.png"),
  gamelan: require("../../assets/achievements/gamelan.png"),
  songket: require("../../assets/achievements/songket.png"),
  "api-biru": require("../../assets/achievements/api-biru.png"),
  kuku: require("../../assets/achievements/kuku.png"),
  mata: require("../../assets/achievements/mata.png"),
  teman: require("../../assets/achievements/teman.png"),
  kancil: require("../../assets/achievements/kancil.png"),
} as const;

export type AchIcon = keyof typeof ACH_ICONS;

function wreathSvg(leaf: string): string {
  const leaves: string[] = [];
  for (let k = 0; k < 6; k++) {
    const deg = 122 + k * 21;
    const a = (deg * Math.PI) / 180;
    const x = 50 + 44 * Math.cos(a), y = 50 + 44 * Math.sin(a);
    const rot = deg + 18;
    leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="8" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${leaf}"/>`);
    leaves.push(`<ellipse cx="${(100 - x).toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="8" transform="rotate(${(-rot).toFixed(0)} ${(100 - x).toFixed(1)} ${y.toFixed(1)})" fill="${leaf}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M27 88 A44 44 0 0 1 17 20" stroke="${leaf}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M73 88 A44 44 0 0 0 83 20" stroke="${leaf}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${leaves.join("")}
  </svg>`;
}

export function Laurel({ size = 76, color, active, icon }: { size?: number; color: string; active: boolean; icon: AchIcon }) {
  const ink = active ? color : "#B9B1A6";
  const leaf = active ? color + "88" : "#DDD6CC";
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <SvgXml xml={wreathSvg(leaf)} width={size} height={size} style={{ position: "absolute" }} />
      <Image source={ACH_ICONS[icon]} style={{ width: size * 0.6, height: size * 0.6, tintColor: ink }} resizeMode="contain" />
    </View>
  );
}
