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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  NavigationContainerRef,
  StackActions,
  TabActions,
} from "@react-navigation/native";
import { Platform } from "react-native";

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

const TAB_BAR_HEIGHT = 90;

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

  const [showSubredditSearch, setShowSubredditSearch] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const showLiquidGlassTabBar = Platform.OS === "ios" && liquidGlassEnabled;
  const tabBarGlassTint = theme.systemModeStyle === "dark" ? "dark" : "light";
  const tabBarGlassBackground =
    theme.systemModeStyle === "dark"
      ? "rgba(18, 18, 20, 0.72)"
      : "rgba(250, 250, 252, 0.78)";

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
              paddingHorizontal: 10,
              bottom: -TAB_BAR_REMOVED_PADDING_BOTTOM,
              backgroundColor: showLiquidGlassTabBar
                ? tabBarGlassBackground
                : theme.background,
              borderTopWidth: 0,
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
            tabBarBackground: showLiquidGlassTabBar
              ? () => (
                  <BlurView
                    tint={tabBarGlassTint}
                    intensity={45}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />
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
