import { createUploadUrl, ApiError } from "@workspace/api-client-react";

export class UploadUnavailableError extends Error {
  constructor() {
    super("Media upload is not configured in this environment.");
    this.name = "UploadUnavailableError";
  }
}

export type UploadedMediaType = "image" | "video";

export function detectMediaType(file: File): UploadedMediaType {
  return file.type.startsWith("video") ? "video" : "image";
}

export interface UploadedMedia {
  url: string;
  type: UploadedMediaType;
}

/**
 * Uploads a file via the backend-issued signed URL and returns its public URL.
 * In dev the backend returns 503 (storage unconfigured) — callers should catch
 * UploadUnavailableError and degrade gracefully (e.g. URL paste fallback).
 */
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  let signed;
  try {
    signed = await createUploadUrl({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      throw new UploadUnavailableError();
    }
    throw err;
  }

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  return { url: signed.publicUrl, type: detectMediaType(file) };
}
