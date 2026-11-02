import { requireOptionalNativeModule } from "expo";

type Native = { recognize(uri: string): Promise<string[]> };

/** Свой модуль распознавания (Android, встроенная модель ML Kit). На других платформах — null. */
export const KatacilOcr = requireOptionalNativeModule<Native>("KatacilOcr");
