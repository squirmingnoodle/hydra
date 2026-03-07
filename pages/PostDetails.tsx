import React, {
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  useDeferredValue,
} from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  ColorValue,
  Platform,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  getPostsDetail,
  loadMoreComments,
  PostDetail,
  Comment,
} from "../api/PostDetail";
import { StackPageProps } from "../app/stack";
import SortAndContext, {
  ContextTypes,
  SortTypes,
} from "../components/Navbar/SortAndContext";
import PostDetailsComponent from "../components/RedditDataRepresentations/Post/PostDetailsComponent";
import Comments from "../components/RedditDataRepresentations/Post/PostParts/Comments";
import { AccountContext } from "../contexts/AccountContext";
import { ScrollerContext, ScrollerProvider } from "../contexts/ScrollerContext";
import { ThemeContext } from "../contexts/SettingsContexts/ThemeContext";
import { TabSettingsContext } from "../contexts/SettingsContexts/TabSettingsContext";
import RedditURL from "../utils/RedditURL";
import { useURLNavigation } from "../utils/navigation";
import { TabScrollContext } from "../contexts/TabScrollContext";
import { modifyStat, Stat } from "../db/functions/Stats";
import ScrollToNextButtonProvider from "../contexts/ScrollToNextButtonProvider";
import { ScrollToNextButtonContext } from "../contexts/ScrollToNextButtonContext";
import { CommentSkeletonList } from "../components/UI/SkeletonLoader";
import SearchBar from "../components/UI/SearchBar";
import { commentTreeMatchesFilter } from "../utils/commentFilters";
import { NativeSpotlight } from "../utils/nativeSpotlight";
import { NativeHandoff } from "../utils/nativeHandoff";
import WatchThreadButton from "../components/UI/WatchThreadButton";

export type LoadMoreCommentsFunc = (
  commentIds: string[],
  commentPath: number[],
  childStartIndex: number,
) => Promise<void>;

type PostDetailsProps =
  | StackPageProps<"PostDetailsPage">
  | {
      splitViewURL: string;
      setSplitViewURL: (url: string | null) => void;
    };

