/**
 * Отрисовка толкования из словаря Коригодского:
 * — нумерованные значения с новой строки,
 * — фразеология после ◊ — списком, индонезийская часть жирным,
 * — «~» заменяется на заглавное слово,
 * — пометы (разг., юр., ист.) курсивом,
 * — «см. X» — ссылка на статью X.
 */
import { Fragment } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./ui";
import { useTheme } from "../lib/theme";

type Props = { text: string; word: string; onLink?: (w: string) => void; compact?: boolean };

const CYR = /[а-яё]/i;
const LABEL = /^(?:[а-яё]{1,8}\.|[а-яё]{2,8}-л\.|англ|араб|голл|нидер|санскр|спорт|кит)(?:,)?$/i;

export function Definition({ text, word, onLink, compact }: Props) {
  const t = useTheme();
  if (!text) return null;
  const [main, ...phr] = text.split(/\s*◊\s*/);
  const meanings = main.split(/\s(?=(?:\d{1,2}|[IVX]{1,3})[.)]\s)/).filter(Boolean);
  const phrases = phr.join("; ").split(/;\s+(?=~|\(|[a-z])/i).map((s) => s.trim()).filter(Boolean);

  return (
    <View>
      {meanings.map((m, i) => (
        <Text key={i} style={[styles.line, { color: t.text }, compact && styles.compact]}>
          <Inline text={m} word={word} onLink={onLink} />
        </Text>
      ))}
      {phrases.length > 0 && (
        <View style={[styles.phrases, { borderLeftColor: t.faint }]}>
          {phrases.map((p, i) => <Phrase key={i} text={p} word={word} onLink={onLink} />)}
        </View>
      )}
    </View>
  );
}

function Phrase({ text, word, onLink }: { text: string; word: string; onLink?: (w: string) => void }) {
  const t = useTheme();
  // индонезийская часть — до первого русского слова (пометы не считаются)
  const toks = text.split(" ");
  let cut = toks.length;
  for (let i = 0; i < toks.length; i++) {
    if (CYR.test(toks[i]) && !LABEL.test(toks[i])) { cut = i; break; }
  }
  // пометы перед переводом остаются в русской части
  while (cut > 0 && LABEL.test(toks[cut - 1])) cut--;
  const indo = toks.slice(0, cut).join(" ").replace(/~/g, word);
  const ru = toks.slice(cut).join(" ");
  return (
    <Text style={[styles.phrase, { color: t.text }]}>
      <Text style={{ fontWeight: "700", color: t.hw }}>{indo}</Text>
      {ru ? " " : ""}
      <Inline text={ru} word={word} onLink={onLink} />
    </Text>
  );
}

function Inline({ text, word, onLink }: { text: string; word: string; onLink?: (w: string) => void }) {
  const t = useTheme();
  const parts = text.split(/(\s+)/);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^\s+$/.test(p) || !p) { out.push(p); continue; }
    if (p === "~" || p.startsWith("~")) {
      out.push(<Text key={i} style={{ fontWeight: "700", color: t.hw }}>{p.replace(/~/g, word)}</Text>);
    } else if (/^(?:\d{1,2}|[IVX]{1,3})[.)]$/.test(p)) {
      out.push(<Text key={i} style={{ fontWeight: "700", color: t.accent }}>{p}</Text>);
    } else if (p === "‖") {
      out.push(<Text key={i} style={{ color: t.muted }}>‖</Text>);
    } else if ((p === "см." || p === "тж.") && i + 2 < parts.length && !CYR.test(parts[i + 2])) {
      // ссылка: «см. hafal» — следующий латинский токен кликабелен
      const target = parts[i + 2].replace(/[;,.]+$/, "");
      const tail = parts[i + 2].slice(target.length);
      out.push(<Text key={i} style={{ fontStyle: "italic", color: t.muted }}>{p}</Text>, parts[i + 1]);
      out.push(
        <Text key={i + "l"} style={{ color: t.accent, textDecorationLine: "underline", fontWeight: "600" }}
          onPress={onLink ? () => onLink(target) : undefined}>{target}</Text>, tail);
      i += 2;
    } else if (LABEL.test(p)) {
      out.push(<Text key={i} style={{ fontStyle: "italic", color: t.muted }}>{p}</Text>);
    } else if (!CYR.test(p) && /[a-z]/i.test(p)) {
      out.push(<Text key={i} style={{ color: t.hw }}>{p}</Text>);
    } else {
      out.push(<Fragment key={i}>{p}</Fragment>);
    }
  }
  return <>{out}</>;
}

/** Короткое толкование для карточки: первые значения без фразеологии. */
export function shortGloss(text: string, max = 160): string {
  const main = text.split(/\s*◊\s*/)[0].replace(/\s*‖\s*/g, "; ").trim();
  return main.length > max ? main.slice(0, max).replace(/\s+\S*$/, "") + "…" : main;
}

const styles = StyleSheet.create({
  line: { fontSize: 16, lineHeight: 23, marginBottom: 3 },
  compact: { fontSize: 14, lineHeight: 19, marginBottom: 0 },
  phrases: { marginTop: 6, paddingLeft: 10, borderLeftWidth: 3 },
  phrase: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
});
