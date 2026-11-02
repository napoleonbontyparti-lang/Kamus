/** Фото: камера / галерея, обрезка, уменьшение (для аватара и распознавания текста). */
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export type Source = "camera" | "library";

/** Возвращает uri выбранного (и обрезанного пользователем) изображения или null. */
export async function pickImage(source: Source, opts: { square?: boolean; quality?: number } = {}): Promise<string | null> {
  const perm = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Нет доступа", source === "camera"
      ? "Разрешите приложению доступ к камере в настройках телефона."
      : "Разрешите приложению доступ к фото в настройках телефона.");
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true, // пользователь сам выделяет нужный фрагмент — как в Pleco
    ...(opts.square ? { aspect: [1, 1] as [number, number] } : {}),
    quality: opts.quality ?? 0.9,
  };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0].uri;
}

/** Маленький квадратный аватар в base64 (≈5–10 КБ) — хранится в профиле и на сервере. */
export async function toAvatar(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 160, height: 160 }).renderAsync();
  const out = await ref.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  return `data:image/jpeg;base64,${out.base64}`;
}

/** Уменьшение крупного фото перед распознаванием — быстрее и не хуже по качеству. */
export async function shrinkForOcr(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
  return out.uri;
}
