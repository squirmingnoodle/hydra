import { getPostsDetail } from "../api/PostDetail";
import { NativeLiveActivity } from "./nativeLiveActivity";

type WatchedThread = {
  activityId: string;
  postId: string;
  url: string;
  intervalId: ReturnType<typeof setInterval>;
};

const watchedThreads = new Map<string, WatchedThread>();

const POLL_INTERVAL = 30_000; // 30 seconds

export async function startWatchingThread(
  postId: string,
  title: string,
  subreddit: string,
  author: string,
  commentCount: number,
  upvotes: number,
  url: string,
  thumbnailURL: string | null,
  postText: string | null,
): Promise<boolean> {
  if (watchedThreads.has(postId)) return false;

  const activityId = await NativeLiveActivity.startWatching(
    postId,
    title,
    subreddit,
    author,
    commentCount,
    upvotes,
    url,
    thumbnailURL,
    postText,
  );

  if (!activityId) return false;

  const intervalId = setInterval(() => pollThread(postId), POLL_INTERVAL);

  watchedThreads.set(postId, {
    activityId,
    postId,
    url,
    intervalId,
  });

  return true;
}

export async function stopWatchingThread(postId: string): Promise<void> {
  const watched = watchedThreads.get(postId);
  if (!watched) return;

  clearInterval(watched.intervalId);
  await NativeLiveActivity.stopWatching(watched.activityId);
  watchedThreads.delete(postId);
}

export function isWatchingThread(postId: string): boolean {
  return watchedThreads.has(postId);
}

async function pollThread(postId: string): Promise<void> {
  const watched = watchedThreads.get(postId);
  if (!watched) return;

  try {
    const postDetail = await getPostsDetail(watched.url);
    if (!postDetail) return;

    const comments = postDetail.comments ?? [];
    const latestComment = comments[0];

    await NativeLiveActivity.updateWatching(
      watched.activityId,
      postDetail.commentCount,
      postDetail.upvotes,
      latestComment?.author ?? null,
      latestComment?.text?.slice(0, 100) ?? null,
    );
  } catch {
    // Silently fail, will retry on next poll
  }
}
