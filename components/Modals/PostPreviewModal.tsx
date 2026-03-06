import React, { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getPostsDetail, PostDetail } from "../../api/PostDetail";
import { Post } from "../../api/Posts";
import PostMedia from "../RedditDataRepresentations/Post/PostParts/PostMedia";
import RenderHtml from "../HTML/RenderHTML";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import { ModalContext } from "../../contexts/ModalContext";
import { useURLNavigation } from "../../utils/navigation";

export default function PostPreviewModal({ post }: { post: Post }) {
  const { theme } = useContext(ThemeContext);
  const { setModal } = useContext(ModalContext);
  const { pushURL } = useURLNavigation();

  const [postDetail, setPostDetail] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const detail = await getPostsDetail(post.link, { limit: 5 });
        if (detail) setPostDetail(detail);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          Preview
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => {
              setModal(undefined);
              pushURL(post.link);
            }}
            style={[styles.openButton, { backgroundColor: theme.iconOrTextButton }]}
          >
            <Text style={[styles.openButtonText, { color: theme.background }]}>
              Open Full
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModal(undefined)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Feather name="x" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {post.title}
        </Text>

        <Text style={[styles.metadata, { color: theme.subtleText }]}>
          r/{post.subreddit} · {post.author} · {post.timeSince}
        </Text>

        <PostMedia post={post} maxLines={10} renderHTML={true} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
          </View>
        ) : postDetail && postDetail.comments.length > 0 ? (
          <View style={[styles.commentsSection, { borderTopColor: theme.divider }]}>
            <Text style={[styles.commentsTitle, { color: theme.subtleText }]}>
              Top Comments
            </Text>
            {postDetail.comments.slice(0, 5).map((comment) => (
              <View
                key={comment.id}
                style={[
                  styles.commentContainer,
                  { borderTopColor: theme.divider },
                ]}
              >
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: comment.isOP ? theme.iconOrTextButton : theme.text }]}>
                    {comment.author}
                  </Text>
                  <Text style={[styles.commentScore, { color: theme.subtleText }]}>
                    {comment.upvotes} pts · {comment.shortTimeSince}
                  </Text>
                </View>
                {comment.type === "comment" && (
                  <RenderHtml html={comment.html} subreddit={post.subreddit} />
                )}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: "hidden",
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  openButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  openButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  metadata: {
    fontSize: 13,
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  commentsSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentsTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  commentContainer: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "500",
  },
  commentScore: {
    fontSize: 12,
  },
});
