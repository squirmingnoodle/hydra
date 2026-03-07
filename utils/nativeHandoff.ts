import { NativeModules, Platform } from "react-native";

type NativeHydraHandoffModule = {
  setActivity(
    activityType: string,
    title: string,
    webURL: string | null,
  ): Promise<void>;
  clearActivity(): Promise<void>;
};

const nativeModule =
  NativeModules.HydraHandoff as NativeHydraHandoffModule | undefined;

function isAvailable(): boolean {
  return Platform.OS === "ios" && nativeModule != null;
}

export const NativeHandoff = {
  isAvailable,

  async setActivity(
    activityType: string,
    title: string,
    webURL?: string | null,
  ): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.setActivity(activityType, title, webURL ?? null);
    } catch {
      // Silently fail
    }
  },

  async clearActivity(): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.clearActivity();
    } catch {
      // Silently fail
    }
  },
};
