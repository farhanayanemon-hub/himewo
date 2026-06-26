import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { createR2UploadUrl } from "../lib/r2";
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
    const path = `${req.userId}/${Date.now()}-${sanitize(parsed.data.fileName)}`;
    const target = await createR2UploadUrl(path, parsed.data.contentType);
    if (!target) {
      res.status(503).json({
        error:
          "Storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_URL.",
      });
      return;
    }
    res.json(
      CreateUploadUrlResponse.parse({
        uploadUrl: target.uploadUrl,
        publicUrl: target.publicUrl,
        path,
      }),
    );
  },
);

export default router;
