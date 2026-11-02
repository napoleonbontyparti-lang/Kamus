/** Вибрация — только если пользователь включил её в настройках. */
import * as Haptics from "expo-haptics";
import { getVibration } from "./settings";

export function buzz(kind: "success" | "error" | "tap") {
  if (!getVibration()) return;
  if (kind === "tap") Haptics.selectionAsync();
  else Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
}
