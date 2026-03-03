import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";

export type UserProfilePrimaryTab = "overview" | "posts" | "comments" | "saved";

type UserProfilePrimaryTabsProps = {
  selectedTab: UserProfilePrimaryTab;
  showSavedTab: boolean;
  onSelectTab: (tab: UserProfilePrimaryTab) => void;
};

export default function UserProfilePrimaryTabs({
  selectedTab,
  showSavedTab,
  onSelectTab,
}: UserProfilePrimaryTabsProps) {
  const { theme } = useContext(ThemeContext);
  const tabs: { key: UserProfilePrimaryTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "posts", label: "Posts" },
    { key: "comments", label: "Comments" },
    ...(showSavedTab ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: theme.tint,
          borderColor: theme.divider,
        },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Profile sections"
    >
      {tabs.map((tab) => {
        const isSelected = tab.key === selectedTab;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Open ${tab.label} tab`}
            activeOpacity={0.8}
            style={[
              styles.tabButton,
              {
                backgroundColor: isSelected ? theme.iconPrimary : "transparent",
              },
            ]}
            onPress={() => onSelectTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isSelected ? theme.text : theme.subtleText,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
