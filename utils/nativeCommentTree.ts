import { NativeModules, Platform } from "react-native";
import { Comment } from "../api/PostDetail";

type NativeHydraCommentTreeModule = {
  formatComments(
    comments: any[],
    collapseAutoModerator: boolean,
  ): Promise<Comment[]>;
};

const nativeModule =
  NativeModules.HydraCommentTree as NativeHydraCommentTreeModule | undefined;

/**
 * Format raw Reddit API comment children into a Comment array using a native
 * Swift implementation that runs on a background thread.
 *
 * Returns null when the native module is unavailable so the caller can fall
 * back to the JS formatComments() implementation.
 */
export async function nativeFormatComments(
  comments: any[],
  collapseAutoModerator: boolean,
): Promise<Comment[] | null> {
  if (Platform.OS !== "ios" || !nativeModule || comments.length === 0) {
    return null;
  }
  try {
    return await nativeModule.formatComments(comments, collapseAutoModerator);
  } catch (_e) {
    return null;
  }
}
