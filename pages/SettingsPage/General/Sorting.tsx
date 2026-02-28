import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  ColorValue,
  Switch,
  View,
  TouchableOpacity,
  Text,
} from "react-native";

import List from "../../../components/UI/List";
import {
  DEFAULT_COMMENT_SORT_KEY,
  DEFAULT_POST_SORT_KEY,
  DEFAULT_POST_SORT_TOP_KEY,
  REMEMBER_COMMENT_SUBREDDIT_SORT_KEY,
  REMEMBER_POST_SUBREDDIT_SORT_KEY,
  SORT_HOME_PAGE,
} from "../../../constants/SettingsKeys";
import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";
import KeyStore from "../../../utils/KeyStore";
import { useSettingsPicker } from "../../../utils/useSettingsPicker";
import {
  makeAccountScopedSettingPrefix,
  useAccountScopedMMKVBoolean,
  useAccountScopedMMKVString,
} from "../../../utils/accountScopedSettings";

const POST_SORT_OPTIONS = [
  {
    label: "Default",
    value: "default",
  },
  {
    label: "Best",
    value: "best",
  },
  {
    label: "Hot",
    value: "hot",
  },
  {
    label: "New",
    value: "new",
  },
  {
    label: "Top",
    value: "top",
  },
  {
    label: "Rising",
    value: "rising",
  },
];

const TOP_SORT_OPTIONS = [
  {
    label: "Hour",
    value: "hour",
  },
  {
    label: "Day",
    value: "day",
  },
  {
    label: "Week",
    value: "week",
  },
  {
    label: "Month",
    value: "month",
  },
  {
    label: "Year",
    value: "year",
  },
  {
    label: "All Time",
    value: "all",
  },
];

const COMMENT_SORT_OPTIONS = [
  {
    label: "Default",
    value: "default",
  },
  {
    label: "Best",
    value: "best",
  },
  {
    label: "New",
    value: "new",
  },
  {
    label: "Top",
    value: "top",
  },
  {
    label: "Controversial",
    value: "controversial",
  },
  {
    label: "Old",
    value: "old",
  },
  {
    label: "Q&A",
    value: "qa",
  },
];

const LEGACY_POST_SUBREDDIT_SORT_PREFIX = "PostSubredditSort-";
const LEGACY_POST_SUBREDDIT_SORT_TOP_PREFIX = "PostSubredditSortTop-";
const LEGACY_COMMENT_SUBREDDIT_SORT_PREFIX = "CommentSubredditSort-";

