import { Router, type IRouter } from "express";
import { DetectCountryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Best-effort IP → country detection for the signup wizard and shop currency.
 * Public (used before login) and must NEVER fail loudly — on any error we
 * return nulls or smart defaults.
 */
router.get("/geo", async (req, res): Promise<void> => {
  const cf = req.headers["cf-ipcountry"];
  if (typeof cf === "string" && cf.trim().length === 2 && cf.toUpperCase() !== "XX" && cf.toUpperCase() !== "T1") {
    const code = cf.toUpperCase();
    const name = code === "BD" ? "Bangladesh" : null;
    res.json(DetectCountryResponse.parse({ countryCode: code, countryName: name }));
    return;
  }

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

  if (isPrivate) {
    // For local development on user's machine, default to Bangladesh (BD)
    countryCode = "BD";
    countryName = "Bangladesh";
  } else {
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
      // best-effort: fallback to BD default
      countryCode = "BD";
      countryName = "Bangladesh";
    }
  }

  res.json(DetectCountryResponse.parse({ countryCode, countryName }));
});

/**
 * Returns dynamic currency information based on client's location:
 * - Bangladesh IP: currency = "BDT", symbol = "৳" (or TK)
 * - Outside Bangladesh: currency = "USD", symbol = "$"
 */
router.get("/shop/currency", (req, res): void => {
  const cf = req.headers["cf-ipcountry"];
  let isBD = true;
  if (typeof cf === "string" && cf.trim().length === 2 && cf.toUpperCase() !== "XX" && cf.toUpperCase() !== "T1") {
    isBD = cf.toUpperCase() === "BD";
  } else {
    const fwd = req.headers["x-forwarded-for"];
    const raw = Array.isArray(fwd) ? fwd[0] : fwd;
    const ip = (raw?.split(",")[0] ?? req.socket.remoteAddress ?? "").trim();
    const isPrivate =
      !ip ||
      ip === "::1" ||
      ip.startsWith("127.") ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.");
    if (!isPrivate) {
      // If external and no cf header, could check or default
      isBD = true;
    }
  }

  res.json({
    currency: isBD ? "BDT" : "USD",
    symbol: isBD ? "৳" : "$",
    rate: isBD ? 1 : 120, // 1 USD = 120 BDT
    isBangladesh: isBD,
  });
});

export default router;
