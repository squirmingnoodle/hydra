import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";

type UserProfileShortcutsProps = {
  userName: string;
  onOpenURL: (url: string) => void;
};

export default function UserProfileShortcuts({
  userName,
  onOpenURL,
}: UserProfileShortcutsProps) {
  const { theme } = useContext(ThemeContext);
  const shortcuts = [
    {
      key: "hidden",
      label: "Hidden",
      icon: <Feather name="eye-off" size={18} color={theme.iconPrimary} />,
      url: `https://www.reddit.com/user/${userName}/hidden`,
    },
    {
      key: "upvoted",
      label: "Upvoted",
      icon: <Feather name="thumbs-up" size={18} color={theme.iconPrimary} />,
      url: `https://www.reddit.com/user/${userName}/upvoted`,
    },
    {
      key: "downvoted",
      label: "Downvoted",
      icon: <Feather name="thumbs-down" size={18} color={theme.iconPrimary} />,
      url: `https://www.reddit.com/user/${userName}/downvoted`,
    },
    {
      key: "savedPosts",
      label: "Saved Posts",
      icon: <Feather name="bookmark" size={18} color={theme.iconPrimary} />,
      url: `https://www.reddit.com/user/${userName}/saved?type=links`,
    },
    {
      key: "savedComments",
      label: "Saved Comments",
      icon: (
        <MaterialCommunityIcons
          name="comment-bookmark-outline"
          size={18}
          color={theme.iconPrimary}
        />
      ),
      url: `https://www.reddit.com/user/${userName}/saved?type=comments`,
    },
  ];

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            color: theme.subtleText,
          },
        ]}
      >
        Shortcuts
      </Text>
      <View style={styles.grid}>
        {shortcuts.map((shortcut) => (
          <TouchableOpacity
            key={shortcut.key}
            accessibilityRole="button"
            accessibilityLabel={`Open ${shortcut.label}`}
            activeOpacity={0.8}
            style={[
              styles.card,
              {
                backgroundColor: theme.tint,
                borderColor: theme.divider,
              },
            ]}
            onPress={() => onOpenURL(shortcut.url)}
          >
            {shortcut.icon}
            <Text
              style={[
                styles.cardText,
                {
                  color: theme.text,
                },
              ]}
            >
              {shortcut.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  title: {
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
