import { NativeModules, Platform } from "react-native";

type TrendingPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  commentCount: number;
  thumbnail?: string;
  url: string;
};

type FavoriteSubreddit = {
  name: string;
  icon?: string;
};

type NativeHydraWidgetDataModule = {
  setTrendingPosts(posts: TrendingPost[]): Promise<void>;
  setInboxCount(count: number): Promise<void>;
  setFavoriteSubreddits(subreddits: FavoriteSubreddit[]): Promise<void>;
  setKarma(karma: number): Promise<void>;
  setUsername(username: string | null): Promise<void>;
};

const nativeModule =
  NativeModules.HydraWidgetData as NativeHydraWidgetDataModule | undefined;

function isAvailable(): boolean {
  return Platform.OS === "ios" && nativeModule != null;
}

export const NativeWidgetData = {
  isAvailable,

  async setTrendingPosts(posts: TrendingPost[]): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.setTrendingPosts(posts);
    } catch {
      // Silently fail
    }
  },

  async setInboxCount(count: number): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.setInboxCount(count);
    } catch {
      // Silently fail
    }
  },

  async setFavoriteSubreddits(subreddits: FavoriteSubreddit[]): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.setFavoriteSubreddits(subreddits);
    } catch {
      // Silently fail
    }
  },

  async setKarma(karma: number): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.setKarma(karma);
    } catch {
      // Silently fail
    }
  },

  async setUsername(username: string | null): Promise<void> {
    if (!isAvailable()) return;
    try {
      await nativeModule!.setUsername(username);
    } catch {
      // Silently fail
    }
  },
};
