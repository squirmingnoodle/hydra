import { Post } from "../../api/Posts";
import { arePostsSeenAsync } from "../../db/functions/SeenPosts";
import { FilterFunction } from "../useRedditDataState";

export const filterSeenItems: FilterFunction<Post> = async (posts) => {
  const seenPosts = await arePostsSeenAsync(posts);
  return posts.filter((_post, index) => !seenPosts[index]);
};
