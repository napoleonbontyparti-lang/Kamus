/**
 * Копытце канчиля — метка «выучено / не выучено» (вместо кошачьей лапки).
 * Два полукопытца раздвоенного копыта; контур — нет метки, заливка — есть.
 */
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../lib/theme";
import { MARK_LEARNED, MARK_UNLEARNED } from "../lib/userdb";

export const HOOF_PATHS = [
  "M9.4 3 C6 6 3.6 10.5 3.6 15 C3.6 18.6 5.6 21 8 21 C9.6 21 10.4 20 10.4 18.4 L10.4 6 C10.4 4.6 10 3.6 9.4 3 Z",
  "M14.6 3 C18 6 20.4 10.5 20.4 15 C20.4 18.6 18.4 21 16 21 C14.4 21 13.6 20 13.6 18.4 L13.6 6 C13.6 4.6 14 3.6 14.6 3 Z",
];

export function Hoof({ size = 22, color, filled }: { size?: number; color: string; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {HOOF_PATHS.map((d, i) => (
        <Path key={i} d={d} fill={filled ? color : "none"} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** Цвет метки: выучено — бирюзовый, не выучено — янтарный (как в VoCat). */
export function useMarkColor(mark: number): string {
  const t = useTheme();
  return mark === MARK_LEARNED ? t.accent : mark === MARK_UNLEARNED ? t.amber : t.muted;
}

export const MARK_LABEL = ["без метки", "выучено", "не выучено"];

/** Кнопка-метка: нажатие переключает «нет → выучено → не выучено». */
export function HoofButton({ mark, onPress, size = 22, style }: {
  mark: number; onPress: () => void; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const color = useMarkColor(mark);
  return (
    <Pressable onPress={onPress} hitSlop={10} style={style}
      accessibilityLabel={`Метка: ${MARK_LABEL[mark]}`}>
      <Hoof size={size} color={color} filled={mark !== 0} />
    </Pressable>
  );
}
