import "react-native-url-polyfill/auto";
import { CommentReply } from "./Messages";
import { Comment, PostDetail, formatComments } from "./PostDetail";
import { Post, formatPostData } from "./Posts";
import { api } from "./RedditApi";
import RedditURL from "../utils/RedditURL";
import Time from "../utils/Time";

export type User = {
  id: string;
  type: "user";
  userName: string;
  commentKarma: number;
  postKarma: number;
  icon: string;
  displayName?: string;
  bio?: string;
  bannerImage?: string;
  avatarImage?: string;
  profileImage?: string;
  totalKarma?: number;
  isGold?: boolean;
  isMod?: boolean;
  verifiedEmail?: boolean;
  followersCount?: number;
  mailCount?: number;
  friends: boolean;
  isLoggedInUser: boolean;
  after: string;
  modhash?: string;
  createdAt: number;
  timeSinceCreated: string;
};

export type UserTrophy = {
  id: string;
  name: string;
  icon: string | null;
  description?: string;
};

export type UserContent = Post | Comment | PostDetail | CommentReply;

type GetUserContentOptions = {
  limit?: string;
  after?: string;
};

export class UserDoesNotExistError extends Error {
  name: "UserDoesNotExistError";
  constructor() {
    super("UserDoesNotExistError");
    this.name = "UserDoesNotExistError";
  }
}

export class BannedUserError extends Error {
  name: "BannedUserError";
  constructor() {
    super("BannedUserError");
    this.name = "BannedUserError";
  }
}

function normalizeImage(url?: string): string | undefined {
  if (typeof url !== "string" || url.length === 0) return undefined;
  const normalized = url.trim().replace(/&amp;/g, "&");
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    if (parsed.pathname.toLowerCase().endsWith(".svg")) {
      return undefined;
    }
    return parsed.toString();
  } catch (_error) {
    const normalizedLower = normalized.toLowerCase();
    if (
      !normalizedLower.startsWith("https://") &&
      !normalizedLower.startsWith("http://")
    ) {
      return undefined;
    }
  }
  if (normalized.toLowerCase().split("?")[0].endsWith(".svg")) {
    return undefined;
  }
  return normalized;
}

export function formatUserData(child: any): User {
  const safeChild = typeof child === "object" && child !== null ? child : {};
  const profile =
    typeof safeChild.subreddit === "object" && safeChild.subreddit !== null
      ? safeChild.subreddit
      : {};
  const userName =
    typeof safeChild.name === "string" && safeChild.name.length > 0
      ? safeChild.name
      : "unknown";
  const postKarma =
    typeof safeChild.link_karma === "number" &&
    Number.isFinite(safeChild.link_karma)
      ? safeChild.link_karma
      : 0;
  const commentKarma =
    typeof safeChild.comment_karma === "number" &&
    Number.isFinite(safeChild.comment_karma)
      ? safeChild.comment_karma
      : 0;
  const createdAt =
    typeof safeChild.created_utc === "number" &&
    Number.isFinite(safeChild.created_utc)
      ? safeChild.created_utc
      : 0;
  const id =
    typeof safeChild.id === "string" && safeChild.id.length > 0
      ? safeChild.id
      : userName;
  // Use Reddit's total_karma when available (includes award karma);
  // fall back to sum of post + comment karma.
  const totalKarma =
    typeof safeChild.total_karma === "number" &&
    Number.isFinite(safeChild.total_karma)
      ? Math.max(0, safeChild.total_karma)
      : Math.max(0, postKarma + commentKarma);

  return {
    id,
    type: "user",
    userName,
    commentKarma,
    postKarma,
    icon: normalizeImage(safeChild.icon_img) ?? "",
    displayName:
      typeof profile.title === "string" && profile.title.length > 0
        ? profile.title
        : undefined,
    bio:
      typeof profile.public_description === "string" &&
      profile.public_description.length > 0
        ? profile.public_description
        : undefined,
    bannerImage: normalizeImage(profile.banner_img),
    avatarImage: normalizeImage(profile.icon_img),
    profileImage: normalizeImage(safeChild.snoovatar_img),
    totalKarma,
    isGold: safeChild.is_gold === true,
    isMod: safeChild.is_mod === true,
    verifiedEmail: safeChild.has_verified_email === true,
    followersCount:
      typeof profile.subscribers === "number" ? profile.subscribers : undefined,
    mailCount:
      typeof safeChild.inbox_count === "number" &&
      Number.isFinite(safeChild.inbox_count)
        ? safeChild.inbox_count
        : undefined,
    friends: safeChild.is_friend === true,
    isLoggedInUser:
      safeChild.inbox_count !== undefined && safeChild.inbox_count !== null,
    after: id,
    modhash:
      typeof safeChild.modhash === "string" ? safeChild.modhash : undefined,
    createdAt,
    timeSinceCreated:
      createdAt > 0
        ? new Time(createdAt * 1000).prettyTimeSince() + " old"
        : "Unknown age",
  };
}

