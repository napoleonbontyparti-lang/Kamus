/** Отправка файла через системное меню «Поделиться» (Google Диск, Telegram, почта…). */
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function shareText(name: string, content: string, mimeType = "text/plain", dialogTitle?: string) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.writeSync(content);
  await Sharing.shareAsync(f.uri, { mimeType, dialogTitle });
}
