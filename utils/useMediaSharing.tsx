import { Directory, File, Paths } from "expo-file-system/next";
import * as MediaLibrary from "expo-media-library";
import { useContext, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";

import URL from "./URL";
import {
  DOWNLOAD_DESTINATION_DEFAULT,
  DOWNLOAD_DESTINATION_KEY,
  DOWNLOAD_FILES_ROOT_URI_KEY,
  DOWNLOAD_LONG_PRESS_ACTION_DEFAULT,
  DOWNLOAD_LONG_PRESS_ACTION_KEY,
  DownloadDestination,
  HYDRA_PHOTOS_ALBUM_NAME,
  MediaLongPressAction,
} from "../constants/Downloads";
import { ModalContext } from "../contexts/ModalContext";
import { ThemeContext } from "../contexts/SettingsContexts/ThemeContext";
import {
  getActiveSettingsScope,
  useAccountScopedMMKVString,
} from "./accountScopedSettings";
import {
  getDownloadSettingsBackup,
  setDownloadSettingsBackup,
} from "./downloadSettingsBackup";
import useContextMenu from "./useContextMenu";
import {
  copyFileToBookmarkedRoot,
  storeBookmark,
} from "./folderBookmarkAccess";

type ShareMediaOptions = {
  subreddit?: string;
  forceAction?: MediaLongPressAction;
  allMediaUrls?: string[];
  forceDownloadDestination?: DownloadDestination;
};

const INVALID_FILE_AND_FOLDER_CHARS = /[\\/:*?"<>|]/g;
const UNKNOWN_SUBREDDIT_FOLDER = "unknown";
const SAVE_TO_HYDRA_ALBUM_OPTION = "Save to Hydra album";
const SAVE_ALL_TO_HYDRA_ALBUM_OPTION = "Save all to Hydra album";
const SAVE_TO_FILES_OPTION = "Save to Files";
const SAVE_ALL_TO_FILES_OPTION = "Save all to Files";
const SHARE_OPTION = "Share";

function isRecoverableBookmarkError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return (
    code === "BOOKMARK_MISSING" ||
    code === "BOOKMARK_STALE" ||
    code === "BOOKMARK_IO_FAILED"
  );
}

function splitNameAndExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) {
    return { name: fileName, extension: "" };
  }
  return {
    name: fileName.slice(0, dot),
    extension: fileName.slice(dot),
  };
}

function sanitizeName(name: string) {
  return name.replace(INVALID_FILE_AND_FOLDER_CHARS, "_").trim();
}

function normalizeSubredditFolder(subreddit?: string) {
  if (!subreddit) return UNKNOWN_SUBREDDIT_FOLDER;
  const sanitized = sanitizeName(subreddit).replace(/\.+$/g, "");
  return sanitized || UNKNOWN_SUBREDDIT_FOLDER;
}

function normalizeFileName(fileName: string, type: "image" | "video") {
  const cleaned = sanitizeName(fileName);
  const safeName = cleaned || `hydra-${Date.now()}`;
  if (safeName.includes(".")) {
    return safeName;
  }
  return `${safeName}.${type === "image" ? "jpg" : "mp4"}`;
}

