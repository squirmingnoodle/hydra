export type MediaLongPressAction = "share" | "download";
export type DownloadDestination = "photos" | "files";

export const DOWNLOAD_LONG_PRESS_ACTION_KEY = "downloadLongPressAction";
export const DOWNLOAD_DESTINATION_KEY = "downloadDestination";
export const DOWNLOAD_FILES_ROOT_URI_KEY = "downloadFilesRootUri";

export const DOWNLOAD_LONG_PRESS_ACTION_DEFAULT: MediaLongPressAction = "share";
export const DOWNLOAD_DESTINATION_DEFAULT: DownloadDestination = "photos";

export const HYDRA_PHOTOS_ALBUM_NAME = "Hydra";
