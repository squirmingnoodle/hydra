import React, { useEffect, useState } from "react";
import { Alert, ColorValue, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import { NativeLiveActivity } from "../../utils/nativeLiveActivity";
import {
  isWatchingThread,
  startWatchingThread,
  stopWatchingThread,
} from "../../utils/threadWatcher";

type WatchThreadButtonProps = {
  postId: string;
  title: string;
  subreddit: string;
  author: string;
  commentCount: number;
  upvotes: number;
  url: string;
  thumbnailURL: string | null;
  postText: string | null;
  color: ColorValue;
  backgroundColor: ColorValue;
};

export default function WatchThreadButton({
  postId,
  title,
  subreddit,
  author,
  commentCount,
  upvotes,
  url,
  thumbnailURL,
  postText,
  color,
  backgroundColor,
}: WatchThreadButtonProps) {
  const [available, setAvailable] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    NativeLiveActivity.isAvailable().then(setAvailable);
    setWatching(isWatchingThread(postId));
  }, [postId]);

  if (!available) return null;

  const handlePress = async () => {
    if (watching) {
      await stopWatchingThread(postId);
      setWatching(false);
    } else {
      const started = await startWatchingThread(
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
      if (started) {
        setWatching(true);
      } else {
        Alert.alert(
          "Unable to Watch",
          "Live Activities may be disabled in Settings.",
        );
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Feather
        name={watching ? "eye-off" : "eye"}
        size={14}
        color={color}
      />
      <Text style={[styles.text, { color }]}>
        {watching ? "Stop Watching" : "Watch Thread"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
  },
});
