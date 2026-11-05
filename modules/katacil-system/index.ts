import { requireOptionalNativeModule } from "expo";

type Native = {
  isComponentEnabled(classSuffix: string): boolean;
  setComponentEnabled(classSuffix: string, enabled: boolean): boolean;
};

/** Включение/выключение компонентов Android (виджет). На других платформах — null. */
export const KatacilSystem = requireOptionalNativeModule<Native>("KatacilSystem");
