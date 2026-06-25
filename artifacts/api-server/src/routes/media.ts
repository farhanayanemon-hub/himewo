import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { env } from "../lib/env";
import {
  CreateUploadUrlBody,
  CreateUploadUrlResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

router.post(
  "/media/upload-url",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const admin = getSupabaseAdmin();
    if (!admin) {
      res.status(503).json({
        error:
          "Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      });
      return;
    }
    const bucket = parsed.data.bucket ?? env.storageBucket;
    const path = `${req.userId}/${Date.now()}-${sanitize(parsed.data.fileName)}`;
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) {
      res
        .status(500)
        .json({ error: error?.message ?? "Failed to create upload URL" });
      return;
    }
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
    res.json(
      CreateUploadUrlResponse.parse({
        uploadUrl: data.signedUrl,
        publicUrl: pub.publicUrl,
        path,
        token: data.token,
      }),
    );
  },
);

export default router;
