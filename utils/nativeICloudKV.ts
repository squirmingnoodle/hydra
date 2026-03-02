import { NativeModules, Platform } from "react-native";

type NativeHydraICloudKVModule = {
  set(key: string, value: string): void;
  getString(key: string): string | null;
  remove(key: string): void;
  getAllKeys(): string[];
};

const nativeModule =
  NativeModules.HydraICloudKV as NativeHydraICloudKVModule | undefined;

function isAvailable(): nativeModule is NativeHydraICloudKVModule {
  return Platform.OS === "ios" && nativeModule !== undefined;
}

export const NativeICloudKV = {
  isAvailable,

  set(key: string, value: string): void {
    if (!isAvailable()) return;
    nativeModule!.set(key, value);
  },

  getString(key: string): string | null {
    if (!isAvailable()) return null;
    return nativeModule!.getString(key);
  },

  remove(key: string): void {
    if (!isAvailable()) return;
    nativeModule!.remove(key);
  },

  getAllKeys(): string[] {
    if (!isAvailable()) return [];
    return nativeModule!.getAllKeys();
  },
};
