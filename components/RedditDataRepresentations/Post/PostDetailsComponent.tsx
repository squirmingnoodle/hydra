import {
  AntDesign,
  Feather,
  FontAwesome,
  Ionicons,
  Octicons,
} from "@expo/vector-icons";
import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Share,
  TouchableHighlight,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import PostMedia from "./PostParts/PostMedia";
import SubredditIcon from "./PostParts/SubredditIcon";
import { summarizePostDetails, summarizePostComments } from "../../../api/AI";
import { NativeSummarization } from "../../../utils/nativeSummarization";
import { PostDetail, vote } from "../../../api/PostDetail";
import { VoteOption } from "../../../api/Posts";
import { saveItem } from "../../../api/Save";
import { ModalContext } from "../../../contexts/ModalContext";
import { CommentSettingsContext } from "../../../contexts/SettingsContexts/CommentSettingsContext";
import { PostSettingsContext } from "../../../contexts/SettingsContexts/PostSettingsContext";
import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";
import { SubscriptionsContext } from "../../../contexts/SubscriptionsContext";
import RedditURL from "../../../utils/RedditURL";
import useContextMenu from "../../../utils/useContextMenu";
import { useRoute, useURLNavigation } from "../../../utils/navigation";
import NewComment from "../../Modals/NewComment";
import SavedPostCategoryPrompt from "../../Modals/SavedPostCategoryPrompt";
import Time from "../../../utils/Time";
import {
  clearCategory,
  getAllCategories,
  getCategory,
  setCategory,
} from "../../../utils/savedPostCategories";

type Summary = {
  post: string | null;
  comments: string | null;
};

type SummaryUnavailable = {
  post: boolean;
  comments: boolean;
};

type SummarySource = {
  post: "apple" | "server" | null;
  comments: "apple" | "server" | null;
};

type PostDetailsComponentProps = {
  postDetail: PostDetail;
  loadPostDetails: () => Promise<void>;
  setPostDetail: Dispatch<SetStateAction<PostDetail | undefined>>;
};

