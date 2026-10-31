/** Индонезийское слово с (необязательной) раскраской аффиксов. */
import type { StyleProp, TextStyle } from "react-native";
import { Text } from "./ui";
import { segment } from "../lib/affix";
import { useAffixColors } from "../lib/settings";

export function Word({ form, root, style, force }: {
  form: string; root?: string | null; style?: StyleProp<TextStyle>; force?: boolean;
}) {
  const c = useAffixColors();
  if (!(c.enabled || force) || !root) return <Text style={style}>{form}</Text>;
  const segs = segment(form, root);
  const color = { pre: c.pre, root: c.root, suf: c.suf, clitic: c.clitic, plain: "" };
  return (
    <Text style={style}>
      {segs.map((s, i) => color[s.k]
        ? <Text key={i} style={[style, { color: color[s.k] }]}>{s.t}</Text>
        : <Text key={i} style={style}>{s.t}</Text>)}
    </Text>
  );
}
