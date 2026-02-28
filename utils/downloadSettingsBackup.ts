import * as SecureStore from "expo-secure-store";

import { DownloadDestination, MediaLongPressAction } from "../constants/Downloads";

const DOWNLOAD_SETTINGS_BACKUP_KEY_PREFIX = "downloadSettingsBackup";

export type DownloadSettingsBackup = {
  longPressAction?: MediaLongPressAction;
  downloadDestination?: DownloadDestination;
  filesRootUri?: string;
};

function makeDownloadSettingsBackupKey(scope: string) {
  return `${DOWNLOAD_SETTINGS_BACKUP_KEY_PREFIX}:${scope}`;
}

function parseDownloadSettingsBackup(
  value?: string | null,
): DownloadSettingsBackup | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DownloadSettingsBackup;
    return {
      longPressAction:
        parsed.longPressAction === "download" || parsed.longPressAction === "share"
          ? parsed.longPressAction
          : undefined,
      downloadDestination:
        parsed.downloadDestination === "files" ||
        parsed.downloadDestination === "photos"
          ? parsed.downloadDestination
          : undefined,
      filesRootUri:
        typeof parsed.filesRootUri === "string" ? parsed.filesRootUri : undefined,
    };
  } catch (_e) {
    return null;
  }
}

export async function getDownloadSettingsBackup(
  scope: string,
): Promise<DownloadSettingsBackup | null> {
  const value = await SecureStore.getItemAsync(makeDownloadSettingsBackupKey(scope));
  return parseDownloadSettingsBackup(value);
}

export async function setDownloadSettingsBackup(
  scope: string,
  backup: DownloadSettingsBackup,
) {
  const normalizedBackup: DownloadSettingsBackup = {
    longPressAction:
      backup.longPressAction === "download" || backup.longPressAction === "share"
        ? backup.longPressAction
        : undefined,
    downloadDestination:
      backup.downloadDestination === "files" ||
      backup.downloadDestination === "photos"
        ? backup.downloadDestination
        : undefined,
    filesRootUri: backup.filesRootUri?.trim() || undefined,
  };

  if (
    normalizedBackup.longPressAction === undefined &&
    normalizedBackup.downloadDestination === undefined &&
    normalizedBackup.filesRootUri === undefined
  ) {
    await SecureStore.deleteItemAsync(makeDownloadSettingsBackupKey(scope));
    return;
  }

  await SecureStore.setItemAsync(
    makeDownloadSettingsBackupKey(scope),
    JSON.stringify(normalizedBackup),
  );
}
