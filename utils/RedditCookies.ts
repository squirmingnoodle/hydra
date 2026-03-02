import CookieManager from "@react-native-cookies/cookies";
import * as SecureStore from "expo-secure-store";
import { NativeCookies } from "./nativeCookies";

export default class RedditCookies {
  static async restoreSessionCookies(username: string) {
    const redditSession = await SecureStore.getItemAsync(
      `redditSession-${username}`,
    );
    if (redditSession) {
      const cookie = JSON.parse(redditSession);
      // Write to WKHTTPCookieStore so the WebView sees the restored session.
      await NativeCookies.setSessionCookie(cookie);
      // Also write to NSHTTPCookieStorage for any non-WebView HTTP requests.
      await CookieManager.set("https://www.reddit.com", cookie);
    }
  }

  static async getSessionCookies(username: string) {
    return await SecureStore.getItemAsync(`redditSession-${username}`);
  }

  static async hasSessionCookieBeenSet() {
    const native = await NativeCookies.hasSessionCookie();
    if (native !== null) return native;
    const cookies = await CookieManager.get("https://www.reddit.com");
    return cookies?.reddit_session !== undefined;
  }

  static async saveSessionCookies(username: string) {
    // Prefer the native module which reads directly from WKHTTPCookieStore —
    // the WebView sets cookies there, not in NSHTTPCookieStorage (which
    // CookieManager.get reads). Falling back to CookieManager would cause
    // saveSessionCookies to always return nothing after a WebView login.
    const nativeCookie = await NativeCookies.getSessionCookieValue();
    if (nativeCookie) {
      await SecureStore.setItemAsync(
        `redditSession-${username}`,
        JSON.stringify(nativeCookie),
      );
      return;
    }
    const cookies = await CookieManager.get("https://www.reddit.com");
    if (cookies?.reddit_session) {
      await SecureStore.setItemAsync(
        `redditSession-${username}`,
        JSON.stringify(cookies.reddit_session),
      );
    }
  }

  static async deleteSessionCookies(username: string) {
    await SecureStore.deleteItemAsync(`redditSession-${username}`);
  }

  static async persistSessionCookies() {
    if (await NativeCookies.persistSessionCookie()) return;
    // JS fallback
    const cookies = await CookieManager.get("https://www.reddit.com");
    if (cookies?.reddit_session && !cookies?.reddit_session?.expires) {
      const newCookies = {
        ...cookies.reddit_session,
        expires: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 10_000,
        ).toISOString(),
      };
      await CookieManager.set("https://www.reddit.com", newCookies);
    }
  }

  static async clearSessionCookies() {
    // Use native module to delete cookies directly from WKHTTPCookieStore,
    // bypassing the sync-back bug in @react-native-cookies/cookies (#152).
    if (await NativeCookies.clearSessionCookies()) return;
    // JS fallback: invalidate reddit_session before clearing to avoid bug
    // where clearAll(true) triggers a sync FROM WebKit restoring cleared cookies.
    const staleRedditSessionCookie = {
      name: "reddit_session",
      value: "",
      domain: ".reddit.com",
      path: "/",
      expires: new Date(0).toISOString(),
    };
    await CookieManager.set("https://www.reddit.com", staleRedditSessionCookie);
    await CookieManager.set(
      "https://www.reddit.com",
      staleRedditSessionCookie,
      true,
    );
    await CookieManager.clearAll();
    await CookieManager.clearAll(true);
  }
}
