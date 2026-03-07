import { NativeModules, Platform } from "react-native";

type LanguageDetection = {
  language: string | null;
  isDeviceLanguage: boolean;
  confidence: number;
};

type TranslationResult = {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
};

type NativeHydraTranslationModule = {
  detectLanguage(text: string): Promise<LanguageDetection>;
  translate(
    text: string,
    sourceLanguage: string | null,
  ): Promise<TranslationResult>;
  isAvailable(): Promise<boolean>;
};

const nativeModule =
  NativeModules.HydraTranslation as NativeHydraTranslationModule | undefined;

export const NativeTranslation = {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios" || !nativeModule) return false;
    try {
      return await nativeModule.isAvailable();
    } catch {
      return false;
    }
  },

  async detectLanguage(text: string): Promise<LanguageDetection | null> {
    if (Platform.OS !== "ios" || !nativeModule) return null;
    try {
      return await nativeModule.detectLanguage(text);
    } catch {
      return null;
    }
  },

  async translate(
    text: string,
    sourceLanguage?: string | null,
  ): Promise<{ result: TranslationResult } | { error: string }> {
    if (Platform.OS !== "ios" || !nativeModule)
      return { error: "Translation not available" };
    try {
      const result = await nativeModule.translate(
        text,
        sourceLanguage ?? null,
      );
      return { result };
    } catch (e: any) {
      return { error: e?.message ?? "Translation failed" };
    }
  },
};
