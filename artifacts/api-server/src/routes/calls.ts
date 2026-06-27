import { Router, type IRouter } from "express";
import { SignJWT } from "jose";
import { requireAuth } from "../lib/auth";
import { env, isCallsConfigured } from "../lib/env";

const router: IRouter = Router();

const TOKEN_TTL_SECONDS = 60 * 60 * 24;

/**
 * Issues a Stream Video user token for the authenticated user.
 *
 * Stream user tokens are JWTs signed (HS256) with the app's API secret and
 * carrying a `user_id` claim — so we mint them with `jose` and never ship the
 * secret to the client. Returns 503 when Stream isn't configured so the mobile
 * app can degrade gracefully.
 */
router.get("/calls/token", requireAuth, async (req, res): Promise<void> => {
  if (!isCallsConfigured() || !env.streamApiSecret) {
    res.status(503).json({
      error:
        "Calls are not configured. Set STREAM_API_KEY and STREAM_API_SECRET.",
    });
    return;
  }

  const userId = req.userId as string;
  const secret = new TextEncoder().encode(env.streamApiSecret);
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ user_id: userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(secret);

  res.json({ apiKey: env.streamApiKey, token, userId });
});

export default router;
