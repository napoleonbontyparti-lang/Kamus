/**
 * Тренировки по колоде.
 *  flip       — интервальное повторение FSRS (карточка → оценка Снова/Трудно/Хорошо/Легко)
 *  choice-ir  — индонезийское слово → выбрать перевод из 4
 *  choice-ri  — перевод → выбрать индонезийское слово из 4
 *  write      — перевод → вписать слово
 *  affix      — корень + значение → вписать производную форму (mengadukan ← adu)
 *  truefalse  — пара слово/перевод: верно или нет, на скорость
 */
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput, Kancil } from "../../components/ui";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { randomGlosses } from "../../lib/dict";
import { normalize } from "../../lib/stemmer";
import {
  GRADES, cardsInDeck, logPractice, previewIntervals, review, studyQueue, type CardRow,
} from "../../lib/userdb";
import { useTheme, soft, type Theme } from "../../lib/theme";
import { Word } from "../../components/Word";

const TITLES: Record<string, string> = {
  flip: "Повторение", "choice-ir": "ID → RU", "choice-ri": "RU → ID",
  write: "Написание", affix: "Аффиксы", truefalse: "Верно/неверно",
};

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

const speak = (w: string) => { Speech.stop(); Speech.speak(w, { language: "id-ID", rate: 0.9 }); };

export default function StudyScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { deckId, mode = "flip" } = useLocalSearchParams<{ deckId: string; mode?: string }>();
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState({ ok: 0, bad: 0 });
  const [pool, setPool] = useState<{ w: string; d: string }[]>([]); // слова для дистракторов

  useEffect(() => {
    const id = Number(deckId);
    let q: CardRow[];
    if (mode === "flip") q = studyQueue(id);
    else {
      let all = cardsInDeck(id);
      if (mode === "affix") all = all.filter((c) => c.root && normalize(c.root) !== normalize(c.front));
      q = shuffle(all).slice(0, 20);
    }
    setQueue(q);
    const all = cardsInDeck(id).map((c) => ({ w: c.front, d: c.back }));
    if (all.length < 8) randomGlosses(db, 12).then((r) => setPool([...all, ...r]));
    else setPool(all);
  }, [deckId, mode, db]);

  const next = (correct: boolean) => {
    setScore((s) => correct ? { ...s, ok: s.ok + 1 } : { ...s, bad: s.bad + 1 });
    setPos((p) => p + 1);
  };

  if (!queue) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  const done = pos >= queue.length;
  const card = queue[pos];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: TITLES[mode] ?? "Тренировка" }} />
      {!done && (
        <View style={[styles.progress, { backgroundColor: t.faint }]}>
          <View style={{ width: `${(pos / Math.max(1, queue.length)) * 100}%`, height: "100%", backgroundColor: t.accent }} />
        </View>
      )}
      {done ? (
        <Done t={t} total={queue.length} score={score} mode={mode} />
      ) : mode === "flip" ? (
        <Flip key={card.id + ":" + pos} card={card} t={t} onDone={(again) => {
          // «Снова» — карточка вернётся в конце сессии
          if (again) setQueue((q) => q ? [...q, { ...card }] : q);
          next(!again);
        }} />
      ) : mode === "choice-ir" || mode === "choice-ri" ? (
        <Choice key={card.id + ":" + pos} card={card} pool={pool} reverse={mode === "choice-ri"} t={t} onDone={(ok) => { logPractice(card.id, ok, mode); next(ok); }} />
      ) : mode === "write" || mode === "affix" ? (
        <Write key={card.id + ":" + pos} card={card} affix={mode === "affix"} t={t} onDone={(ok) => { logPractice(card.id, ok, mode); next(ok); }} />
      ) : (
        <TrueFalse key={card.id + ":" + pos} card={card} pool={pool} t={t} onDone={(ok) => { logPractice(card.id, ok, mode); next(ok); }} />
      )}
    </View>
  );
}

// ───────── интервальное повторение ─────────

