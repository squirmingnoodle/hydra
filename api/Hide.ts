import { Post } from "./Posts";
import { api } from "./RedditApi";

export async function hidePost(post: Post, hidden: boolean): Promise<void> {
  await api(
    `https://www.reddit.com/api/${hidden ? "hide" : "unhide"}`,
    {
      method: "POST",
    },
    {
      requireAuth: true,
      body: {
        id: post.name,
      },
    },
  );
}
