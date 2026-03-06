import { Comment, PostDetail } from "../api/PostDetail";

export type CommentFilterMode = "all" | "op" | "mod" | "awarded";

export const COMMENT_FILTER_MODES: {
  key: CommentFilterMode;
  label: string;
  icon: string;
}[] = [
  { key: "op", label: "OP", icon: "user" },
  { key: "mod", label: "Mod", icon: "shield" },
  { key: "awarded", label: "Awarded", icon: "star" },
];

function matchesFilter(
  comment: Comment,
  mode: CommentFilterMode,
): boolean {
  switch (mode) {
    case "op":
      return comment.isOP;
    case "mod":
      return comment.isModerator || comment.isAdmin || comment.isStickied;
    case "awarded":
      return comment.gilded > 0;
    default:
      return true;
  }
}

/**
 * Check whether a top-level comment or any of its descendants match the
 * active filter. This lets the navigator jump to the top-level comment
 * that *contains* a matching reply (useful for OP answers in AMAs).
 */
export function commentTreeMatchesFilter(
  comment: Comment | PostDetail,
  mode: CommentFilterMode,
): boolean {
  if (mode === "all") return true;
  if (comment.type === "comment" && matchesFilter(comment, mode)) return true;
  return comment.comments.some((child) =>
    commentTreeMatchesFilter(child, mode),
  );
}
