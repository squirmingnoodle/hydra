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
import { useAccountScopedMMKVString } from "./accountScopedSettings";

type ShareMediaOptions = {
  subreddit?: string;
  forceAction?: MediaLongPressAction;
};

const INVALID_FILE_AND_FOLDER_CHARS = /[\\/:*?"<>|]/g;
const UNKNOWN_SUBREDDIT_FOLDER = "unknown";

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

function getNameFromUri(uri: string) {
  const lastPart = uri.split("/").pop() ?? "";
  return decodeURIComponent(lastPart.split("?")[0]);
}

function makeUniqueFileName(fileName: string, existingNamesLowercase: Set<string>) {
  const fileNameLower = fileName.toLowerCase();
  if (!existingNamesLowercase.has(fileNameLower)) {
    return fileName;
  }
  const { name, extension } = splitNameAndExtension(fileName);
  let suffix = 1;
  while (existingNamesLowercase.has(`${name}-${suffix}${extension}`.toLowerCase())) {
    suffix += 1;
  }
  return `${name}-${suffix}${extension}`;
}

export default function useMediaSharing() {
  const { setModal } = useContext(ModalContext);
  const { theme } = useContext(ThemeContext);
  const [storedLongPressAction] = useAccountScopedMMKVString(
    DOWNLOAD_LONG_PRESS_ACTION_KEY,
  );
  const [storedDownloadDestination] = useAccountScopedMMKVString(
    DOWNLOAD_DESTINATION_KEY,
  );
  const [storedFilesRootUri, setStoredFilesRootUri] = useAccountScopedMMKVString(
    DOWNLOAD_FILES_ROOT_URI_KEY,
  );

  const { width, height } = useWindowDimensions();

  const alreadyAsking = useRef(false);

  const longPressAction =
    (storedLongPressAction as MediaLongPressAction | undefined) ??
    DOWNLOAD_LONG_PRESS_ACTION_DEFAULT;
  const downloadDestination =
    (storedDownloadDestination as DownloadDestination | undefined) ??
    DOWNLOAD_DESTINATION_DEFAULT;

  const pickFilesRoot = async () => {
    try {
      const pickedDirectory = await Directory.pickDirectoryAsync(
        storedFilesRootUri ?? undefined,
      );
      setStoredFilesRootUri(pickedDirectory.uri);
      return pickedDirectory.uri;
    } catch (_e) {
      return null;
    }
  };

  const saveToPhotos = async (file: File) => {
    const permissions = await MediaLibrary.requestPermissionsAsync(true);
    if (!permissions.granted) {
      throw new Error("photos-permission-denied");
    }
    const asset = await MediaLibrary.createAssetAsync(file.uri);
    const existingAlbum = await MediaLibrary.getAlbumAsync(HYDRA_PHOTOS_ALBUM_NAME);
    if (existingAlbum) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
    } else {
      await MediaLibrary.createAlbumAsync(HYDRA_PHOTOS_ALBUM_NAME, asset, false);
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
    const writeToRoot = (rootUri: string) => {
      const rootDirectory = new Directory(rootUri);
      const subredditFolderName = normalizeSubredditFolder(subreddit);
      const subredditDirectory = new Directory(rootDirectory, subredditFolderName);
      subredditDirectory.create({ intermediates: true, idempotent: true });

      const existingNamesLowercase = new Set(
        subredditDirectory
          .list()
          .map((entry) => getNameFromUri(entry.uri).toLowerCase())
          .filter(Boolean),
      );

      const initialName = normalizeFileName(originalFileName, type);
      const destinationName = makeUniqueFileName(
        initialName,
        existingNamesLowercase,
      );
      const destinationFile = new File(subredditDirectory, destinationName);
      file.copy(destinationFile);
      return subredditFolderName;
    };

    let rootUri = rootUriOverride ?? storedFilesRootUri;
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
        const repromptedRoot = await pickFilesRoot();
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

  return async (
    type: "image" | "video",
    mediaUrl: string,
    options: ShareMediaOptions = {},
  ) => {
    if (alreadyAsking.current) return;
    alreadyAsking.current = true;
    const action = options.forceAction ?? longPressAction;
    let file: File | null = null;
    try {
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
                ? `Preparing ${type === "image" ? "Image" : "Video"}...`
                : `Downloading ${type === "image" ? "Image" : "Video"}...`}
            </Text>
            <ActivityIndicator size="small" />
          </View>
        </TouchableOpacity>,
      );
      const fileName = normalizeFileName(
        new URL(mediaUrl).getBasePath().split("/").pop() ?? `hydra-${Date.now()}`,
        type,
      );
      file = new File(Paths.cache, `${Date.now()}-${fileName}`);
      if (file.exists) {
        file.delete();
      }
      await File.downloadFileAsync(mediaUrl, file);

      if (action === "share") {
        setModal(null);
        await Share.share({
          url: file.uri,
        });
      } else if (downloadDestination === "photos") {
        await saveToPhotos(file);
        setModal(null);
        Alert.alert(
          "Saved to Photos",
          `Saved ${type} to the ${HYDRA_PHOTOS_ALBUM_NAME} album.`,
        );
      } else {
        const folder = await saveToFiles(file, type, fileName, options.subreddit);
        setModal(null);
        Alert.alert("Saved to Files", `Saved ${type} to ${folder}.`);
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
      if (file?.exists) {
        file.delete();
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
});
