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
    { key: "posts", label: "Posts" },
    { key: "comments", label: "Comments" },
    { key: "overview", label: "About" },
    ...(showSavedTab ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: "#f8f8f8",
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
            style={styles.tabButton}
            onPress={() => onSelectTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isSelected ? theme.text : theme.verySubtleText,
                },
              ]}
            >
              {tab.label}
            </Text>
            {isSelected && (
              <View
                style={[
                  styles.selectedIndicator,
                  {
                    backgroundColor: theme.iconPrimary,
                  },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    paddingTop: 13,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 19,
    fontWeight: "600",
  },
  selectedIndicator: {
    position: "absolute",
    left: "26%",
    right: "26%",
    bottom: 0,
    height: 3,
    borderRadius: 2,
  },
});
