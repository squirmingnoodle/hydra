import { NativeModules, Platform } from "react-native";

type NativeHydraLiveActivityModule = {
  startWatching(
    postId: string,
    title: string,
    subreddit: string,
    commentCount: number,
    upvotes: number,
    url: string,
  ): Promise<string>;
  updateWatching(
    activityId: string,
    commentCount: number,
    upvotes: number,
    lastReplyAuthor: string | null,
    lastReplyPreview: string | null,
  ): Promise<boolean>;
  stopWatching(activityId: string): Promise<boolean>;
  isAvailable(): Promise<boolean>;
};

const nativeModule =
  NativeModules.HydraLiveActivity as NativeHydraLiveActivityModule | undefined;

function moduleAvailable(): boolean {
  return Platform.OS === "ios" && nativeModule != null;
}

export const NativeLiveActivity = {
  async isAvailable(): Promise<boolean> {
    if (!moduleAvailable()) return false;
    try {
      return await nativeModule!.isAvailable();
    } catch {
      return false;
    }
  },

  async startWatching(
    postId: string,
    title: string,
    subreddit: string,
    commentCount: number,
    upvotes: number,
    url: string,
  ): Promise<string | null> {
    if (!moduleAvailable()) return null;
    try {
      return await nativeModule!.startWatching(
        postId,
        title,
        subreddit,
        commentCount,
        upvotes,
        url,
      );
    } catch {
      return null;
    }
  },

  async updateWatching(
    activityId: string,
    commentCount: number,
    upvotes: number,
    lastReplyAuthor: string | null,
    lastReplyPreview: string | null,
  ): Promise<boolean> {
    if (!moduleAvailable()) return false;
    try {
      return await nativeModule!.updateWatching(
        activityId,
        commentCount,
        upvotes,
        lastReplyAuthor,
        lastReplyPreview,
      );
    } catch {
      return false;
    }
  },

  async stopWatching(activityId: string): Promise<boolean> {
    if (!moduleAvailable()) return false;
    try {
      return await nativeModule!.stopWatching(activityId);
    } catch {
      return false;
    }
  },
};
