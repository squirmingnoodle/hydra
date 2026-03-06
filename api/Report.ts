import { Comment, PostDetail } from "./PostDetail";
import { Post } from "./Posts";
import { api } from "./RedditApi";

export const REPORT_REASONS = [
  "Spam",
  "Vote manipulation",
  "Personal information",
  "Sexualizing minors",
  "Breaking site rules",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export async function reportContent(
  item: Post | PostDetail | Comment,
  reason: ReportReason,
): Promise<void> {
  await api(
    "https://www.reddit.com/api/report",
    {
      method: "POST",
    },
    {
      requireAuth: true,
      body: {
        thing_id: item.name,
        reason,
      },
    },
  );
}
