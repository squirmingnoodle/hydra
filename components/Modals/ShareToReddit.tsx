import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { submitPost } from "../../api/PostDetail";
import { ModalContext } from "../../contexts/ModalContext";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import { NativeShareData } from "../../utils/nativeShareData";

type ShareToRedditProps = {
  sharedURL?: string;
  sharedText?: string;
  onPosted?: (url: string) => void;
};

export default function ShareToReddit({
  sharedURL,
  sharedText,
  onPosted,
}: ShareToRedditProps) {
  const { theme } = useContext(ThemeContext);
  const { setModal } = useContext(ModalContext);
  const { width, height } = useWindowDimensions();

  const [subreddit, setSubreddit] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState(sharedURL ?? "");
  const [text, setText] = useState(sharedText ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLink = !!sharedURL;

  useEffect(() => {
    return () => {
      NativeShareData.clearSharedContent();
    };
  }, []);

  const submit = async () => {
    if (!subreddit.trim()) {
      Alert.alert("Missing Subreddit", "Please enter a subreddit name.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your post.");
      return;
    }

    setIsSubmitting(true);
    try {
      const kind = isLink ? "link" : "self";
      const content = isLink ? url : text;
      const newPostUrl = await submitPost(
        subreddit.trim(),
        kind,
        title.trim(),
        content,
      );
      NativeShareData.clearSharedContent();
      if (newPostUrl) {
        onPosted?.(newPostUrl);
      } else {
        Alert.alert("Submitted!", "Post is being processed.");
      }
      setModal(undefined);
    } catch (e: any) {
      Alert.alert("Failed to submit", e?.message ?? "Unknown error");
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, width, height },
      ]}
    >
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, { borderBottomColor: theme.tint }]}>
          <TouchableOpacity
            style={[styles.topBarBtn, { left: 0 }]}
            onPress={() => {
              NativeShareData.clearSharedContent();
              setModal(undefined);
            }}
          >
            <Text style={[styles.btnText, { color: theme.iconOrTextButton }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: theme.text }]}>
            Share to Reddit
          </Text>
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={theme.iconOrTextButton}
              style={{ position: "absolute", right: 0 }}
            />
          ) : (
            <TouchableOpacity
              style={[styles.topBarBtn, { right: 0 }]}
              onPress={submit}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: theme.iconOrTextButton, textAlign: "right" },
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fields}>
          <TextInput
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.tint },
            ]}
            placeholder="Subreddit (e.g. apple)"
            placeholderTextColor={theme.verySubtleText}
            value={subreddit}
            onChangeText={setSubreddit}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.tint },
            ]}
            placeholder="Title"
            placeholderTextColor={theme.verySubtleText}
            value={title}
            onChangeText={setTitle}
          />
          {isLink ? (
            <View
              style={[
                styles.urlPreview,
                { backgroundColor: theme.tint },
              ]}
            >
              <Text style={[styles.urlLabel, { color: theme.subtleText }]}>
                Link
              </Text>
              <Text
                style={[styles.urlText, { color: theme.text }]}
                numberOfLines={2}
              >
                {url}
              </Text>
            </View>
          ) : (
            <TextInput
              style={[
                styles.textArea,
                { color: theme.text, backgroundColor: theme.tint },
              ]}
              placeholder="Text (optional)"
              placeholderTextColor={theme.verySubtleText}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    zIndex: 1,
    paddingVertical: 10,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 5,
    paddingBottom: 10,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    position: "relative",
  },
  topBarBtn: {
    position: "absolute",
  },
  topBarTitle: {
    fontSize: 18,
  },
  btnText: {
    fontSize: 18,
    width: 100,
  },
  fields: {
    padding: 10,
    gap: 10,
  },
  input: {
    fontSize: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  urlPreview: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  urlLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 14,
  },
  textArea: {
    fontSize: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    minHeight: 120,
  },
});
