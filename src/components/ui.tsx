/**
 * Базовые компоненты оформления: Text/TextInput со шрифтом Nunito,
 * маскот Si Kancil, «облачко» реплики.
 */
import { forwardRef, useMemo } from "react";
import {
  StyleSheet, Text as RNText, TextInput as RNTextInput, View,
  type TextInputProps, type TextProps, type TextStyle, type ViewStyle, type StyleProp,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { kancilSvg, type Mood } from "./kancilSvg";
import { useTheme } from "../lib/theme";
import { Bob } from "./anim";

const FAMILY: Record<string, string> = {
  "400": "Nunito_400Regular", "500": "Nunito_600SemiBold", "600": "Nunito_600SemiBold",
  "700": "Nunito_700Bold", "800": "Nunito_800ExtraBold", "900": "Nunito_900Black",
};
const ITALIC: Record<string, string> = {
  "400": "Nunito_400Regular_Italic", "500": "Nunito_600SemiBold_Italic", "600": "Nunito_600SemiBold_Italic",
  "700": "Nunito_700Bold_Italic", "800": "Nunito_800ExtraBold_Italic", "900": "Nunito_900Black_Italic",
};

/** Подставляет нужное начертание Nunito вместо fontWeight/fontStyle (иначе Android «теряет» шрифт). */
function withFont(style: StyleProp<TextStyle>, inheritDefault: boolean): StyleProp<TextStyle> {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  if (flat.fontFamily) return style;
  const hasW = flat.fontWeight != null;
  const hasI = flat.fontStyle === "italic";
  if (!hasW && !hasI && !inheritDefault) return style; // вложенный текст наследует шрифт родителя
  const w = String(flat.fontWeight ?? "400").replace("bold", "700").replace("normal", "400");
  const fam = (hasI ? ITALIC : FAMILY)[w] ?? FAMILY["400"];
  const { fontWeight, fontStyle, ...rest } = flat;
  return [rest, { fontFamily: fam }];
}

export function Text(props: TextProps & { nested?: boolean }) {
  return <RNText {...props} style={withFont(props.style, !props.nested)} />;
}

export const TextInput = forwardRef<React.ComponentRef<typeof RNTextInput>, TextInputProps>(function TI(props, ref) {
  return <RNTextInput ref={ref} {...props} style={withFont(props.style, true)} />;
});

export function Kancil({ mood = "hello", size = 140, style }: { mood?: Mood; size?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const xml = useMemo(() => kancilSvg(mood, { ink: t.text, fill: t.card, accent: t.accent }), [mood, t]);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

/** Канчиль с репликой в облачке. */
export function KancilSays({ mood, title, text, size = 120, children }: {
  mood: Mood; title?: string; text?: string; size?: number; children?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.says}>
      <Bob amount={3} period={2800}><Kancil mood={mood} size={size} /></Bob>
      <View style={[styles.bubble, { backgroundColor: t.card, borderColor: t.faint, shadowColor: t.shadow }]}>
        <View style={[styles.tail, { backgroundColor: t.card, borderColor: t.faint }]} />
        {title ? <Text style={[styles.bTitle, { color: t.accent }]}>{title}</Text> : null}
        {text ? <Text style={[styles.bText, { color: t.text }]}>{text}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  says: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  bubble: {
    flex: 1, marginLeft: 6, padding: 14, borderRadius: 20, borderWidth: 1,
    shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  tail: {
    position: "absolute", left: -7, top: "50%", width: 14, height: 14, marginTop: -7,
    transform: [{ rotate: "45deg" }], borderLeftWidth: 1, borderBottomWidth: 1,
  },
  bTitle: { fontSize: 17, fontWeight: "800", marginBottom: 3 },
  bText: { fontSize: 14.5, lineHeight: 20 },
});
