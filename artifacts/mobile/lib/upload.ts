import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { createUploadUrl, ApiError } from "@workspace/api-client-react";

export class UploadUnavailableError extends Error {
  constructor() {
    super("Media upload is not configured in this environment.");
    this.name = "UploadUnavailableError";
  }
}

export type UploadedMediaType = "image" | "video";

export interface PickedAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  type?: "image" | "video" | string | null;
  width?: number;
  height?: number;
  duration?: number | null;
}

export interface UploadedMedia {
  url: string;
  type: UploadedMediaType;
  width?: number;
  height?: number;
}

function detectType(asset: PickedAsset): UploadedMediaType {
  if (asset.type === "video") return "video";
  if (asset.mimeType?.startsWith("video")) return "video";
  if (asset.fileName && /\.(mp4|mov|m4v|webm)$/i.test(asset.fileName)) {
    return "video";
  }
  return "image";
}

/**
 * Uploads a locally-picked asset via the backend-issued signed URL and returns
 * its public URL. In dev the backend returns 503 (storage unconfigured) — callers
 * should catch UploadUnavailableError and degrade gracefully.
 */
export async function uploadMedia(asset: PickedAsset): Promise<UploadedMedia> {
  const mediaType = detectType(asset);
  const fileName =
    asset.fileName ||
    `upload-${Date.now()}.${mediaType === "video" ? "mp4" : "jpg"}`;
  const contentType =
    asset.mimeType || (mediaType === "video" ? "video/mp4" : "image/jpeg");

  let signed;
  try {
    signed = await createUploadUrl({ fileName, contentType });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      throw new UploadUnavailableError();
    }
    throw err;
  }

  const fileResponse = await fetch(asset.uri);
  const blob = await fileResponse.blob();

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": contentType },
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  return {
    url: signed.publicUrl,
    type: mediaType,
    width: asset.width,
    height: asset.height,
  };
}

export async function captureWithCamera(
  mediaTypes: ImagePicker.MediaType[] = ["images"],
): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Camera permission needed",
      "Enable camera access in your device settings to capture photos or videos.",
    );
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes,
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0];
}
