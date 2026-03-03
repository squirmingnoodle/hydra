import { NativeModules, Platform } from "react-native";

type CookieDict = {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  expires?: string;
};

type NativeHydraCookiesModule = {
  hasSessionCookie(): Promise<boolean>;
  persistSessionCookie(): Promise<void>;
  clearSessionCookies(): Promise<void>;
  getSessionCookieValue(): Promise<CookieDict | null>;
  setSessionCookie(cookie: CookieDict): Promise<void>;
};

const nativeModule =
  NativeModules.HydraCookies as NativeHydraCookiesModule | undefined;

function getNativeModule(): NativeHydraCookiesModule | null {
  if (Platform.OS !== "ios") return null;
  return nativeModule ?? null;
}

function isAvailable(): boolean {
  return getNativeModule() !== null;
}

export const NativeCookies = {
  isAvailable,

  async hasSessionCookie(): Promise<boolean | null> {
    const module = getNativeModule();
    if (!module) return null;
    try {
      return await module.hasSessionCookie();
    } catch {
      return null;
    }
  },

  async persistSessionCookie(): Promise<boolean> {
    const module = getNativeModule();
    if (!module) return false;
    try {
      await module.persistSessionCookie();
      return true;
    } catch {
      return false;
    }
  },

  async clearSessionCookies(): Promise<boolean> {
    const module = getNativeModule();
    if (!module) return false;
    try {
      await module.clearSessionCookies();
      return true;
    } catch {
      return false;
    }
  },

  async getSessionCookieValue(): Promise<CookieDict | null> {
    const module = getNativeModule();
    if (!module) return null;
    try {
      return await module.getSessionCookieValue();
    } catch {
      return null;
    }
  },

  async setSessionCookie(cookie: CookieDict): Promise<boolean> {
    const module = getNativeModule();
    if (!module) return false;
    try {
      await module.setSessionCookie(cookie);
      return true;
    } catch {
      return false;
    }
  },
};
