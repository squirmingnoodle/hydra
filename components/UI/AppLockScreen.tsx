import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { AppLockContext } from "../../contexts/AppLockContext";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";

export default function AppLockScreen() {
  const { isLocked, lockEnabled, unlock } = useContext(AppLockContext);
  const { theme, systemColorScheme } = useContext(ThemeContext);

  if (!isLocked || !lockEnabled) return null;

  return (
    <BlurView
      intensity={80}
      tint={systemColorScheme === "dark" ? "dark" : "light"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View
          style={[styles.iconContainer, { backgroundColor: theme.iconPrimary }]}
        >
          <Feather name="lock" size={32} color="#fff" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Hydra is Locked</Text>
        <Text style={[styles.subtitle, { color: theme.subtleText }]}>
          Authenticate to continue
        </Text>
        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: theme.iconPrimary }]}
          onPress={unlock}
          activeOpacity={0.8}
        >
          <Feather name="unlock" size={18} color="#fff" />
          <Text style={styles.unlockText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 15,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  unlockText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
