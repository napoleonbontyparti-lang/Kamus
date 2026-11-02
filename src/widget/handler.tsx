/** Обработчик виджета (запускается Android в фоне, без открытого приложения). */
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { requestWidgetUpdate } from "react-native-android-widget";
import { Platform } from "react-native";
import { StreakWidget, type WidgetData } from "./StreakWidget";
import { stats, wordsToday } from "../lib/userdb";
import { getDailyGoal, getThemeMode } from "../lib/settings";

export const WIDGET_NAME = "Streak";

function data(): WidgetData {
  let streak = 0, today = 0;
  try { streak = stats().streak; today = wordsToday(); } catch { /* база ещё не создана */ }
  const goal = getDailyGoal();
  return { streak, today, goal: goal.enabled ? goal.count : null, dark: getThemeMode() === "dark" };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
    case "WIDGET_CLICK":
      props.renderWidget(<StreakWidget {...data()} />);
      break;
    default:
      break;
  }
}

/** Обновить виджет из приложения (после тренировки, при сворачивании). */
export function refreshWidget() {
  if (Platform.OS !== "android") return;
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <StreakWidget {...data()} />, widgetNotFound: () => {} })
    .catch(() => {});
}
