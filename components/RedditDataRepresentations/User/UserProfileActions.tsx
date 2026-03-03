import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";

type UserProfileActionsProps = {
  onEditProfile: () => void;
  onShareProfile: () => void;
  onAddAccount: () => void;
};

export default function UserProfileActions({
  onEditProfile,
  onShareProfile,
  onAddAccount,
}: UserProfileActionsProps) {
  const { theme } = useContext(ThemeContext);
  const actions = [
    {
      key: "editProfile",
      label: "Edit Profile",
      icon: <Feather name="edit-2" size={16} color={theme.text} />,
      onPress: onEditProfile,
    },
    {
      key: "shareProfile",
      label: "Share",
      icon: <Feather name="share-2" size={16} color={theme.text} />,
      onPress: onShareProfile,
    },
    {
      key: "addAccount",
      label: "Add Account",
      icon: <Ionicons name="person-add-outline" size={16} color={theme.text} />,
      onPress: onAddAccount,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          activeOpacity={0.8}
          onPress={action.onPress}
          style={[
            styles.button,
            {
              backgroundColor: theme.tint,
              borderColor: theme.divider,
            },
          ]}
        >
          {action.icon}
          <Text
            style={[
              styles.buttonText,
              {
                color: theme.text,
              },
            ]}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
