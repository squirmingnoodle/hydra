import { NativeModules, Platform } from "react-native";

type NativeBookmarkCopyResult = {
  folder: string;
  fileName: string;
};

type NativeHydraFolderBookmarksModule = {
  storeBookmark(scope: string, directoryUri: string): Promise<void>;
  clearBookmark(scope: string): Promise<void>;
  hasBookmark(scope: string): Promise<boolean>;
  copyFileToBookmarkedRoot(
    scope: string,
    sourceFileUri: string,
    subredditFolder: string,
    originalFileName: string,
  ): Promise<NativeBookmarkCopyResult>;
};

const nativeHydraFolderBookmarks =
  NativeModules.HydraFolderBookmarks as
    | NativeHydraFolderBookmarksModule
    | undefined;

export type BookmarkAccessErrorCode =
  | "BOOKMARK_MISSING"
  | "BOOKMARK_STALE"
  | "BOOKMARK_IO_FAILED"
  | "BOOKMARK_INVALID_URI"
  | "BOOKMARK_UNAVAILABLE";

export class BookmarkAccessError extends Error {
  code: BookmarkAccessErrorCode;

  constructor(code: BookmarkAccessErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const KNOWN_ERROR_CODES: BookmarkAccessErrorCode[] = [
  "BOOKMARK_MISSING",
  "BOOKMARK_STALE",
  "BOOKMARK_IO_FAILED",
  "BOOKMARK_INVALID_URI",
  "BOOKMARK_UNAVAILABLE",
];

function normalizeError(
  error: unknown,
  fallbackCode: BookmarkAccessErrorCode,
): BookmarkAccessError {
  if (error instanceof BookmarkAccessError) {
    return error;
  }

  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : fallbackCode;
  const code = KNOWN_ERROR_CODES.includes(errorCode as BookmarkAccessErrorCode)
    ? (errorCode as BookmarkAccessErrorCode)
    : fallbackCode;
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : "Folder bookmark operation failed.";

  return new BookmarkAccessError(code, message);
}

function getNativeModule() {
  if (nativeHydraFolderBookmarks) {
    return nativeHydraFolderBookmarks;
  }
  throw new BookmarkAccessError(
    "BOOKMARK_UNAVAILABLE",
    "Hydra folder bookmark native module is unavailable.",
  );
}

export async function storeBookmark(scope: string, directoryUri: string) {
  if (Platform.OS !== "ios") {
    return;
  }
  try {
    await getNativeModule().storeBookmark(scope, directoryUri);
  } catch (error) {
    throw normalizeError(error, "BOOKMARK_IO_FAILED");
  }
}

export async function clearBookmark(scope: string) {
  if (Platform.OS !== "ios") {
    return;
  }
  try {
    await getNativeModule().clearBookmark(scope);
  } catch (error) {
    throw normalizeError(error, "BOOKMARK_IO_FAILED");
  }
}

export async function hasBookmark(scope: string) {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    return await getNativeModule().hasBookmark(scope);
  } catch (_error) {
    return false;
  }
}

export async function copyFileToBookmarkedRoot(
  scope: string,
  sourceFileUri: string,
  subredditFolder: string,
  originalFileName: string,
): Promise<NativeBookmarkCopyResult> {
  if (Platform.OS !== "ios") {
    throw new BookmarkAccessError(
      "BOOKMARK_UNAVAILABLE",
      "Bookmarked root folder copy is only available on iOS.",
    );
  }

  try {
    return await getNativeModule().copyFileToBookmarkedRoot(
      scope,
      sourceFileUri,
      subredditFolder,
      originalFileName,
    );
  } catch (error) {
    throw normalizeError(error, "BOOKMARK_IO_FAILED");
  }
}
