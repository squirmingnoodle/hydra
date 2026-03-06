import { ImagePickerAsset } from "expo-image-picker";

import { api } from "./RedditApi";
import { USER_AGENT } from "./UserAgent";

export async function uploadImage(
  imageAsset: ImagePickerAsset,
): Promise<string | null> {
  const response = await api(
    "https://www.reddit.com/api/image_upload_s3.json",
    {
      method: "POST",
    },
    {
      requireAuth: true,
      body: {
        filepath: imageAsset.fileName,
        mimetype: imageAsset.mimeType,
        raw_json: "1",
      },
    },
  );
  const s3UploadData = response.fields.reduce(
    (acc: Record<string, string>, field: { name: string; value: string }) => {
      acc[field.name] = field.value;
      return acc;
    },
    {},
  );
  const file = {
    uri: imageAsset.uri,
    type: imageAsset.mimeType,
    name: imageAsset.fileName,
  };
  const body = new FormData();
  Object.entries(s3UploadData).forEach(([key, value]) => {
    body.append(key, value as string);
  });
  body.append("file", file as unknown as string /* idk, but it works */);
  const s3UploadResponse = await fetch(`https:${response.action}`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; ",
      "User-Agent": USER_AGENT,
    },
    body,
  });
  const text = await s3UploadResponse.text();
  const uploadURL = text.match(/<Location>(.*?)<\/Location>/)?.[1];
  return uploadURL ?? null;
}

export async function uploadVideo(
  videoAsset: ImagePickerAsset,
): Promise<string | null> {
  // Step 1: Request upload lease from Reddit's media asset endpoint
  const response = await api(
    "https://www.reddit.com/api/media/asset.json",
    {
      method: "POST",
    },
    {
      requireAuth: true,
      body: {
        filepath: videoAsset.fileName ?? "video.mp4",
        mimetype: videoAsset.mimeType ?? "video/mp4",
      },
    },
  );

  // Extract S3 upload fields from the response
  const uploadAction = response?.args?.action;
  const uploadFields = response?.args?.fields;

  if (!uploadAction || !uploadFields) {
    return null;
  }

  const s3UploadData = uploadFields.reduce(
    (acc: Record<string, string>, field: { name: string; value: string }) => {
      acc[field.name] = field.value;
      return acc;
    },
    {},
  );

  // Step 2: Upload video to S3
  const file = {
    uri: videoAsset.uri,
    type: videoAsset.mimeType ?? "video/mp4",
    name: videoAsset.fileName ?? "video.mp4",
  };
  const body = new FormData();
  Object.entries(s3UploadData).forEach(([key, value]) => {
    body.append(key, value as string);
  });
  body.append("file", file as unknown as string);

  const uploadURL = uploadAction.startsWith("http")
    ? uploadAction
    : `https:${uploadAction}`;

  const s3UploadResponse = await fetch(uploadURL, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; ",
      "User-Agent": USER_AGENT,
    },
    body,
  });

  // Parse the response for the video URL
  const text = await s3UploadResponse.text();
  const videoURL = text.match(/<Location>(.*?)<\/Location>/)?.[1];
  return videoURL ?? null;
}

/**
 * Upload an image to use as video thumbnail/poster.
 * Uses the same media asset endpoint but with image mimetype.
 */
export async function uploadVideoPoster(
  imageAsset: ImagePickerAsset,
): Promise<string | null> {
  // For video thumbnails, we reuse the standard image upload
  return uploadImage(imageAsset);
}