function Flip({ card, t, onDone }: { card: CardRow; t: Theme; onDone: (again: boolean) => void }) {
  const [shown, setShown] = useState(false);
  const iv = useMemo(() => previewIntervals(card), [card]);
  return (
    <View style={styles.flex}>
      <Pressable style={[styles.bigCard, { backgroundColor: t.card, borderColor: "transparent" }, soft(t)]} onPress={() => setShown(true)}>
        <Word form={card.front} root={card.root} style={[styles.front, { color: t.hw }]} />
        <Pressable hitSlop={10} onPress={() => speak(card.front)} style={{ marginTop: 8 }}>
          <Ionicons name="volume-medium-outline" size={26} color={t.accent} />
        </Pressable>
        {shown ? (
          <ScrollView style={{ maxHeight: 260, marginTop: 18, alignSelf: "stretch" }}>
            <View style={[styles.sep, { backgroundColor: t.faint }]} />
            <Text style={[styles.back, { color: t.text }]}>{card.back}</Text>
            {card.root && normalize(card.root) !== normalize(card.front) ? (
              <Text style={{ color: t.muted, textAlign: "center", marginTop: 8 }}>корень: {card.root}</Text>
            ) : null}
            {card.note ? <Text style={{ color: t.muted, textAlign: "center", marginTop: 6, fontStyle: "italic" }}>{card.note}</Text> : null}
            {card.entry_id ? (
              <Pressable onPress={() => router.push({ pathname: "/entry/[id]", params: { id: String(card.entry_id), sense: String(card.sense ?? 0) } })}>
                <Text style={{ color: t.accent, textAlign: "center", marginTop: 10 }}>Статья в словаре ›</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : (
          <Text style={{ color: t.muted, marginTop: 28 }}>Нажмите, чтобы увидеть перевод</Text>
        )}
      </Pressable>
      {shown ? (
        <View style={styles.grades}>
          {GRADES.map((g, i) => {
            const colors = [t.red, t.amber, t.green, t.accent];
            return (
              <Pressable key={g.grade} style={[styles.grade, { borderColor: colors[i] }]}
                onPress={() => { review(card, g.grade, "flip"); onDone(i === 0); }}>
                <Text style={{ color: colors[i], fontWeight: "700" }}>{g.label}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>{iv[g.grade]}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Pressable style={[styles.primary, { backgroundColor: t.accent }]} onPress={() => setShown(true)}>
          <Text style={styles.primaryText}>Показать ответ</Text>
        </Pressable>
      )}
    </View>
  );
}

// ───────── выбор из вариантов ─────────

function Choice({ card, pool, reverse, t, onDone }: {
  card: CardRow; pool: { w: string; d: string }[]; reverse: boolean; t: Theme; onDone: (ok: boolean) => void;
}) {
  const options = useMemo(() => {
    const right = reverse ? card.front : card.back;
    const others = shuffle(pool.filter((p) => p.w !== card.front)).map((p) => reverse ? p.w : p.d);
    const uniq = [...new Set(others.filter((o) => o && o !== right))].slice(0, 3);
    return shuffle([right, ...uniq]);
  }, [card, pool, reverse]);
  const right = reverse ? card.front : card.back;
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => { if (!reverse) speak(card.front); }, [card, reverse]);

  const pick = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === right;
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setTimeout(() => onDone(ok), ok ? 600 : 1500);
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.prompt, { backgroundColor: t.card, borderColor: t.card }, soft(t)]}>
        <Reaction state={picked ? picked === right : null} />
        <Text style={[reverse ? styles.back : styles.front, { color: reverse ? t.text : t.hw }]}>{reverse ? card.back : card.front}</Text>
      </View>
      <View style={{ gap: 10, padding: 16 }}>
        {options.map((o) => {
          const isRight = picked && o === right;
          const isWrong = picked === o && o !== right;
          return (
            <Pressable key={o} onPress={() => pick(o)} style={[styles.option, {
              backgroundColor: isRight ? t.greenSoft : isWrong ? t.redSoft : t.card,
              borderColor: isRight ? t.green : isWrong ? t.red : t.faint,
            }]}>
              <Text numberOfLines={3} style={{ color: reverse ? t.hw : t.text, fontSize: reverse ? 18 : 15, fontWeight: reverse ? "700" : "400" }}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ───────── написание / аффиксы ─────────

function Write({ card, affix, t, onDone }: { card: CardRow; affix: boolean; t: Theme; onDone: (ok: boolean) => void }) {
  const [val, setVal] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  const answer = card.front.replace(/[\[\]\(\)]/g, "");

  const check = () => {
    if (result !== null) return onDone(result);
    const ok = normalize(val) === normalize(answer) || normalize(val) === normalize(card.front);
    setResult(ok);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    speak(answer);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.prompt, { backgroundColor: t.card, borderColor: t.card, margin: 0 }, soft(t)]}>
        <Reaction state={result} />
        {affix ? (
          <>
            <Text style={{ color: t.muted, fontSize: 13 }}>КОРЕНЬ</Text>
            <Text style={[styles.front, { color: t.hw }]}>{card.root}</Text>
            <Text style={{ color: t.muted, fontSize: 13, marginTop: 12 }}>ОБРАЗУЙТЕ ФОРМУ СО ЗНАЧЕНИЕМ</Text>
          </>
        ) : null}
        <Text style={[styles.back, { color: t.text }]}>{card.back}</Text>
      </View>
      <TextInput
        autoFocus value={val} onChangeText={setVal} onSubmitEditing={check}
        editable={result === null} autoCapitalize="none" autoCorrect={false} returnKeyType="done"
        placeholder={affix ? "me…, ber…, -kan…" : "по-индонезийски"} placeholderTextColor={t.muted}
        style={[styles.answer, {
          color: t.text, backgroundColor: t.card,
          borderColor: result === null ? t.faint : result ? t.green : t.red,
        }]}
      />
      {result === false ? (
        <Text style={{ color: t.text, fontSize: 16, marginTop: 10 }}>
          Правильно: <Text style={{ color: t.green, fontWeight: "800" }}>{answer}</Text>
        </Text>
      ) : result ? (
        <Text style={{ color: t.green, fontSize: 16, marginTop: 10, fontWeight: "800" }}>Betul! Верно!</Text>
      ) : null}
      <Pressable style={[styles.primary, { backgroundColor: t.accent, marginHorizontal: 0 }]} onPress={check}>
        <Text style={styles.primaryText}>{result === null ? "Проверить" : "Дальше"}</Text>
      </Pressable>
      {result === null ? (
        <Pressable onPress={() => { setResult(false); speak(answer); }}>
          <Text style={{ color: t.muted, textAlign: "center", marginTop: 14 }}>Не знаю</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

// ───────── верно / неверно ─────────

function TrueFalse({ card, pool, t, onDone }: { card: CardRow; pool: { w: string; d: string }[]; t: Theme; onDone: (ok: boolean) => void }) {
  const pair = useMemo(() => {
    const truth = Math.random() < 0.5;
    if (truth) return { d: card.back, truth };
    const other = shuffle(pool.filter((p) => p.w !== card.front && p.d !== card.back))[0];
    return other ? { d: other.d, truth: false } : { d: card.back, truth: true };
  }, [card, pool]);
  const [res, setRes] = useState<null | boolean>(null);

  const answer = (says: boolean) => {
    if (res !== null) return;
    const ok = says === pair.truth;
    setRes(ok);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setTimeout(() => onDone(ok), ok ? 450 : 1600);
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.bigCard, {
        backgroundColor: res === null ? t.card : res ? t.greenSoft : t.redSoft, borderColor: "transparent",
      }, soft(t)]}>
        <Reaction state={res} />
        <Text style={[styles.front, { color: t.hw }]}>{card.front}</Text>
        <View style={[styles.sep, { backgroundColor: t.faint, alignSelf: "stretch", marginVertical: 18 }]} />
        <Text style={[styles.back, { color: t.text }]}>{pair.d}</Text>
        {res === false ? <Text style={{ color: t.text, marginTop: 14, textAlign: "center" }}>Правильный перевод: {card.back}</Text> : null}
      </View>
      <View style={styles.tf}>
        <Pressable style={[styles.tfBtn, { backgroundColor: t.redSoft }]} onPress={() => answer(false)}>
          <Ionicons name="close" size={30} color={t.red} />
        </Pressable>
        <Pressable style={[styles.tfBtn, { backgroundColor: t.greenSoft }]} onPress={() => answer(true)}>
          <Ionicons name="checkmark" size={30} color={t.green} />
        </Pressable>
      </View>
    </View>
  );
}

/** Маленький канчиль в углу карточки: радуется или грустит после ответа. */
function Reaction({ state }: { state: boolean | null }) {
  if (state === null) return null;
  return <Kancil mood={state ? "happy" : "sad"} size={58} style={{ position: "absolute", right: 8, top: 8 }} />;
}

function Done({ t, total, score, mode }: { t: Theme; total: number; score: { ok: number; bad: number }; mode: string }) {
  return (
    <View style={[styles.flex, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
      {(() => {
        const share = score.ok / Math.max(1, score.ok + score.bad);
        const mood = !total ? "sleep" : share >= 0.6 ? "yay" : "sad";
        const title = !total ? (mode === "flip" ? "На сегодня всё!" : "Нет карточек")
          : share >= 0.9 ? "Luar biasa!" : share >= 0.6 ? "Bagus!" : "Tidak apa-apa!";
        const sub = !total ? (mode === "flip" ? "Si Kancil спит. Приходи, когда подойдут новые повторения." : "")
          : share >= 0.6 ? "Отличная тренировка." : "Ошибки — часть учёбы. Повторим ещё разок?";
        return (
          <>
            <Kancil mood={mood} size={190} />
            <Text style={{ fontSize: 28, fontWeight: "900", color: t.text, marginTop: 6 }}>{title}</Text>
            {sub ? <Text style={{ color: t.muted, fontSize: 15, marginTop: 6, textAlign: "center" }}>{sub}</Text> : null}
          </>
        );
      })()}
      {total ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
          <View style={[styles.scoreBox, { backgroundColor: t.greenSoft }]}>
            <Text style={{ color: t.green, fontSize: 26, fontWeight: "900" }}>{score.ok}</Text>
            <Text style={{ color: t.green, fontWeight: "700" }}>верно</Text>
          </View>
          <View style={[styles.scoreBox, { backgroundColor: t.redSoft }]}>
            <Text style={{ color: t.red, fontSize: 26, fontWeight: "900" }}>{score.bad}</Text>
            <Text style={{ color: t.red, fontWeight: "700" }}>ошибок</Text>
          </View>
        </View>
      ) : null}
      <Pressable style={[styles.primary, { backgroundColor: t.accent, alignSelf: "stretch" }]} onPress={() => router.back()}>
        <Text style={styles.primaryText}>К колоде</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { height: 4, marginHorizontal: 16, borderRadius: 2, overflow: "hidden" },
  scoreBox: { alignItems: "center", paddingHorizontal: 26, paddingVertical: 10, borderRadius: 20 },
  bigCard: { flex: 1, margin: 16, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  prompt: { margin: 16, borderRadius: 26, borderWidth: 1, padding: 22, alignItems: "center" },
  front: { fontSize: 34, fontWeight: "900", textAlign: "center" },
  back: { fontSize: 18, lineHeight: 26, textAlign: "center" },
  sep: { height: 1, marginBottom: 14 },
  grades: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 30 },
  grade: { flex: 1, borderWidth: 2, borderRadius: 18, paddingVertical: 10, alignItems: "center", gap: 2 },
  primary: { margin: 16, marginBottom: 30, padding: 16, borderRadius: 24, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  option: { borderWidth: 2, borderRadius: 20, padding: 16 },
  answer: { marginTop: 16, borderWidth: 2, borderRadius: 22, padding: 14, fontSize: 22, textAlign: "center" },
  tf: { flexDirection: "row", gap: 16, padding: 16, paddingBottom: 34 },
  tfBtn: { flex: 1, height: 74, borderRadius: 26, alignItems: "center", justifyContent: "center" },
});
