import { Router, type IRouter } from "express";
import { DetectCountryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Best-effort IP → country detection for the signup wizard's email path.
 * Public (used before login) and must NEVER fail loudly — on any error we
 * return nulls and the client falls back to its own default.
 */
router.get("/geo", async (req, res): Promise<void> => {
  const fwd = req.headers["x-forwarded-for"];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  const ip = (raw?.split(",")[0] ?? req.socket.remoteAddress ?? "").trim();

  const isPrivate =
    !ip ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("::ffff:127.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fe80");

  let countryCode: string | null = null;
  let countryName: string | null = null;

  if (!isPrivate) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(
        `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,country`,
        { signal: controller.signal },
      );
      clearTimeout(timer);
      if (resp.ok) {
        const body = (await resp.json()) as {
          success?: boolean;
          country_code?: string;
          country?: string;
        };
        if (body.success && typeof body.country_code === "string") {
          countryCode = body.country_code.toUpperCase();
          countryName = typeof body.country === "string" ? body.country : null;
        }
      }
    } catch {
      // best-effort: fall through to nulls
    }
  }

  res.json(DetectCountryResponse.parse({ countryCode, countryName }));
});

export default router;
