import { NativeModules, Platform } from "react-native";

type NativeHydraICloudKVModule = {
  set(key: string, value: string): void;
  getString(key: string): string | null;
  remove(key: string): void;
  getAllKeys(): string[];
};

const nativeModule =
  NativeModules.HydraICloudKV as NativeHydraICloudKVModule | undefined;

function getNativeModule(): NativeHydraICloudKVModule | null {
  if (Platform.OS !== "ios") return null;
  return nativeModule ?? null;
}

function isAvailable(): boolean {
  return getNativeModule() !== null;
}

export const NativeICloudKV = {
  isAvailable,

  set(key: string, value: string): void {
    const module = getNativeModule();
    if (!module) return;
    module.set(key, value);
  },

  getString(key: string): string | null {
    const module = getNativeModule();
    if (!module) return null;
    return module.getString(key);
  },

  remove(key: string): void {
    const module = getNativeModule();
    if (!module) return;
    module.remove(key);
  },

  getAllKeys(): string[] {
    const module = getNativeModule();
    if (!module) return [];
    return module.getAllKeys();
  },
};