export default function useMediaSharing() {
  const { setModal } = useContext(ModalContext);
  const { theme } = useContext(ThemeContext);
  const openContextMenu = useContextMenu();
  const [storedLongPressAction, setStoredLongPressAction] = useAccountScopedMMKVString(
    DOWNLOAD_LONG_PRESS_ACTION_KEY,
  );
  const [storedDownloadDestination, setStoredDownloadDestination] =
    useAccountScopedMMKVString(DOWNLOAD_DESTINATION_KEY);
  const [storedFilesRootUri, setStoredFilesRootUri] = useAccountScopedMMKVString(
    DOWNLOAD_FILES_ROOT_URI_KEY,
  );

  const { width, height } = useWindowDimensions();

  const alreadyAsking = useRef(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFilesRootUriRef = useRef<string | undefined>(
    storedFilesRootUri ?? undefined,
  );
  if (latestFilesRootUriRef.current !== storedFilesRootUri) {
    latestFilesRootUriRef.current = storedFilesRootUri ?? undefined;
  }

  const longPressAction =
    (storedLongPressAction as MediaLongPressAction | undefined) ??
    DOWNLOAD_LONG_PRESS_ACTION_DEFAULT;
  const downloadDestination =
    (storedDownloadDestination as DownloadDestination | undefined) ??
    DOWNLOAD_DESTINATION_DEFAULT;
  const settingsScope = getActiveSettingsScope();

  const restoreBackupIfNeeded = async () => {
    let resolvedLongPressAction = storedLongPressAction as
      | MediaLongPressAction
      | undefined;
    let resolvedDownloadDestination = storedDownloadDestination as
      | DownloadDestination
      | undefined;
    let resolvedFilesRootUri = latestFilesRootUriRef.current;

    const shouldLookupBackup =
      resolvedLongPressAction === undefined ||
      resolvedDownloadDestination === undefined ||
      ((resolvedDownloadDestination ?? DOWNLOAD_DESTINATION_DEFAULT) === "files" &&
        !resolvedFilesRootUri);

    if (shouldLookupBackup) {
      const backup = await getDownloadSettingsBackup(settingsScope);
      if (backup) {
        if (resolvedLongPressAction === undefined && backup.longPressAction) {
          resolvedLongPressAction = backup.longPressAction;
          setStoredLongPressAction(backup.longPressAction);
        }
        if (
          resolvedDownloadDestination === undefined &&
          backup.downloadDestination
        ) {
          resolvedDownloadDestination = backup.downloadDestination;
          setStoredDownloadDestination(backup.downloadDestination);
        }
        if (!resolvedFilesRootUri && backup.filesRootUri) {
          resolvedFilesRootUri = backup.filesRootUri;
          latestFilesRootUriRef.current = backup.filesRootUri;
          setStoredFilesRootUri(backup.filesRootUri);
        }
      }
    }

    const finalLongPressAction =
      resolvedLongPressAction ?? DOWNLOAD_LONG_PRESS_ACTION_DEFAULT;
    const finalDownloadDestination =
      resolvedDownloadDestination ?? DOWNLOAD_DESTINATION_DEFAULT;

    void setDownloadSettingsBackup(settingsScope, {
      longPressAction: finalLongPressAction,
      downloadDestination: finalDownloadDestination,
      filesRootUri: resolvedFilesRootUri,
    });

    return {
      longPressAction: finalLongPressAction,
      downloadDestination: finalDownloadDestination,
      filesRootUri: resolvedFilesRootUri,
    };
  };

  const pickDirectoryWithFallback = async (
    initialUri?: string,
  ): Promise<string | null> => {
    const tryPick = async (uri?: string) => {
      const pickedDirectory = await Directory.pickDirectoryAsync(uri);
      latestFilesRootUriRef.current = pickedDirectory.uri;
      setStoredFilesRootUri(pickedDirectory.uri);
      if (Platform.OS === "ios") {
        try {
          await storeBookmark(settingsScope, pickedDirectory.uri);
        } catch (bookmarkError) {
          const bookmarkCode = (bookmarkError as { code?: string })?.code;
          if (bookmarkCode !== "BOOKMARK_UNAVAILABLE") {
            throw bookmarkError;
          }
        }
      }
      void setDownloadSettingsBackup(settingsScope, {
        longPressAction,
        downloadDestination,
        filesRootUri: pickedDirectory.uri,
      });
      return pickedDirectory.uri;
    };

    try {
      return await tryPick(initialUri);
    } catch (_error) {
      if (!initialUri) {
        return null;
      }
      try {
        return await tryPick(undefined);
      } catch (_fallbackError) {
        return null;
      }
    }
  };

  const pickFilesRoot = async () => {
    const rootUri = await pickDirectoryWithFallback(latestFilesRootUriRef.current);
    if (!rootUri) {
      return null;
    }
    return rootUri;
  };

  const saveToPhotos = async (file: File) => {
    const permissions = await MediaLibrary.requestPermissionsAsync(true);
    if (!permissions.granted) {
      throw new Error("photos-permission-denied");
    }
    const asset = await MediaLibrary.createAssetAsync(file.uri);
    try {
      const existingAlbum =
        await MediaLibrary.getAlbumAsync(HYDRA_PHOTOS_ALBUM_NAME);
      if (existingAlbum) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
      } else {
        await MediaLibrary.createAlbumAsync(
          HYDRA_PHOTOS_ALBUM_NAME,
          asset,
          false,
        );
      }
      return true;
    } catch {
      // In add-only photos permission mode, album queries/mutations can fail.
      // The asset is already saved to Photos by createAssetAsync above.
      return false;
    }
  };

  const saveToFiles = async (
    file: File,
    type: "image" | "video",
    originalFileName: string,
    subreddit?: string,
    allowReprompt = true,
    rootUriOverride?: string,
  ) => {
    const subredditFolderName = normalizeSubredditFolder(subreddit);
    const initialName = normalizeFileName(originalFileName, type);

    if (Platform.OS === "ios") {
      try {
        const result = await copyFileToBookmarkedRoot(
          settingsScope,
          file.uri,
          subredditFolderName,
          initialName,
        );
        return result.folder;
      } catch (error) {
        const bookmarkCode = (error as { code?: string })?.code;
        if (bookmarkCode === "BOOKMARK_UNAVAILABLE") {
          // Fall back to Expo file writes when the native bridge isn't available.
        } else if (allowReprompt && isRecoverableBookmarkError(error)) {
          const repromptedRoot = await pickDirectoryWithFallback(
            rootUriOverride ?? latestFilesRootUriRef.current,
          );
          if (!repromptedRoot) {
            throw new Error("missing-files-root");
          }
          return await saveToFiles(
            file,
            type,
            originalFileName,
            subreddit,
            false,
            repromptedRoot,
          );
        } else {
          throw error;
        }
      }
    }

    const writeToRoot = (rootUri: string) => {
      const rootDirectory = new Directory(rootUri);
      const subredditDirectory = new Directory(rootDirectory, subredditFolderName);
      subredditDirectory.create({ intermediates: true, idempotent: true });

      const { name, extension } = splitNameAndExtension(initialName);
      let destinationName = initialName;
      let destinationFile = new File(subredditDirectory, destinationName);
      let suffix = 1;
      while (destinationFile.exists) {
        destinationName = `${name}-${suffix}${extension}`;
        destinationFile = new File(subredditDirectory, destinationName);
        suffix += 1;
      }
      file.copy(destinationFile);
      return subredditFolderName;
    };

    let rootUri = rootUriOverride ?? latestFilesRootUriRef.current;
    if (!rootUri) {
      rootUri = await pickFilesRoot();
      if (!rootUri) {
        throw new Error("missing-files-root");
      }
    }

    try {
      return writeToRoot(rootUri);
    } catch (e) {
      if (allowReprompt && Platform.OS === "ios") {
        const repromptedRoot = await pickDirectoryWithFallback(rootUri);
        if (!repromptedRoot) {
          throw new Error("missing-files-root");
        }
        return await saveToFiles(
          file,
          type,
          originalFileName,
          subreddit,
          false,
          repromptedRoot,
        );
      }
      throw e;
    }
  };

  const showLongPressMediaMenu = async (
    type: "image" | "video",
    mediaUrl: string,
    options: ShareMediaOptions,
  ) => {
    const uniqueMediaUrls = Array.from(
      new Set(
        [mediaUrl, ...(options.allMediaUrls ?? [])].filter(
          (url): url is string => !!url,
        ),
      ),
    );
    const canSaveAllToHydraAlbum =
      type === "image" && uniqueMediaUrls.length > 1;
    const canSaveAllToFiles = type === "image" && uniqueMediaUrls.length > 1;
    const menuOptions = [
      SAVE_TO_HYDRA_ALBUM_OPTION,
      ...(canSaveAllToHydraAlbum ? [SAVE_ALL_TO_HYDRA_ALBUM_OPTION] : []),
      SAVE_TO_FILES_OPTION,
      ...(canSaveAllToFiles ? [SAVE_ALL_TO_FILES_OPTION] : []),
      SHARE_OPTION,
    ];
    const selectedAction = await openContextMenu({
      title: "Media Options",
      options: menuOptions,
    });
    if (!selectedAction) {
      return null;
    }
    if (selectedAction === SHARE_OPTION) {
      return {
        action: "share" as MediaLongPressAction,
        downloadDestination: undefined,
        mediaUrls: [mediaUrl],
      };
    }
    if (selectedAction === SAVE_TO_FILES_OPTION) {
      return {
        action: "download" as MediaLongPressAction,
        downloadDestination: "files" as DownloadDestination,
        mediaUrls: [mediaUrl],
      };
    }
    if (selectedAction === SAVE_ALL_TO_FILES_OPTION) {
      return {
        action: "download" as MediaLongPressAction,
        downloadDestination: "files" as DownloadDestination,
        mediaUrls: uniqueMediaUrls,
      };
    }
    if (selectedAction === SAVE_ALL_TO_HYDRA_ALBUM_OPTION) {
      return {
        action: "download" as MediaLongPressAction,
        downloadDestination: "photos" as DownloadDestination,
        mediaUrls: uniqueMediaUrls,
      };
    }
    return {
      action: "download" as MediaLongPressAction,
      downloadDestination: "photos" as DownloadDestination,
      mediaUrls: [mediaUrl],
    };
  };

  const showTopToast = (message: string) => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
      toastTimeout.current = null;
    }

    setModal(
      <View pointerEvents="none" style={[styles.toastContainer, { width }]}>
        <View
          style={[
            styles.toastPill,
            {
              backgroundColor: theme.background,
              borderColor: theme.divider,
            },
          ]}
        >
          <Text
            style={[
              styles.toastText,
              {
                color: theme.text,
              },
            ]}
          >
            {message}
          </Text>
        </View>
      </View>,
    );

    toastTimeout.current = setTimeout(() => {
      setModal(null);
      toastTimeout.current = null;
    }, 1800);
  };

  return async (
    type: "image" | "video",
    mediaUrl: string,
    options: ShareMediaOptions = {},
  ) => {
    if (alreadyAsking.current) return;
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
      toastTimeout.current = null;
    }
    alreadyAsking.current = true;
    let action: MediaLongPressAction = options.forceAction ?? "share";
    let mediaUrls = [mediaUrl];
    let forcedDownloadDestination = options.forceDownloadDestination;
    let downloadedFiles: File[] = [];
    let destinationFolderName: string | null = null;
    let savedToHydraAlbum = true;
    try {
      if (!options.forceAction) {
        const selectedAction = await showLongPressMediaMenu(type, mediaUrl, options);
        if (!selectedAction) {
          return;
        }
        action = selectedAction.action;
        mediaUrls = selectedAction.mediaUrls;
        forcedDownloadDestination = selectedAction.downloadDestination;
      }
      const resolvedSettings =
        action === "download" ? await restoreBackupIfNeeded() : null;
      const resolvedDownloadDestination =
        forcedDownloadDestination ??
        resolvedSettings?.downloadDestination ??
        DOWNLOAD_DESTINATION_DEFAULT;
      const mediaTypeLabel =
        type === "image"
          ? mediaUrls.length > 1
            ? "Images"
            : "Image"
          : mediaUrls.length > 1
            ? "Videos"
            : "Video";
      setModal(
        <TouchableOpacity
          style={[styles.modalContainer, { width, height }]}
          onPress={() => setModal(null)}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.background,
                borderColor: theme.divider,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                },
              ]}
            >
              {action === "share"
                ? `Preparing ${mediaTypeLabel}...`
                : `Saving ${mediaTypeLabel}...`}
            </Text>
            <ActivityIndicator size="small" />
          </View>
        </TouchableOpacity>,
      );

      for (let i = 0; i < mediaUrls.length; i += 1) {
        const currentUrl = mediaUrls[i];
        const fileName = normalizeFileName(
          new URL(currentUrl).getBasePath().split("/").pop() ?? `hydra-${Date.now()}`,
          type,
        );
        const file = new File(Paths.cache, `${Date.now()}-${i}-${fileName}`);
        if (file.exists) {
          file.delete();
        }
        await File.downloadFileAsync(currentUrl, file);
        downloadedFiles.push(file);

        if (action === "share") {
          setModal(null);
          await Share.share({
            url: file.uri,
          });
          break;
        } else if (resolvedDownloadDestination === "photos") {
          const savedToAlbum = await saveToPhotos(file);
          if (!savedToAlbum) {
            savedToHydraAlbum = false;
          }
        } else {
          destinationFolderName = await saveToFiles(
            file,
            type,
            fileName,
            options.subreddit,
            true,
            resolvedSettings?.filesRootUri,
          );
        }
      }

      if (action === "download") {
        setModal(null);
        const itemLabel =
          mediaUrls.length === 1
            ? type
            : `${mediaUrls.length} ${type === "image" ? "images" : "videos"}`;
        if (type === "image") {
          if (resolvedDownloadDestination === "photos") {
            showTopToast(
              savedToHydraAlbum
                ? `Saved ${itemLabel} to ${HYDRA_PHOTOS_ALBUM_NAME}.`
                : `Saved ${itemLabel} to Photos.`,
            );
          } else {
            showTopToast(
              `Saved ${itemLabel} to ${destinationFolderName ?? "selected folder"}.`,
            );
          }
        } else if (resolvedDownloadDestination === "photos") {
          Alert.alert(
            "Saved to Photos",
            savedToHydraAlbum
              ? `Saved ${itemLabel} to the ${HYDRA_PHOTOS_ALBUM_NAME} album.`
              : `Saved ${itemLabel} to Photos.`,
          );
        } else {
          Alert.alert(
            "Saved to Files",
            `Saved ${itemLabel} to ${destinationFolderName ?? "selected folder"}.`,
          );
        }
      }
    } catch (e) {
      setModal(null);
      if (e instanceof Error && e.message === "photos-permission-denied") {
        Alert.alert(
          "Photos Permission Needed",
          "Allow Hydra to add photos in iOS Settings to save to the Hydra album.",
        );
      } else if (e instanceof Error && e.message === "missing-files-root") {
        Alert.alert(
          "No Folder Selected",
          "Choose a root folder in Settings > General > Downloads.",
        );
      } else {
        Alert.alert(
          "Error",
          action === "share"
            ? `Failed to download ${type}`
            : `Failed to save ${type}`,
        );
      }
    } finally {
      for (const file of downloadedFiles) {
        if (file.exists) {
          file.delete();
        }
      }
      alreadyAsking.current = false;
    }
  };
}

const styles = StyleSheet.create({
  modalContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
  },
  toastContainer: {
    position: "absolute",
    top: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  toastPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: "90%",
  },
  toastText: {
    fontSize: 13,
    textAlign: "center",
  },
});
