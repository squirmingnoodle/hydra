import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";

export type UserSavedTypeTab = "posts" | "comments";

type UserProfileSavedTypeTabsProps = {
  selectedTab: UserSavedTypeTab;
  onSelectTab: (tab: UserSavedTypeTab) => void;
};

export default function UserProfileSavedTypeTabs({
  selectedTab,
  onSelectTab,
}: UserProfileSavedTypeTabsProps) {
  const { theme } = useContext(ThemeContext);
  const tabs: { key: UserSavedTypeTab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "comments", label: "Comments" },
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
      accessibilityLabel="Saved content type"
    >
      {tabs.map((tab) => {
        const isSelected = tab.key === selectedTab;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Show saved ${tab.label.toLowerCase()}`}
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
