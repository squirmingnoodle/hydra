import { NativeModules, Platform } from "react-native";

type NativeHydraSpotlightModule = {
  indexPost(
    postId: string,
    title: string,
    subreddit: string,
    author: string,
    thumbnailURL: string | null,
  ): Promise<void>;
  indexSubreddit(
    subredditName: string,
    displayName: string,
    description: string | null,
    iconURL: string | null,
  ): Promise<void>;
  removeAllItems(): Promise<void>;
  removePostItems(): Promise<void>;
};

const nativeModule =
  NativeModules.HydraSpotlight as NativeHydraSpotlightModule | undefined;

function isAvailable(): boolean {
  return Platform.OS === "ios" && nativeModule != null;
}

export const NativeSpotlight = {
  isAvailable,

  async indexPost(
    postId: string,
    title: string,
    subreddit: string,
    author: string,
    thumbnailURL?: string | null,
  ): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.indexPost(
        postId,
        title,
        subreddit,
        author,
        thumbnailURL ?? null,
      );
    } catch {
      // Silently fail — Spotlight indexing is best-effort
    }
  },

  async indexSubreddit(
    subredditName: string,
    displayName: string,
    description?: string | null,
    iconURL?: string | null,
  ): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.indexSubreddit(
        subredditName,
        displayName,
        description ?? null,
        iconURL ?? null,
      );
    } catch {
      // Silently fail
    }
  },

  async removeAllItems(): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.removeAllItems();
    } catch {
      // Silently fail
    }
  },

  async removePostItems(): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.removePostItems();
    } catch {
      // Silently fail
    }
  },
};
