import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import * as QuickActions from "expo-quick-actions";
import React, { useContext, useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";

import RedditURL, { PageType } from "./RedditURL";
import { NativeShareData } from "./nativeShareData";
import { PageTypeToNavName } from "./navigation";
import {
  READ_CLIPBOARD_DEFAULT,
  READ_CLIPBOARD_KEY,
} from "../pages/SettingsPage/General/OpenInHydra";
import { AppNavigationProp } from "./navigationTypes";
import {
  NavigationContainerRef,
  StackActions,
  TabActions,
  useNavigation,
} from "@react-navigation/native";
import { getAccountScopedBoolean } from "./accountScopedSettings";
import { ModalContext } from "../contexts/ModalContext";
import ShareToReddit from "../components/Modals/ShareToReddit";

export default function useHandleIncomingURLs() {
  const navigation = useNavigation<NavigationContainerRef<AppNavigationProp>>();
  const { setModal } = useContext(ModalContext);
  const isAsking = useRef(false);

  const handleURL = (url: string) => {
    const pageType = RedditURL.getPageType(url);
    if (pageType === PageType.UNKNOWN) {
      Alert.alert("Unknown URL", `The URL ${url} cannot be handled by Hydra.`);
      return;
    }
    navigation.dispatch(TabActions.jumpTo("Posts"));
    navigation.dispatch(
      StackActions.push(PageTypeToNavName[pageType], {
        url: url,
      }),
    );
  };

  const handleShareDeepLink = async () => {
    const shared = await NativeShareData.getSharedContent();
    if (!shared) return;
    setModal(
      React.createElement(ShareToReddit, {
        sharedURL: shared.url,
        sharedText: shared.text,
        onPosted: (url: string) => handleURL(url),
      }),
    );
  };

  const handleDeepLink = (deepLink: string) => {
    if (!deepLink) return;
    if (deepLink.toLowerCase().startsWith("hydra://share")) {
      handleShareDeepLink();
      return;
    }
    if (!deepLink.toLowerCase().startsWith("hydra://openurl?url=")) return;
    const url = deepLink.replace(/hydra:\/\/openurl\?url=/i, "");
    handleURL(url);
  };

  const handleQuickAction = (action: QuickActions.Action) => {
    switch (action.id) {
      case "search":
        navigation.dispatch(TabActions.jumpTo("Search"));
        break;
      case "inbox":
        navigation.dispatch(TabActions.jumpTo("Inbox"));
        break;
      case "new_post":
        navigation.dispatch(TabActions.jumpTo("Posts"));
        break;
    }
  };

  const handleClipboardURL = async () => {
    const canReadClipboard =
      getAccountScopedBoolean(READ_CLIPBOARD_KEY) ?? READ_CLIPBOARD_DEFAULT;
    if (!canReadClipboard) return;
    if (isAsking.current) return;
    isAsking.current = true;
    const clipboardURL = await Clipboard.getUrlAsync();
    if (!clipboardURL) return;
    try {
      new RedditURL(clipboardURL);
    } catch (_e) {
      // Not a Reddit URL Hydra can handle
      return;
    }
    Alert.alert(
      "Open Reddit URL?",
      `A Reddit URL was detected on your clipboard. Would you like to open it?\n\n ${clipboardURL}`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            Clipboard.setUrlAsync("");
            isAsking.current = false;
          },
        },
        {
          text: "Open",
          onPress: () => {
            Clipboard.setUrlAsync("");
            handleURL(clipboardURL);
            isAsking.current = false;
          },
        },
      ],
    );
  };

  useEffect(() => {
    handleClipboardURL();
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          handleClipboardURL();
        }
      },
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const startupLinkHandler = () => {
      const deepLink = Linking.getLinkingURL();
      if (deepLink) {
        handleDeepLink(deepLink);
      }
      // Handle quick action that opened the app (cold start)
      if (QuickActions.initial) {
        handleQuickAction(QuickActions.initial);
      }
    };
    navigation.addListener("ready", startupLinkHandler);
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });
    return () => {
      subscription.remove();
      navigation.removeListener("ready", startupLinkHandler);
    };
  }, []);

  // Set up quick actions and listener
  useEffect(() => {
    QuickActions.setItems([
      {
        id: "search",
        title: "Search",
        subtitle: "Search Reddit",
        icon: Platform.OS === "ios" ? "symbol:magnifyingglass" : undefined,
      },
      {
        id: "inbox",
        title: "Inbox",
        subtitle: "Check your messages",
        icon: Platform.OS === "ios" ? "symbol:tray.fill" : undefined,
      },
      {
        id: "new_post",
        title: "New Post",
        subtitle: "Create a new post",
        icon: Platform.OS === "ios" ? "symbol:square.and.pencil" : undefined,
      },
    ]);

    const subscription = QuickActions.addListener(handleQuickAction);
    return () => subscription.remove();
  }, []);
}