export default function General() {
  const { theme } = useContext(ThemeContext);

  const [storedDefaultPostSort, setDefaultPostSort] = useAccountScopedMMKVString(
    DEFAULT_POST_SORT_KEY,
  );
  const [storedDefaultPostSortTop, setDefaultPostSortTop] =
    useAccountScopedMMKVString(DEFAULT_POST_SORT_TOP_KEY);
  const [storedRememberPostSubredditSort, setRememberPostSubredditSort] =
    useAccountScopedMMKVBoolean(REMEMBER_POST_SUBREDDIT_SORT_KEY);
  const [storedDefaultCommentSort, setDefaultCommentSort] =
    useAccountScopedMMKVString(DEFAULT_COMMENT_SORT_KEY);
  const [storedRememberCommentSubredditSort, setRememberCommentSubredditSort] =
    useAccountScopedMMKVBoolean(REMEMBER_COMMENT_SUBREDDIT_SORT_KEY);
  const [storedSortHomePage, setSortHomePage] =
    useAccountScopedMMKVBoolean(SORT_HOME_PAGE);

  const defaultPostSort = storedDefaultPostSort ?? "default";
  const defaultPostSortTop = storedDefaultPostSortTop ?? "all";
  const rememberPostSubredditSort = storedRememberPostSubredditSort ?? false;
  const defaultCommentSort = storedDefaultCommentSort ?? "default";
  const rememberCommentSubredditSort =
    storedRememberCommentSubredditSort ?? false;
  const sortHomePage = storedSortHomePage ?? false;

  const {
    openPicker: openDefaultPostSortPicker,
    rightIcon: rightIconDefaultPostSort,
  } = useSettingsPicker({
    items: POST_SORT_OPTIONS,
    value: defaultPostSort,
    onChange: setDefaultPostSort,
  });

  const {
    openPicker: openDefaultPostSortTopPicker,
    rightIcon: rightIconDefaultPostSortTop,
  } = useSettingsPicker({
    items: TOP_SORT_OPTIONS,
    value: defaultPostSortTop,
    onChange: setDefaultPostSortTop,
  });

  const {
    openPicker: openDefaultCommentSortPicker,
    rightIcon: rightIconDefaultCommentSort,
  } = useSettingsPicker({
    items: COMMENT_SORT_OPTIONS,
    value: defaultCommentSort,
    onChange: setDefaultCommentSort,
  });

  const accountScopedPrefix = makeAccountScopedSettingPrefix();
  const scopedPostSubredditSortPrefix =
    `${accountScopedPrefix}${LEGACY_POST_SUBREDDIT_SORT_PREFIX}`;
  const scopedPostSubredditSortTopPrefix =
    `${accountScopedPrefix}${LEGACY_POST_SUBREDDIT_SORT_TOP_PREFIX}`;
  const scopedCommentSubredditSortPrefix =
    `${accountScopedPrefix}${LEGACY_COMMENT_SUBREDDIT_SORT_PREFIX}`;

  const [numRememberedPostSubreddits, setNumRememberedPostSubreddits] =
    useState(0);
  const [numRememberedCommentSubreddits, setNumRememberedCommentSubreddits] =
    useState(0);

  useEffect(() => {
    const keys = KeyStore.getAllKeys();

    keys.forEach((legacyKey) => {
      if (
        !legacyKey.startsWith(LEGACY_POST_SUBREDDIT_SORT_PREFIX) &&
        !legacyKey.startsWith(LEGACY_POST_SUBREDDIT_SORT_TOP_PREFIX) &&
        !legacyKey.startsWith(LEGACY_COMMENT_SUBREDDIT_SORT_PREFIX)
      ) {
        return;
      }

      const scopedKey = `${accountScopedPrefix}${legacyKey}`;
      if (KeyStore.contains(scopedKey)) {
        return;
      }

      const legacyValue = KeyStore.getString(legacyKey);
      if (legacyValue !== undefined) {
        KeyStore.set(scopedKey, legacyValue);
      }
    });

    const scopedKeys = KeyStore.getAllKeys();
    setNumRememberedPostSubreddits(
      scopedKeys.filter((key) => key.startsWith(scopedPostSubredditSortPrefix))
        .length,
    );
    setNumRememberedCommentSubreddits(
      scopedKeys.filter((key) =>
        key.startsWith(scopedCommentSubredditSortPrefix),
      ).length,
    );
  }, [
    accountScopedPrefix,
    scopedCommentSubredditSortPrefix,
    scopedPostSubredditSortPrefix,
  ]);

  const clearRememberedPostSubredditSorts = () => {
    const keys = KeyStore.getAllKeys();
    keys.forEach((key) => {
      if (
        key.startsWith(scopedPostSubredditSortPrefix) ||
        key.startsWith(scopedPostSubredditSortTopPrefix)
      ) {
        KeyStore.delete(key);
      }
    });
    setNumRememberedPostSubreddits(0);
  };

  const clearRememberedCommentSubredditSorts = () => {
    const keys = KeyStore.getAllKeys();
    keys.forEach((key) => {
      if (key.startsWith(scopedCommentSubredditSortPrefix)) {
        KeyStore.delete(key);
      }
    });
    setNumRememberedCommentSubreddits(0);
  };

  return (
    <>
      <List
        title="Posts"
        items={[
          {
            key: "defaultPostSort",
            icon: (
              <FontAwesome
                name="sort-amount-desc"
                size={24}
                color={theme.text}
              />
            ),
            text: "Default sort",
            rightIcon: rightIconDefaultPostSort,
            onPress: () => openDefaultPostSortPicker(),
          },
          ...(defaultPostSort === "top"
            ? [
                {
                  key: "defaultPostSortTop",
                  icon: (
                    <MaterialCommunityIcons
                      name="podium-gold"
                      size={24}
                      color={theme.text}
                    />
                  ),
                  text: "Default top sort",
                  rightIcon: rightIconDefaultPostSortTop,
                  onPress: () => openDefaultPostSortTopPicker(),
                },
              ]
            : []),
          {
            key: "sortHomePage",
            icon: <FontAwesome name="home" size={24} color={theme.text} />,
            rightIcon: (
              <Switch
                trackColor={{
                  false: theme.iconSecondary as ColorValue,
                  true: theme.iconPrimary as ColorValue,
                }}
                value={sortHomePage}
                onValueChange={() => setSortHomePage(!sortHomePage)}
              />
            ),
            text: "Apply sort to home",
            onPress: () => setSortHomePage(!sortHomePage),
          },
          {
            key: "rememberPostSubredditSort",
            icon: <FontAwesome name="save" size={24} color={theme.text} />,
            rightIcon: (
              <Switch
                trackColor={{
                  false: theme.iconSecondary as ColorValue,
                  true: theme.iconPrimary as ColorValue,
                }}
                value={rememberPostSubredditSort}
                onValueChange={() =>
                  setRememberPostSubredditSort(!rememberPostSubredditSort)
                }
              />
            ),
            text: "Remember subreddit sort",
            onPress: () =>
              setRememberPostSubredditSort(!rememberPostSubredditSort),
          },
        ]}
      />
      {rememberPostSubredditSort && numRememberedPostSubreddits > 0 && (
        <View style={styles.clearButtonContainer}>
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor: theme.buttonBg,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              clearRememberedPostSubredditSorts();
            }}
          >
            <Text
              style={[
                styles.clearButtonText,
                {
                  color: theme.buttonText,
                },
              ]}
            >
              Clear custom post sorts ({numRememberedPostSubreddits} sub
              {numRememberedPostSubreddits === 1 ? "" : "s"})
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <List
        title="Comments"
        items={[
          {
            key: "defaultCommentSort",
            icon: (
              <FontAwesome
                name="sort-amount-desc"
                size={24}
                color={theme.text}
              />
            ),
            text: "Default sort",
            rightIcon: rightIconDefaultCommentSort,
            onPress: () => openDefaultCommentSortPicker(),
          },
          {
            key: "rememberCommentSubredditSort",
            icon: <FontAwesome name="save" size={24} color={theme.text} />,
            rightIcon: (
              <Switch
                trackColor={{
                  false: theme.iconSecondary as ColorValue,
                  true: theme.iconPrimary as ColorValue,
                }}
                value={rememberCommentSubredditSort}
                onValueChange={() =>
                  setRememberCommentSubredditSort(!rememberCommentSubredditSort)
                }
              />
            ),
            text: "Remember subreddit sort",
            onPress: () =>
              setRememberCommentSubredditSort(!rememberCommentSubredditSort),
          },
        ]}
      />
      {rememberCommentSubredditSort && numRememberedCommentSubreddits > 0 && (
        <View style={styles.clearButtonContainer}>
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor: theme.iconOrTextButton,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              clearRememberedCommentSubredditSorts();
            }}
          >
            <Text
              style={[
                styles.clearButtonText,
                {
                  color: theme.text,
                },
              ]}
            >
              Clear custom comment sorts ({numRememberedCommentSubreddits} sub
              {numRememberedCommentSubreddits === 1 ? "" : "s"})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  clearButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  clearButton: {
    padding: 10,
    borderRadius: 10,
  },
  clearButtonText: {
    fontSize: 16,
  },
});
