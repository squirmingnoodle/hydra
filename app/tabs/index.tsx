import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Entypo,
  Feather,
} from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SplashScreen, useNavigation } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { BlurView } from "expo-blur";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NavigationContainerRef,
  StackActions,
  TabActions,
} from "@react-navigation/native";
import { Platform, View } from "react-native";

import LoadingSplash from "../../components/UI/LoadingSplash";
import { AccountContext } from "../../contexts/AccountContext";
import { InboxContext } from "../../contexts/InboxContext";
import { TabSettingsContext } from "../../contexts/SettingsContexts/TabSettingsContext";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import Stack from "../stack";
import { TAB_BAR_REMOVED_PADDING_BOTTOM } from "../../constants/TabBarPadding";
import { TabScrollContext } from "../../contexts/TabScrollContext";
import useHandleIncomingURLs from "../../utils/useHandleIncomingURLs";
import { AppNavigationProp } from "../../utils/navigationTypes";
import { expoDb } from "../../db";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import QuickSubredditSearch from "../../components/Modals/QuickSubredditSearch";
import { oneTimeAlert } from "../../utils/oneTimeAlert";
import useContextMenu from "../../utils/useContextMenu";

export type TabParamsList = {
  Posts: undefined;
  Inbox: undefined;
  Account: undefined;
  Search: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 70;

export default function Tabs() {
  if (__DEV__) {
    // Not a real conditional render since __DEV__ is a compile time constant
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDrizzleStudio(expoDb);
    // This is here because the db must be set up before the hook is used
  }

  const navigation = useNavigation<NavigationContainerRef<AppNavigationProp>>();
  const openContextMenu = useContextMenu();

  const { theme } = useContext(ThemeContext);
  const { loginInitialized, currentUser, accounts, logIn, logOut } =
    useContext(AccountContext);
  const { inboxCount } = useContext(InboxContext);
  const { showUsername, liquidGlassEnabled } = useContext(TabSettingsContext);
  const { tabBarTranslateY } = useContext(TabScrollContext);
  const insets = useSafeAreaInsets();

  const [showSubredditSearch, setShowSubredditSearch] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const showLiquidGlassTabBar = Platform.OS === "ios" && liquidGlassEnabled;
  const tabBarGlassTint =
    theme.systemModeStyle === "dark"
      ? "systemThinMaterialDark"
      : "systemThinMaterialLight";
  const tabBarGlassBackground =
    theme.systemModeStyle === "dark"
      ? "rgba(8, 10, 14, 0.03)"
      : "rgba(255, 255, 255, 0.02)";
  const tabBarGlassBorderColor =
    theme.systemModeStyle === "dark"
      ? "rgba(255, 255, 255, 0.32)"
      : "rgba(255, 255, 255, 0.78)";
  const tabBarGlassHighlightColor =
    theme.systemModeStyle === "dark"
      ? "rgba(255, 255, 255, 0.45)"
      : "rgba(255, 255, 255, 0.98)";
  const tabBarGlassBottomGlowColor =
    theme.systemModeStyle === "dark"
      ? "rgba(255, 255, 255, 0.18)"
      : "rgba(255, 255, 255, 0.56)";
  const tabBarGlassShadowColor =
    theme.systemModeStyle === "dark"
      ? "rgba(0, 0, 0, 0.42)"
      : "rgba(20, 30, 50, 0.14)";
  const tabBarGlassShadowOpacity = theme.systemModeStyle === "dark" ? 0.28 : 0.14;
  const tabBarLeftInset = showLiquidGlassTabBar
    ? Math.max(14, insets.left + 10)
    : 0;
  const tabBarRightInset = showLiquidGlassTabBar
    ? Math.max(14, insets.right + 10)
    : 0;
  const tabBarFloatingBottom = showLiquidGlassTabBar
    ? Math.max(14, insets.bottom - 10)
    : -TAB_BAR_REMOVED_PADDING_BOTTOM;

  useHandleIncomingURLs();

  useEffect(() => {
    if (loginInitialized) {
      SplashScreen.hideAsync();
    }
  }, [loginInitialized]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["right", "left"]}
    >
      <QuickSubredditSearch
        show={showSubredditSearch}
        onExit={() => setShowSubredditSearch(false)}
      />
      {loginInitialized ? (
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              position: "absolute",
              paddingHorizontal: showLiquidGlassTabBar ? 12 : 10,
              left: tabBarLeftInset,
              right: tabBarRightInset,
              bottom: tabBarFloatingBottom,
              height: showLiquidGlassTabBar ? 70 : undefined,
              paddingTop: showLiquidGlassTabBar ? 3 : 0,
              paddingBottom: showLiquidGlassTabBar ? 3 : 0,
              backgroundColor: showLiquidGlassTabBar
                ? "transparent"
                : theme.background,
              borderWidth: showLiquidGlassTabBar ? 1 : 0,
              borderColor: showLiquidGlassTabBar
                ? tabBarGlassBorderColor
                : "transparent",
              borderTopWidth: 0,
              borderRadius: showLiquidGlassTabBar ? 36 : 0,
              overflow: showLiquidGlassTabBar ? "hidden" : "visible",
              shadowColor: showLiquidGlassTabBar
                ? tabBarGlassShadowColor
                : "transparent",
              shadowOpacity: showLiquidGlassTabBar ? tabBarGlassShadowOpacity : 0,
                  shadowOffset: showLiquidGlassTabBar
                    ? { width: 0, height: 11 }
                    : { width: 0, height: 0 },
                  shadowRadius: showLiquidGlassTabBar ? 20 : 0,
                  elevation: showLiquidGlassTabBar ? 10 : 0,
              transform: [
                {
                  translateY: tabBarTranslateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, TAB_BAR_HEIGHT],
                  }),
                },
              ],
              opacity: tabBarTranslateY.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            },
            tabBarItemStyle: showLiquidGlassTabBar
                  ? {
                      paddingVertical: 3,
                    }
                  : undefined,
            tabBarIconStyle: showLiquidGlassTabBar
                  ? {
                      marginTop: 2,
                      transform: [{ scale: 1.2 }],
                    }
                  : undefined,
            tabBarLabelStyle: showLiquidGlassTabBar
                  ? {
                      fontSize: 12.5,
                      marginTop: 0,
                    }
                  : undefined,
            tabBarBackground: showLiquidGlassTabBar
              ? () => (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    <BlurView
                      tint={tabBarGlassTint}
                      intensity={88}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: tabBarGlassBackground,
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        top: 3,
                        left: 10,
                        right: 10,
                        height: 22,
                        borderRadius: 999,
                        backgroundColor:
                          theme.systemModeStyle === "dark"
                            ? "rgba(255, 255, 255, 0.14)"
                            : "rgba(255, 255, 255, 0.38)",
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        left: 16,
                        right: 16,
                        top: 0,
                        height: 1,
                        borderRadius: 999,
                        backgroundColor: tabBarGlassHighlightColor,
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        left: 18,
                        right: 18,
                        bottom: 1,
                        height: 1,
                        borderRadius: 999,
                        backgroundColor: tabBarGlassBottomGlowColor,
                      }}
                    />
                  </View>
                )
              : undefined,
            // This is broken in the latest version of react-navigation:
            // https://github.com/react-navigation/react-navigation/issues/12755
            // animation: 'fade',
          }}
          screenListeners={() => ({
            tabPress: (e) => {
              const state = navigation.getState();
              const stackItem = state.routes[state.index];
              const isCurrentTab = stackItem.key === e.target;
              const stackHeight = stackItem.state?.index;
              if (isCurrentTab && stackHeight && stackHeight > 0) {
                navigation.dispatch(StackActions.pop());
                e.preventDefault();
              }
              if (e.target?.startsWith("Search")) {
                oneTimeAlert(
                  "quickSearchGuideAlert",
                  "Did you know?",
                  "You can quick search for subreddits by long pressing the search tab.",
                );
              }
            },
            tabLongPress: (e) => {
              if (e.target?.startsWith("Search")) {
                setShowSubredditSearch(true);
                return;
              }

              if (!e.target?.startsWith("Account")) return;
              if (isSwitchingAccount) return;

              const switchableAccounts = accounts.filter(
                (username) =>
                  username.toLowerCase() !==
                  (currentUser?.userName.toLowerCase() ?? ""),
              );
              const accountOptions = [...switchableAccounts];

              if (currentUser) {
                accountOptions.push("Logged Out");
              }
              accountOptions.push("Manage Accounts");

              if (!accountOptions.length) return;

              (async () => {
                const selection = await openContextMenu({
                  options: accountOptions,
                });
                if (!selection) return;

                if (selection === "Manage Accounts") {
                  navigation.dispatch(TabActions.jumpTo("Account"));
                  navigation.dispatch(
                    StackActions.push("Accounts", {
                      url: "hydra://accounts",
                    }),
                  );
                  return;
                }

                setIsSwitchingAccount(true);
                try {
                  if (selection === "Logged Out") {
                    await logOut();
                  } else {
                    await logIn(selection);
                  }
                } finally {
                  setIsSwitchingAccount(false);
                }
              })();
            },
          })}
        >
          <Tab.Screen
            name="Posts"
            options={{
              title: "Posts",
              headerShown: false,
              tabBarIcon: ({ focused, size }) => (
                <MaterialCommunityIcons
                  name="post"
                  size={size}
                  color={focused ? theme.iconPrimary : theme.subtleText}
                />
              ),
              tabBarActiveTintColor: theme.iconOrTextButton as string,
              tabBarInactiveTintColor: theme.subtleText as string,
              tabBarLabel: "Posts",
            }}
            component={Stack}
          />
          <Tab.Screen
            name="Inbox"
            options={{
              title: "Inbox",
              headerShown: false,
              tabBarIcon: ({ focused, size }) => (
                <Entypo
                  name="mail"
                  size={size}
                  color={focused ? theme.iconPrimary : theme.subtleText}
                />
              ),
              tabBarActiveTintColor: theme.iconOrTextButton as string,
              tabBarInactiveTintColor: theme.subtleText as string,
              tabBarLabel: "Inbox",
              tabBarBadge: inboxCount > 0 ? inboxCount : undefined,
            }}
            component={Stack}
          />
          <Tab.Screen
            name="Account"
            options={{
              title: currentUser?.userName ?? "Accounts",
              headerShown: false,
              tabBarIcon: ({ focused, size }) => (
                <MaterialIcons
                  name="account-circle"
                  size={size}
                  color={focused ? theme.iconPrimary : theme.subtleText}
                />
              ),
              tabBarActiveTintColor: theme.iconOrTextButton as string,
              tabBarInactiveTintColor: theme.subtleText as string,
              tabBarLabel: showUsername
                ? (currentUser?.userName ?? "Account")
                : "Account",
            }}
            component={Stack}
          />
          <Tab.Screen
            name="Search"
            options={{
              title: "Search",
              headerShown: false,
              tabBarIcon: ({ focused, size }) => (
                <Feather
                  name="search"
                  size={size}
                  color={focused ? theme.iconPrimary : theme.subtleText}
                />
              ),
              tabBarActiveTintColor: theme.iconOrTextButton as string,
              tabBarInactiveTintColor: theme.subtleText as string,
              tabBarLabel: "Search",
            }}
            component={Stack}
          />
          <Tab.Screen
            name="Settings"
            options={{
              title: "Settings",
              headerShown: false,
              tabBarIcon: ({ focused, size }) => (
                <Ionicons
                  name="settings-sharp"
                  size={size}
                  color={focused ? theme.iconPrimary : theme.subtleText}
                />
              ),
              tabBarActiveTintColor: theme.iconOrTextButton as string,
              tabBarInactiveTintColor: theme.subtleText as string,
              tabBarLabel: "Settings",
            }}
            component={Stack}
          />
        </Tab.Navigator>
      ) : (
        <LoadingSplash />
      )}
    </SafeAreaView>
  );
}
