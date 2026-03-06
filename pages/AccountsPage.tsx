import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useContext, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import Slideable from "../components/UI/Slideable";
import { AccountContext } from "../contexts/AccountContext";
import { ThemeContext } from "../contexts/SettingsContexts/ThemeContext";
import useContextMenu from "../utils/useContextMenu";
import KeyStore from "../utils/KeyStore";

function isAnimatedImageURI(uri?: string): boolean {
  if (!uri) return false;
  try {
    const parsed = new URL(uri);
    const pathname = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();
    return (
      /\.(gif|webp|apng)$/.test(pathname) ||
      pathname.endsWith(".gifv") ||
      search.includes("format=gif") ||
      search.includes("format=webp") ||
      search.includes("animated=true") ||
      search.includes("is_animated=true")
    );
  } catch {
    return false;
  }
}

export default function AccountsPage() {
  const { theme } = useContext(ThemeContext);
  const { currentUser, accounts, logIn, logOut, removeUser } =
    useContext(AccountContext);
  const openContextMenu = useContextMenu();
  const [loading, setLoading] = useState(false);

  const handleDelete = async (username: string) => {
    setLoading(true);
    await removeUser(username);
    setLoading(false);
  };

  return (
    <View
      style={[
        styles.accountsContainer,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {accounts.length ? (
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
        >
          {[...accounts, "Logged Out"].map((username) => (
            <Slideable
              key={username}
              options={[
                {
                  name: "delete",
                  icon: <Feather name="trash" style={{ fontSize: 24 }} />,
                  color: theme.delete,
                  action: async () => await handleDelete(username),
                },
              ]}
              rightNames={username === "Logged Out" ? undefined : ["delete"]}
            >
              <TouchableOpacity
                style={[
                  styles.accountItemContainer,
                  {
                    borderBottomColor: theme.divider,
                  },
                ]}
                activeOpacity={0.5}
                onPress={async () => {
                  setLoading(true);
                  if (username === "Logged Out") {
                    await logOut();
                  } else {
                    await logIn(username);
                  }
                  setLoading(false);
                }}
                onLongPress={async (e) => {
                  if (
                    username === "Logged Out" ||
                    e.nativeEvent.touches.length > 1
                  )
                    return;
                  const result = await openContextMenu({
                    options: ["Delete"],
                  });
                  if (result === "Delete") {
                    await handleDelete(username);
                  }
                }}
                accessibilityLabel={
                  username === "Logged Out" ? "" : `Log in as `
                }
                accessibilityState={{
                  selected:
                    currentUser?.userName === username ||
                    (!currentUser && username === "Logged Out"),
                }}
                accessibilityRole="button"
                accessibilityValue={{ text: username }}
                accessibilityActions={
                  username === "Logged Out"
                    ? []
                    : [{ name: "delete", label: `Delete account ${username}` }]
                }
                onAccessibilityAction={(event) => {
                  const action = event.nativeEvent.actionName;
                  if (action === "delete") {
                    handleDelete(username);
                  }
                }}
              >
                {username !== "Logged Out" ? (
                  (() => {
                    const avatarURL = KeyStore.getString(`avatarURL:${username}`);
                    return avatarURL ? (
                      <Image
                        source={avatarURL}
                        style={styles.avatar}
                        contentFit="cover"
                        autoplay={isAnimatedImageURI(avatarURL)}
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatarFallback,
                          { backgroundColor: theme.tint },
                        ]}
                      >
                        <Text style={[styles.avatarInitial, { color: theme.text }]}>
                          {username[0]?.toUpperCase() ?? "U"}
                        </Text>
                      </View>
                    );
                  })()
                ) : null}
                <Text
                  style={[
                    styles.accountItemText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {username}
                </Text>
                {(currentUser?.userName === username ||
                  (!currentUser && username === "Logged Out")) && (
                  <>
                    {loading ? (
                      <ActivityIndicator size="small" color={theme.text} />
                    ) : (
                      <Feather
                        name="check"
                        style={{
                          fontSize: 24,
                          color: theme.iconOrTextButton,
                          marginVertical: -5,
                        }}
                      />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </Slideable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noAccountsContainer}>
          <Text
            style={[
              styles.noAccountsText,
              {
                color: theme.text,
              },
            ]}
          >
            No accounts
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  accountsContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  noAccountsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noAccountsText: {
    fontSize: 18,
  },
  accountItemContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    gap: 12,
  },
  accountItemText: {
    flex: 1,
    fontSize: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "600",
  },
});
