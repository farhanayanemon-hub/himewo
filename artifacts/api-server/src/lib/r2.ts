import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isR2Configured } from "./env";

let cached: S3Client | null = null;

/**
 * Returns an S3 client pointed at Cloudflare R2 when R2 env is configured,
 * otherwise null. R2 is S3-compatible, so we use the AWS S3 SDK with R2's
 * endpoint and region "auto".
 */
function getClient(): S3Client | null {
  if (!isR2Configured()) return null;
  if (!cached) {
    cached = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId!,
        secretAccessKey: env.r2SecretAccessKey!,
      },
    });
  }
  return cached;
}

export interface R2UploadTarget {
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Creates a presigned PUT URL for uploading directly to R2 and the public URL
 * the object will be served from. Signs with the given contentType so clients
 * must PUT with a matching `Content-Type` header. Returns null when R2 is not
 * configured.
 */
export async function createR2UploadUrl(
  path: string,
  contentType: string,
): Promise<R2UploadTarget | null> {
  const client = getClient();
  if (!client) return null;
  const command = new PutObjectCommand({
    Bucket: env.r2Bucket,
    Key: path,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const base = env.r2PublicUrl!.replace(/\/+$/, "");
  const publicUrl = `${base}/${path}`;
  return { uploadUrl, publicUrl };
}
