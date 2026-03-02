import { NativeModules, Platform } from "react-native";

type NativeHydraSeenPostsModule = {
  arePostsSeen(postIds: string[]): Promise<boolean[]>;
  isPostSeen(postId: string): Promise<boolean>;
};

const nativeModule =
  NativeModules.HydraSeenPosts as NativeHydraSeenPostsModule | undefined;

/**
 * Batch-check which post IDs have been seen using a native read-only SQLite
 * connection, keeping the query off the JS thread.
 *
 * Falls back to null when the native module is unavailable (non-iOS or dev
 * builds without the module), so callers can fall back to the JS drizzle path.
 */
export async function nativeArePostsSeen(
  postIds: string[],
): Promise<boolean[] | null> {
  if (Platform.OS !== "ios" || !nativeModule || postIds.length === 0) {
    return null;
  }
  try {
    return await nativeModule.arePostsSeen(postIds);
  } catch (_e) {
    return null;
  }
}

export async function nativeIsPostSeen(postId: string): Promise<boolean | null> {
  if (Platform.OS !== "ios" || !nativeModule) {
    return null;
  }
  try {
    return await nativeModule.isPostSeen(postId);
  } catch (_e) {
    return null;
  }
}
