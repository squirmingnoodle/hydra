import React, { useContext } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DataModeContext } from "../../contexts/SettingsContexts/DataModeContext";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";

/**
 * Small banner that appears at the top of the screen when the device is offline.
 * Rendered in the stack layout so it appears on every page.
 */
export default function OfflineBanner() {
  const { isConnected } = useContext(DataModeContext);
  const { theme } = useContext(ThemeContext);

  if (isConnected !== false) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: theme.downvote }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
    >
      <Feather name="wifi-off" size={14} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
});
