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
  ): Promise<TranslationResult | null> {
    if (Platform.OS !== "ios" || !nativeModule) return null;
    try {
      return await nativeModule.translate(text, sourceLanguage ?? null);
    } catch {
      return null;
    }
  },
};