function PostDetails(props: PostDetailsProps) {
  const url = "route" in props ? props.route.params.url : props.splitViewURL;

  const isSplitView = "splitViewURL" in props && !!props.splitViewURL;

  const navigation = useURLNavigation();

  const { theme } = useContext(ThemeContext);
  const { liquidGlassEnabled } = useContext(TabSettingsContext);
  const { scrollDisabled } = useContext(ScrollerContext);
  const { currentUser } = useContext(AccountContext);
  const { handleScrollForTabBar } = useContext(TabScrollContext);
  const shouldUseSystemContentInsets =
    Platform.OS === "ios" && liquidGlassEnabled;
  const {
    setScrollToNext,
    setScrollToPrevious,
    setScrollToParent,
    commentFilterMode,
  } = useContext(ScrollToNextButtonContext);

  const topOfScroll = useRef<View>(null);
  const scrollView = useRef<ScrollView>(null);
  const commentsView = React.useRef<View>(null);

  const [postDetail, setPostDetail] = useState<PostDetail>();
  const [refreshing, setRefreshing] = useState(false);
  const [commentSearchVisible, setCommentSearchVisible] = useState(false);
  const [commentSearchFilter, setCommentSearchFilter] = useState("");

  const deferredPostDetail = useDeferredValue(postDetail);

  const asyncMeasure = (
    ref: any,
    type: "measure" | "measureInWindow" = "measure",
  ): Promise<number[]> => {
    return new Promise((resolve) => {
      ref[type]((...args: any) => {
        resolve(args);
      });
    });
  };

  const scrollChange = useCallback(
    async (changeY: number) => {
      if (!scrollView.current) return;
      const scrollRef = scrollView.current;
      const scrollWindowTop = (await asyncMeasure(scrollRef))[5];
      if (changeY < scrollWindowTop) {
        const scrollDepth = (await asyncMeasure(topOfScroll.current))[5];
        scrollView.current.scrollTo({
          y: scrollWindowTop - scrollDepth + (changeY - scrollWindowTop),
          animated: true,
        });
      }
    },
    [scrollView.current],
  );

  const loadPostDetails = async () => {
    setRefreshing(true);
    if (isSplitView) {
      setPostDetail(undefined);
    }
    const postDetail = await getPostsDetail(url);
    if (!postDetail) return;
    setPostDetail(postDetail);
    setRefreshing(false);

    // Index in Spotlight for home screen search
    NativeSpotlight.indexPost(
      postDetail.id,
      postDetail.title,
      postDetail.subreddit,
      postDetail.author,
      postDetail.imageThumbnail,
    );

    // Set Handoff activity for continuity across devices
    NativeHandoff.setActivity(
      "viewPost",
      `Viewing post in r/${postDetail.subreddit}`,
      postDetail.link,
    );

    if (isSplitView) return;
    const contextOptions: ContextTypes[] = [
      ...(currentUser?.userName === postDetail.author && postDetail.text
        ? ["Edit" as ContextTypes]
        : []),
      ...(currentUser?.userName === postDetail.author
        ? ["Delete" as ContextTypes]
        : []),
      "Report",
      "Select Text",
      "Share",
    ];
    const contextSort: SortTypes[] = [
      "Best",
      "New",
      "Top",
      "Controversial",
      "Old",
      "Q&A",
    ];
    navigation.setOptions({
      title: new RedditURL(url).getPageName(),
      headerRight: () => {
        return (
          <SortAndContext
            route={url}
            navigation={navigation}
            sortOptions={contextSort}
            contextOptions={contextOptions}
            pageData={postDetail}
          />
        );
      },
    });
  };

  const getCommentFromPath = (
    parentObject: PostDetail | Comment,
    commentPath: number[],
  ) => {
    return commentPath.reduce((path: PostDetail | Comment, num) => {
      return path.comments[num];
    }, parentObject);
  };

  const changeComment = (newComment: Comment | PostDetail) => {
    if (postDetail) {
      const oldComment = getCommentFromPath(postDetail, newComment.path);
      Object.assign(oldComment, newComment);
      rerenderComment(oldComment);
    }
  };

  const deleteComment = (comment: Comment) => {
    if (postDetail) {
      const parent = getCommentFromPath(postDetail, comment.path.slice(0, -1));
      parent.comments = parent.comments.filter((c) => c.id !== comment.id);
      rerenderComment(comment);
    }
  };

  const rerenderComment = (comment: Comment | PostDetail) => {
    if (postDetail) {
      let currentComment: Comment | PostDetail = postDetail;
      for (const num of comment.path) {
        currentComment.renderCount++;
        currentComment = currentComment.comments[num];
      }
      setPostDetail({ ...postDetail });
    }
  };

  const loadMoreCommentsFunc: LoadMoreCommentsFunc = async (
    commentIds,
    commentPath,
    childStartIndex,
  ) => {
    if (!postDetail) return;
    const newComments = await loadMoreComments(
      postDetail.subreddit,
      postDetail?.id,
      commentIds,
      commentPath,
      childStartIndex,
    );
    setPostDetail((oldPostDetail) => {
      if (oldPostDetail) {
        const parent = getCommentFromPath(oldPostDetail, commentPath);
        parent.comments.push(...newComments);
        if (parent.loadMore) {
          parent.loadMore.childIds = parent.loadMore.childIds.filter(
            (childId) => !commentIds.includes(childId),
          );
        }
        return oldPostDetail;
      }
    });
  };

  const scrollToNextComment = async (goPrevious = false) => {
    if (!scrollView.current || !commentsView.current || !postDetail) return;
    const FUZZY_DISTANCE = 5;
    const scrollRef = scrollView.current;
    const scrollY = (await asyncMeasure(scrollRef, "measureInWindow"))[1];
    const currentScrollHeight = (
      await asyncMeasure(topOfScroll.current, "measureInWindow")
    )[1];
    const childComments = (commentsView.current as any).__internalInstanceHandle
      .child.child.child.child.memoizedProps[0];
    let prevDelta = 0;
    for (let i = 0; i < childComments.length; i++) {
      // When a filter is active, skip top-level threads that don't contain
      // any matching comments (checks the entire subtree).
      if (
        commentFilterMode !== "all" &&
        i < postDetail.comments.length &&
        !commentTreeMatchesFilter(postDetail.comments[i], commentFilterMode)
      ) {
        continue;
      }
      const commentView = childComments[i];
      const commentRef = commentView.props.commentPropRef.current;
      const commentMeasures = await asyncMeasure(commentRef, "measureInWindow");
      const commentY = commentMeasures[1];
      const delta = commentY - currentScrollHeight;
      if (
        commentY > scrollY &&
        !(Math.abs(commentY - scrollY) < FUZZY_DISTANCE)
      ) {
        scrollView.current.scrollTo({
          y: goPrevious ? prevDelta : delta,
          animated: true,
        });
        break;
      }
      if (commentY < scrollY - FUZZY_DISTANCE) {
        prevDelta = delta;
      }
    }
  };

  const collapseThread = async (comment: Comment) => {
    if (!postDetail) return;

    const currentScrollHeight = (
      await asyncMeasure(topOfScroll.current, "measureInWindow")
    )[1];
    const commentRef = (commentsView.current as any).__internalInstanceHandle
      .child.child.child.child.memoizedProps[0][comment.path[0]].props
      .commentPropRef.current;
    const commentMeasures = await asyncMeasure(commentRef, "measureInWindow");
    const commentY = commentMeasures[1];
    const delta = commentY - currentScrollHeight;
    scrollView.current?.scrollTo({
      y: delta,
      animated: true,
    });

    const topOfThread = getCommentFromPath(
      postDetail,
      comment.path.slice(0, 1),
    );
    changeComment({
      ...topOfThread,
      collapsed: true,
      renderCount: topOfThread.renderCount + 1,
    });
  };

  useEffect(() => {
    loadPostDetails();
  }, [url]);

  useEffect(() => {
    setScrollToNext(() => scrollToNextComment());
    setScrollToPrevious(() => scrollToNextComment(true));
    setScrollToParent(() => scrollToNextComment(true));
  }, [commentsView.current]);

  /**
   * The tintColor prop on the RefreshControl component is broken in React Native 0.81.5.
   * This is a workaround to fix the bug. Same fix is used in the RedditDataScroller component.
   * https://github.com/facebook/react-native/issues/53987
   */
  const [refreshControlColor, setRefreshControlColor] = useState<ColorValue>();
  useEffect(() => {
    setTimeout(() => {
      setRefreshControlColor(theme.text);
    }, 500);
  }, []);

  return (
    <View
      style={[
        styles.postDetailsOuterContainer,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {postDetail ? (
        <ScrollView
          ref={scrollView}
          contentInsetAdjustmentBehavior={
            shouldUseSystemContentInsets ? "automatic" : undefined
          }
          automaticallyAdjustContentInsets={
            shouldUseSystemContentInsets ? true : undefined
          }
          refreshControl={
            <RefreshControl
              tintColor={refreshControlColor}
              refreshing={refreshing}
              onRefresh={() => loadPostDetails()}
            />
          }
          scrollEnabled={!scrollDisabled}
          onScroll={handleScrollForTabBar}
          contentContainerStyle={{
            paddingBottom: 100,
          }}
        >
          <View ref={topOfScroll} />
          <PostDetailsComponent
            key={postDetail.id}
            postDetail={postDetail}
            loadPostDetails={loadPostDetails}
            setPostDetail={setPostDetail}
          />
          {deferredPostDetail && deferredPostDetail.comments.length > 0 && (
            <View style={styles.commentSearchContainer}>
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  if (commentSearchVisible) {
                    setCommentSearchFilter("");
                  }
                  setCommentSearchVisible(!commentSearchVisible);
                }}
                style={[
                  styles.commentSearchToggle,
                  { backgroundColor: theme.tint },
                ]}
              >
                <Feather
                  name="search"
                  size={16}
                  color={theme.text}
                />
                <Text style={[styles.commentSearchToggleText, { color: theme.text }]}>
                  {commentSearchVisible ? "Close" : "Search Comments"}
                </Text>
              </TouchableOpacity>
              <WatchThreadButton
                postId={postDetail.id}
                title={postDetail.title}
                subreddit={postDetail.subreddit}
                author={postDetail.author}
                commentCount={postDetail.commentCount}
                upvotes={postDetail.upvotes}
                url={postDetail.link}
                thumbnailURL={postDetail.imageThumbnail || null}
                postText={postDetail.text?.slice(0, 200) || null}
                color={theme.text}
                backgroundColor={theme.tint}
              />
            </View>
          )}
          {commentSearchVisible && (
            <SearchBar
              placeholder="Filter comments..."
              clearOnSearch={false}
              searchOnBlur={true}
              onSearch={(text) => setCommentSearchFilter(text)}
            />
          )}
          {deferredPostDetail && deferredPostDetail.comments.length > 0 ? (
            <Comments
              key={`${deferredPostDetail.id}-comments`}
              ref={commentsView}
              loadMoreComments={loadMoreCommentsFunc}
              postDetail={deferredPostDetail}
              scrollChange={scrollChange}
              changeComment={changeComment}
              deleteComment={deleteComment}
              collapseThread={collapseThread}
              searchFilter={commentSearchFilter}
            />
          ) : postDetail !== deferredPostDetail ? (
            <View key="loading-comments">
              <CommentSkeletonList count={5} />
            </View>
          ) : (
            <View key="no-comments" style={styles.noCommentsContainer}>
              <Text
                style={[
                  styles.noCommentsText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                No comments
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ActivityIndicator size="small" />
      )}
    </View>
  );
}

export default (props: PostDetailsProps) => {
  useEffect(() => {
    modifyStat(Stat.POSTS_VIEWED, 1);
  }, []);

  return (
    <ScrollToNextButtonProvider>
      <ScrollerProvider>
        <PostDetails {...props} />
      </ScrollerProvider>
    </ScrollToNextButtonProvider>
  );
};

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
  boldedSmallText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buttonsBarContainer: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  buttonsContainer: {
    padding: 3,
    borderRadius: 5,
  },
  showContextContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  loadingCommentsContainer: {
    marginVertical: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  noCommentsContainer: {
    marginVertical: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 15,
  },
  commentSearchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  commentSearchToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  commentSearchToggleText: {
    fontSize: 13,
  },
});