export default function PostDetailsComponent({
  postDetail,
  loadPostDetails,
  setPostDetail,
}: PostDetailsComponentProps) {
  const { params } = useRoute<"PostDetailsPage">();
  const url = params.url;
  const { pushURL } = useURLNavigation();

  const { theme } = useContext(ThemeContext);
  const { setModal } = useContext(ModalContext);
  const showContextMenu = useContextMenu();
  const { isPro, customerId } = useContext(SubscriptionsContext);
  const { showPostSummary, tapToCollapsePost } =
    useContext(PostSettingsContext);
  const { showCommentSummary } = useContext(CommentSettingsContext);

  const [mediaCollapsed, setMediaCollapsed] = useState(false);
  const [commentSummaryCollapsed, setCommentSummaryCollapsed] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryUnavailable, setSummaryUnavailable] =
    useState<SummaryUnavailable>({
      post: false,
      comments: false,
    });
  const [summarySource, setSummarySource] = useState<SummarySource>({
    post: null,
    comments: null,
  });
  const bookmarkLongPressTriggered = useRef(false);
  const contentSentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(contentSentTimer.current);
    };
  }, []);

  const contextDepth = Number(new RedditURL(url).getQueryParam("context") ?? 0);

  const voteOnPost = async (voteOption: VoteOption) => {
    const result = await vote(postDetail, voteOption);
    setPostDetail({
      ...postDetail,
      upvotes: postDetail.upvotes - postDetail.userVote + result,
      userVote: result,
    });
  };

  const setSavedPostCategory = async () => {
    if (!postDetail.saved) return;

    const currentCategory = getCategory(postDetail.name);
    const newCategoryOption = "+ New Category";
    const clearCategoryOption = "Clear Category";

    const result = await showContextMenu({
      options: [
        ...getAllCategories(),
        newCategoryOption,
        ...(currentCategory ? [clearCategoryOption] : []),
      ],
    });

    if (!result) return;
    if (result === newCategoryOption) {
      setModal(
        <SavedPostCategoryPrompt
          onCancel={() => setModal(undefined)}
          onSubmit={(categoryName) => {
            setCategory(postDetail.name, categoryName);
            setModal(undefined);
          }}
        />,
      );
      return;
    }
    if (result === clearCategoryOption) {
      clearCategory(postDetail.name);
      return;
    }
    setCategory(postDetail.name, result);
  };

  const toggleSavedPost = async () => {
    if (bookmarkLongPressTriggered.current) {
      bookmarkLongPressTriggered.current = false;
      return;
    }
    const shouldSave = !postDetail.saved;
    await saveItem(postDetail, shouldSave);
    if (!shouldSave) {
      clearCategory(postDetail.name);
    }
    setPostDetail({
      ...postDetail,
      saved: shouldSave,
    });
  };

  const getSummary = async (cancelled: { current: boolean }) => {
    const canSummarizePost = showPostSummary && postDetail.text.length > 850;
    const canSummarizeComments =
      showCommentSummary &&
      postDetail.comments.reduce(
        (acc, comment) => acc + comment.text.length,
        0,
      ) > 1_000;

    if (!canSummarizePost && !canSummarizeComments) {
      setSummary(null);
      setSummaryLoading(false);
      setSummaryUnavailable({ post: false, comments: false });
      return;
    }

    setSummaryLoading(true);

    let postSummary: string | null = null;
    let commentsSummary: string | null = null;
    let postSummaryUnavailable = false;
    let commentsSummaryUnavailable = false;
    let postSource: "apple" | "server" | null = null;
    let commentsSource: "apple" | "server" | null = null;

    if (canSummarizePost) {
      // Try on-device AI first (free for all users on iOS 26+)
      postSummary = await NativeSummarization.summarizePost(
        postDetail.title,
        postDetail.subreddit,
        postDetail.author,
        postDetail.text,
      );

      if (cancelled.current) return;

      if (postSummary) {
        postSource = "apple";
      }

      // Fall back to server for Pro users
      if (!postSummary && isPro && customerId) {
        try {
          postSummary = await summarizePostDetails(customerId, postDetail);
          if (cancelled.current) return;
          if (postSummary) {
            postSource = "server";
          }
        } catch (_e) {
          // Server fallback failed
        }
      }

      postSummaryUnavailable = !postSummary;
    }

    if (cancelled.current) return;

    if (canSummarizeComments) {
      const topComments = postDetail.comments
        .slice(0, 5)
        .map((c) => c.text.slice(0, 2_000));

      // Try on-device AI first
      commentsSummary = await NativeSummarization.summarizeComments(
        postDetail.title,
        postDetail.author,
        postSummary ?? postDetail.text,
        topComments,
      );

      if (cancelled.current) return;

      if (commentsSummary) {
        commentsSource = "apple";
      }

      // Fall back to server for Pro users
      if (!commentsSummary && isPro && customerId) {
        try {
          commentsSummary = await summarizePostComments(
            customerId,
            postDetail,
            postSummary ?? postDetail.text,
          );
          if (cancelled.current) return;
          if (commentsSummary) {
            commentsSource = "server";
          }
        } catch (_e) {
          // Server fallback failed
        }
      }

      commentsSummaryUnavailable = !commentsSummary;
    }

    if (cancelled.current) return;

    setSummary({
      post: postSummary,
      comments: commentsSummary,
    });
    setSummarySource({
      post: postSource,
      comments: commentsSource,
    });
    setSummaryUnavailable({
      post: canSummarizePost && postSummaryUnavailable,
      comments: canSummarizeComments && commentsSummaryUnavailable,
    });
    setSummaryLoading(false);
  };

  useEffect(() => {
    const cancelled = { current: false };
    getSummary(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [
    isPro,
    customerId,
    showPostSummary,
    showCommentSummary,
    postDetail.id,
    postDetail.text.length,
    postDetail.comments.length,
  ]);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={tapToCollapsePost ? 0.8 : 1}
        onPress={() =>
          tapToCollapsePost ? setMediaCollapsed(!mediaCollapsed) : null
        }
      >
        <View style={styles.postDetailsContainer}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
          >
            {postDetail.title}
          </Text>
          {!mediaCollapsed &&
            summaryLoading &&
            !summary?.post &&
            postDetail.text.length > 850 && (
              <View
                style={[
                  styles.postSummaryContainer,
                  {
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.postSummaryTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Summary
                </Text>
                <ActivityIndicator
                  size="small"
                  color={theme.subtleText}
                  style={{ marginTop: 4 }}
                />
              </View>
            )}
          {!mediaCollapsed && summary?.post && postDetail.text.length > 850 && (
            <View
              style={[
                styles.postSummaryContainer,
                {
                  borderColor: theme.divider,
                },
              ]}
            >
              <View
                style={[styles.summaryTitleRow, { justifyContent: "center" }]}
              >
                <Text
                  style={[
                    styles.postSummaryTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Summary
                </Text>
                {summarySource.post === "apple" ? (
                  <Ionicons
                    name="sparkles"
                    size={14}
                    color={theme.subtleText}
                  />
                ) : summarySource.post === "server" ? (
                  <FontAwesome name="star" size={12} color={theme.subtleText} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.postSummaryText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {summary.post}
              </Text>
            </View>
          )}
          {!mediaCollapsed &&
            !summary?.post &&
            summaryUnavailable.post &&
            postDetail.text.length > 850 && (
              <View
                style={[
                  styles.postSummaryContainer,
                  {
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.postSummaryTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Summary
                </Text>
                <Text
                  style={[
                    styles.postSummaryText,
                    {
                      color: theme.subtleText,
                    },
                  ]}
                >
                  Summary unavailable right now. Please try again later.
                </Text>
              </View>
            )}
          {!mediaCollapsed && <PostMedia post={postDetail} />}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              {postDetail.isStickied && (
                <AntDesign
                  name="pushpin"
                  style={[
                    styles.stickiedIcon,
                    {
                      color: theme.moderator,
                    },
                  ]}
                />
              )}
              <TouchableOpacity
                style={styles.subredditContainer}
                activeOpacity={0.5}
                onPress={() => pushURL(`/r/${postDetail.subreddit}`)}
              >
                <SubredditIcon subredditIcon={postDetail.subredditIcon} />
                <Text
                  style={[
                    styles.boldedSmallText,
                    {
                      color: theme.subtleText,
                    },
                  ]}
                >
                  {`r/${postDetail.subreddit}`}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.smallText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {" by "}
              </Text>
              <TouchableOpacity
                activeOpacity={0.5}
                onPress={() => pushURL(`/user/${postDetail.author}`)}
              >
                <Text
                  style={[
                    styles.boldedSmallText,
                    {
                      color: postDetail.isModerator
                        ? theme.moderator
                        : theme.subtleText,
                    },
                  ]}
                >
                  {`u/${postDetail.author}`}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.metadataRow, { marginTop: 5 }]}>
              <Feather name="arrow-up" size={15} color={theme.subtleText} />
              <Text
                style={[
                  styles.smallText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {postDetail.upvotes}
              </Text>
              <Text
                style={[
                  styles.smallText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {"  •  "}
                {postDetail.timeSince}
              </Text>
              {postDetail.editedAt && (
                <TouchableOpacity
                  style={styles.editedAtContainer}
                  onPress={() => {
                    if (!postDetail.editedAt) return;
                    const timeSinceEdited = new Time(
                      postDetail.editedAt,
                    ).prettyTimeSince();
                    Alert.alert(
                      `Edited ${timeSinceEdited} ago`,
                      `Post was edited at ${new Date(postDetail.editedAt).toLocaleString()}`,
                    );
                  }}
                >
                  <FontAwesome
                    name="pencil"
                    size={14}
                    color={theme.subtleText}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <View
        style={[
          styles.buttonsBarContainer,
          {
            borderTopColor: theme.divider,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.buttonsContainer,
            {
              backgroundColor:
                postDetail.userVote === VoteOption.UpVote
                  ? theme.upvote
                  : undefined,
            },
          ]}
          onPress={() => voteOnPost(VoteOption.UpVote)}
          accessibilityLabel="Upvote"
          accessibilityRole="button"
        >
          <Feather
            name="arrow-up"
            size={32}
            color={
              postDetail.userVote === VoteOption.UpVote
                ? theme.text
                : theme.iconPrimary
            }
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.buttonsContainer,
            {
              backgroundColor:
                postDetail.userVote === VoteOption.DownVote
                  ? theme.downvote
                  : undefined,
            },
          ]}
          onPress={() => voteOnPost(VoteOption.DownVote)}
          accessibilityLabel="Downvote"
          accessibilityRole="button"
        >
          <Feather
            name="arrow-down"
            size={32}
            color={
              postDetail.userVote === VoteOption.DownVote
                ? theme.text
                : theme.iconPrimary
            }
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.buttonsContainer,
            {
              backgroundColor: undefined,
            },
          ]}
          onPress={toggleSavedPost}
          accessibilityLabel={postDetail.saved ? "Remove bookmark" : "Bookmark"}
          accessibilityRole="button"
          onLongPress={async () => {
            if (!postDetail.saved) return;
            bookmarkLongPressTriggered.current = true;
            await setSavedPostCategory();
            setTimeout(() => {
              bookmarkLongPressTriggered.current = false;
            }, 250);
          }}
        >
          <FontAwesome
            name={postDetail.saved ? "bookmark" : "bookmark-o"}
            size={28}
            color={theme.iconPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonsContainer}
          onPress={() =>
            setModal(
              <NewComment
                parent={postDetail}
                contentSent={() => {
                  contentSentTimer.current = setTimeout(
                    () => loadPostDetails(),
                    5_000,
                  );
                }}
              />,
            )
          }
          accessibilityLabel="Reply"
          accessibilityRole="button"
        >
          <Octicons name="reply" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonsContainer}
          onPress={() => {
            Share.share({ url: new RedditURL(url).toString() });
          }}
          accessibilityLabel="Share"
          accessibilityRole="button"
        >
          <Feather name="share" size={28} color={theme.iconPrimary} />
        </TouchableOpacity>
      </View>
      {contextDepth > 0 && (
        <TouchableOpacity
          onPress={() => {
            pushURL(
              new RedditURL(
                `https://www.reddit.com/r/${postDetail.subreddit}/comments/${postDetail.id}/`,
              ).toString(),
            );
          }}
          style={[
            styles.showContextContainer,
            {
              borderTopColor: theme.divider,
            },
          ]}
        >
          <Text style={{ color: theme.iconOrTextButton }}>
            This is a comment thread. Click here to view all comments.
          </Text>
        </TouchableOpacity>
      )}
      {summary?.comments && (
        <TouchableHighlight
          activeOpacity={1}
          underlayColor={theme.tint}
          onPress={() => setCommentSummaryCollapsed(!commentSummaryCollapsed)}
          onLongPress={(e) => {
            if (e.nativeEvent.touches.length > 1) return;
            Clipboard.setStringAsync(summary.comments ?? "");
            Alert.alert(
              "Comments Summary Copied",
              "The comment summary has been copied to your clipboard.",
            );
          }}
          style={[
            styles.commentsSummaryContainer,
            {
              borderTopColor: theme.divider,
            },
          ]}
        >
          <View>
            <View style={styles.summaryTitleRow}>
              <Text
                style={[
                  styles.commentsSummaryTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Comments Summary
              </Text>
              {summarySource.comments === "apple" ? (
                <Ionicons name="sparkles" size={12} color={theme.subtleText} />
              ) : summarySource.comments === "server" ? (
                <FontAwesome name="star" size={10} color={theme.subtleText} />
              ) : null}
            </View>
            {!commentSummaryCollapsed && (
              <Text
                style={[
                  styles.commentsSummaryText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {summary.comments}
              </Text>
            )}
          </View>
        </TouchableHighlight>
      )}
      {!summary?.comments && summaryUnavailable.comments && (
        <View
          style={[
            styles.commentsSummaryContainer,
            {
              borderTopColor: theme.divider,
            },
          ]}
        >
          <Text
            style={[
              styles.commentsSummaryTitle,
              {
                color: theme.text,
              },
            ]}
          >
            Comments Summary
          </Text>
          <Text
            style={[
              styles.commentsSummaryText,
              {
                color: theme.subtleText,
              },
            ]}
          >
            Comment summary unavailable right now. Please try again later.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  postDetailsOuterContainer: {
    flex: 1,
    justifyContent: "center",
  },
  postDetailsContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  metadataContainer: {
    marginTop: 5,
    paddingHorizontal: 15,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  stickiedIcon: {
    marginRight: 7,
    fontSize: 16,
  },
  subredditContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallText: {
    fontSize: 14,
  },
  editedAtContainer: {
    padding: 8,
    margin: -8,
    marginLeft: -3,
  },
  boldedSmallText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buttonsBarContainer: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 46,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  buttonsContainer: {
    padding: 3,
    borderRadius: 5,
    marginVertical: -100,
  },
  showContextContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  noCommentsContainer: {
    marginVertical: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 15,
  },
  postSummaryContainer: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 3,
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  postSummaryText: {
    fontSize: 15,
  },
  postSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 5,
  },
  commentsSummaryContainer: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
  },
  commentsSummaryTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  commentsSummaryText: {
    marginTop: 8,
    fontSize: 15,
  },
});
