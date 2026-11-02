/** Виджет на главный экран: канчиль, синий огонёк и дни подряд (+ прогресс цели). */
import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import { kancilSvg, type Mood } from "../components/kancilSvg";
import { blueFlameSvg } from "../components/blueFlameSvg";

export type WidgetData = { streak: number; today: number; goal: number | null; dark: boolean };

function plural(n: number) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день подряд";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "дня подряд";
  return "дней подряд";
}

export function StreakWidget({ streak, today, goal, dark }: WidgetData) {
  const bg = dark ? "#28211B" : "#FFF8EE";
  const ink = dark ? "#F3E9DD" : "#3A2A1E";
  const muted = dark ? "#B4A08C" : "#9A8574";
  const goalDone = goal !== null && today >= goal;
  const mood: Mood = goalDone ? "yay" : streak > 0 ? "hello" : "sleep";
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", backgroundColor: bg, borderRadius: 24,
        padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
    >
      <SvgWidget svg={kancilSvg(mood, { ink, fill: dark ? "#28211B" : "#FFFFFF", accent: dark ? "#6CC4B7" : "#2E7D74" })}
        style={{ height: 86, width: 86 }} />
      <FlexWidget style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", paddingLeft: 4 }}>
        <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
          <SvgWidget svg={blueFlameSvg(streak > 0)} style={{ height: 34, width: 34 }} />
          <TextWidget text={String(streak)}
            style={{ fontSize: 34, color: streak > 0 ? "#1E5BD8" : muted, fontFamily: "Nunito_900Black", marginLeft: 2 }} />
        </FlexWidget>
        <TextWidget text={plural(streak)} style={{ fontSize: 13, color: ink, fontFamily: "Nunito_700Bold" }} />
        {goal !== null ? (
          <TextWidget text={goalDone ? "цель выполнена ✓" : `сегодня ${Math.min(today, goal)}/${goal}`}
            style={{ fontSize: 12, color: goalDone ? "#3E9B5F" : muted, fontFamily: "Nunito_700Bold", marginTop: 2 }} />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
