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

function isAvailable(): nativeModule is NativeHydraCookiesModule {
  return Platform.OS === "ios" && nativeModule !== undefined;
}

export const NativeCookies = {
  isAvailable,

  async hasSessionCookie(): Promise<boolean | null> {
    if (!isAvailable()) return null;
    try { return await nativeModule!.hasSessionCookie(); }
    catch { return null; }
  },

  async persistSessionCookie(): Promise<boolean> {
    if (!isAvailable()) return false;
    try { await nativeModule!.persistSessionCookie(); return true; }
    catch { return false; }
  },

  async clearSessionCookies(): Promise<boolean> {
    if (!isAvailable()) return false;
    try { await nativeModule!.clearSessionCookies(); return true; }
    catch { return false; }
  },

  async getSessionCookieValue(): Promise<CookieDict | null> {
    if (!isAvailable()) return null;
    try { return await nativeModule!.getSessionCookieValue(); }
    catch { return null; }
  },

  async setSessionCookie(cookie: CookieDict): Promise<boolean> {
    if (!isAvailable()) return false;
    try { await nativeModule!.setSessionCookie(cookie); return true; }
    catch { return false; }
  },
};
