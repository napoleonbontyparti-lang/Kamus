/** Управление виджетом: включить/выключить, добавить на главный экран, сколько уже стоит. */
import { Platform } from "react-native";
import { getWidgetInfo, requestPinWidget } from "react-native-android-widget";
import { KatacilSystem } from "../../modules/katacil-system";
import { WIDGET_NAME, refreshWidget } from "./handler";

const CLASS = ".widget." + WIDGET_NAME; // ru.veronika.kamus.widget.Streak

export const widgetSupported = Platform.OS === "android" && !!KatacilSystem;

export function isWidgetEnabled(): boolean {
  try { return KatacilSystem?.isComponentEnabled(CLASS) ?? false; } catch { return true; }
}

export function setWidgetEnabled(on: boolean) {
  KatacilSystem?.setComponentEnabled(CLASS, on);
  if (on) setTimeout(refreshWidget, 500);
}

export async function placedWidgets(): Promise<number> {
  if (!widgetSupported) return 0;
  try { return (await getWidgetInfo(WIDGET_NAME)).length; } catch { return 0; }
}

/** Системное окно «Добавить виджет на главный экран» (Android 8+, если лаунчер поддерживает). */
export async function pinWidget(): Promise<boolean> {
  if (!widgetSupported) return false;
  if (!isWidgetEnabled()) setWidgetEnabled(true);
  try { return await requestPinWidget({ widgetName: WIDGET_NAME }); } catch { return false; }
}