function handleBadUserResponse(response: any) {
  if (response.error === 403 || response.data?.is_suspended) {
    throw new BannedUserError();
  }
  if (response.error === 404) {
    throw new UserDoesNotExistError();
  }
}

export async function getUser(url: string): Promise<User> {
  const redditURL = new RedditURL(`${url}/about`);
  redditURL.jsonify();
  const response = await api(redditURL.toString());
  handleBadUserResponse(response);
  return formatUserData(response.data);
}

export async function getUserTrophies(username: string): Promise<UserTrophy[]> {
  try {
    const response = await api(
      `https://www.reddit.com/api/v1/user/${username}/trophies`,
    );
    const trophies = response?.data?.trophies;
    if (!Array.isArray(trophies)) {
      return [];
    }

    return trophies
      .map((trophy: any, index: number): UserTrophy | null => {
        const data = trophy?.data;
        if (!data || typeof data.name !== "string") {
          return null;
        }

        return {
          id:
            typeof data.id === "string"
              ? data.id
              : `${username}-${data.name}-${index}`,
          name: data.name,
          icon:
            normalizeImage(data.icon_70) ??
            normalizeImage(data.icon_40) ??
            null,
          description:
            typeof data.description === "string" ? data.description : undefined,
        };
      })
      .filter((trophy): trophy is UserTrophy => trophy !== null);
  } catch (_e) {
    return [];
  }
}

export async function getUserContent(
  url: string,
  options: GetUserContentOptions = {},
): Promise<UserContent[]> {
  const redditURL = new RedditURL(url);
  redditURL.setQueryParams(options);
  redditURL.changeQueryParam("sr_detail", "true");
  redditURL.jsonify();
  const response = await api(redditURL.toString());
  handleBadUserResponse(response);
  const children = Array.isArray(response?.data?.children)
    ? response.data.children
    : [];
  const overview = await Promise.all(
    children.map(async (child: any) => {
      if (child.kind === "t3") {
        return await formatPostData(child);
      }
      if (child.kind === "t1") {
        return formatComments([child])[0] ?? null;
      }
      return null;
    }),
  );
  return overview.filter((item): item is UserContent => !!item);
}

export async function blockUser(user: User): Promise<void> {
  const redditURL = new RedditURL(`https://www.reddit.com/api/block_user`);
  redditURL.setQueryParams({
    account_id: `t2_${user.id}`,
  });
  redditURL.jsonify();
  await api(
    redditURL.toString(),
    {
      method: "POST",
    },
    {
      requireAuth: true,
    },
  );
}

function normalizeUserNameForFollow(userName: string) {
  return userName.trim().replace(/^u\//i, "");
}

export async function followUser(userName: string): Promise<void> {
  await api(
    "https://www.reddit.com/api/friend",
    {
      method: "POST",
    },
    {
      requireAuth: true,
      body: {
        name: normalizeUserNameForFollow(userName),
        type: "friend",
        api_type: "json",
      },
    },
  );
}

export async function unfollowUser(userName: string): Promise<void> {
  await api(
    "https://www.reddit.com/api/unfriend",
    {
      method: "POST",
    },
    {
      requireAuth: true,
      body: {
        name: normalizeUserNameForFollow(userName),
        type: "friend",
      },
    },
  );
}
