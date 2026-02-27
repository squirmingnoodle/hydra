import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Directory } from "expo-file-system/next";
import React, { useContext, useEffect } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import {
  DOWNLOAD_DESTINATION_DEFAULT,
  DOWNLOAD_DESTINATION_KEY,
  DOWNLOAD_FILES_ROOT_URI_KEY,
  DOWNLOAD_LONG_PRESS_ACTION_DEFAULT,
  DOWNLOAD_LONG_PRESS_ACTION_KEY,
  DownloadDestination,
  MediaLongPressAction,
} from "../../../constants/Downloads";
import List from "../../../components/UI/List";
import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";
import { useSettingsPicker } from "../../../utils/useSettingsPicker";
import {
  getActiveSettingsScope,
  useAccountScopedMMKVString,
} from "../../../utils/accountScopedSettings";
import { setDownloadSettingsBackup } from "../../../utils/downloadSettingsBackup";

const LONG_PRESS_ACTION_OPTIONS: {
  label: string;
  value: MediaLongPressAction;
}[] = [
  {
    label: "Share",
    value: "share",
  },
  {
    label: "Download",
    value: "download",
  },
];

const DOWNLOAD_DESTINATION_OPTIONS: {
  label: string;
  value: DownloadDestination;
}[] = [
  {
    label: "Photos (Hydra album)",
    value: "photos",
  },
  {
    label: "Files app folder",
    value: "files",
  },
];

function formatDirectoryName(uri?: string) {
  if (!uri) {
    return "Not selected";
  }
  const trimmed = uri.replace(/\/+$/g, "");
  const name = trimmed.split("/").pop();
  if (!name) {
    return uri;
  }
  return decodeURIComponent(name);
}

export default function Downloads() {
  const { theme } = useContext(ThemeContext);

  const [storedLongPressAction, setLongPressAction] =
    useAccountScopedMMKVString(DOWNLOAD_LONG_PRESS_ACTION_KEY);
  const [storedDownloadDestination, setDownloadDestination] =
    useAccountScopedMMKVString(DOWNLOAD_DESTINATION_KEY);
  const [filesRootUri, setFilesRootUri] = useAccountScopedMMKVString(
    DOWNLOAD_FILES_ROOT_URI_KEY,
  );

  const longPressAction =
    (storedLongPressAction as MediaLongPressAction | undefined) ??
    DOWNLOAD_LONG_PRESS_ACTION_DEFAULT;
  const downloadDestination =
    (storedDownloadDestination as DownloadDestination | undefined) ??
    DOWNLOAD_DESTINATION_DEFAULT;
  const settingsScope = getActiveSettingsScope();

  useEffect(() => {
    if (
      storedLongPressAction === undefined &&
      storedDownloadDestination === undefined &&
      !filesRootUri
    ) {
      return;
    }
    void setDownloadSettingsBackup(settingsScope, {
      longPressAction,
      downloadDestination,
      filesRootUri: filesRootUri ?? undefined,
    });
  }, [
    downloadDestination,
    filesRootUri,
    longPressAction,
    settingsScope,
    storedDownloadDestination,
    storedLongPressAction,
  ]);

  const { openPicker: openLongPressActionPicker, rightIcon: longPressActionIcon } =
    useSettingsPicker({
      items: LONG_PRESS_ACTION_OPTIONS,
      value: longPressAction,
      onChange: setLongPressAction,
    });

  const { openPicker: openDownloadDestinationPicker, rightIcon: destinationIcon } =
    useSettingsPicker({
      items: DOWNLOAD_DESTINATION_OPTIONS,
      value: downloadDestination,
      onChange: setDownloadDestination,
    });

  const pickDirectoryWithFallback = async (initialUri?: string) => {
    try {
      return (await Directory.pickDirectoryAsync(initialUri)).uri;
    } catch (_error) {
      if (!initialUri) {
        return null;
      }
      try {
        return (await Directory.pickDirectoryAsync(undefined)).uri;
      } catch (_fallbackError) {
        return null;
      }
    }
  };

  const selectFilesRootFolder = async () => {
    const directoryUri = await pickDirectoryWithFallback(filesRootUri ?? undefined);
    if (directoryUri) {
      setFilesRootUri(directoryUri);
    }
  };

  return (
    <>
      <List
        title="Downloads"
        items={[
          {
            key: "longPressAction",
            icon: <Feather name="mouse-pointer" size={24} color={theme.text} />,
            text: "Long Press Action",
            rightIcon: longPressActionIcon,
            onPress: () => openLongPressActionPicker(),
          },
          {
            key: "downloadDestination",
            icon: <Feather name="download" size={24} color={theme.text} />,
            text: "Download Destination",
            rightIcon: destinationIcon,
            onPress: () => openDownloadDestinationPicker(),
          },
          {
            key: "selectFilesRoot",
            hide: downloadDestination !== "files",
            icon: <MaterialIcons name="folder-open" size={24} color={theme.text} />,
            text: "Select Files Root Folder",
            rightIcon: (
              <Text
                style={[
                  styles.rightText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {formatDirectoryName(filesRootUri)}
              </Text>
            ),
            onPress: () => selectFilesRootFolder(),
          },
          {
            key: "clearFilesRoot",
            hide: downloadDestination !== "files" || !filesRootUri,
            icon: <Feather name="trash-2" size={24} color={theme.text} />,
            text: "Clear Files Root Folder",
            onPress: () =>
              Alert.alert(
                "Clear Files Root Folder?",
                "You can set it again any time.",
                [
                  { text: "Cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => setFilesRootUri(undefined),
                  },
                ],
              ),
          },
        ]}
      />
      <Text
        style={[
          styles.description,
          {
            color: theme.text,
          },
        ]}
      >
        Files downloads are saved into subreddit folders under the selected
        root folder. On iOS, folder access can expire after app restarts.
        Hydra will automatically prompt once to re-select the folder and retry
        the save when needed.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  rightText: {
    fontSize: 14,
    maxWidth: 150,
    textAlign: "right",
  },
  description: {
    margin: 15,
    lineHeight: 20,
  },
});
