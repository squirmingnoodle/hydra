import { NativeModules, Platform } from "react-native";

type SharedContent = {
  url?: string;
  text?: string;
  type: "link" | "text";
};

type NativeHydraShareDataModule = {
  getSharedContent(): Promise<SharedContent | null>;
  clearSharedContent(): Promise<void>;
};

const nativeModule =
  NativeModules.HydraShareData as NativeHydraShareDataModule | undefined;

function isAvailable(): boolean {
  return Platform.OS === "ios" && nativeModule != null;
}

export const NativeShareData = {
  isAvailable,

  async getSharedContent(): Promise<SharedContent | null> {
    if (!isAvailable()) return null;
    try {
      return await nativeModule!.getSharedContent();
    } catch {
      return null;
    }
  },

  async clearSharedContent(): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.clearSharedContent();
    } catch {
      // Silently fail
    }
  },
};
