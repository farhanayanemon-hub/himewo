import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import { sql, eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { buildProfileDetail } from "../lib/serialize";
import { normalizeUsername, isReservedUsername } from "../lib/username";
import {
  getBlockedSignupCountries,
  getOtpEvents,
  getSettings,
} from "../lib/flags";
import { sendGreenWebSms } from "../lib/sms";
import { findCountry } from "@workspace/countries";
import {
  validateFullName,
  validateNamePart,
  validateDisplayName,
} from "../lib/nameValidation";
import {
  FindAccountBody,
  FindAccountResponse,
  GetCurrentUserResponse,
  SyncProfileBody,
  SyncProfileResponse,
  ValidateNameBody,
  ValidateNameResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Pick an available canonical username for signup. Normalizes the requested
 * name (lowercase, strip invalid chars) and, if it's taken/reserved/empty,
 * falls back to numbered variants so signup never fails on a name collision.
 */
async function pickAvailableUsername(requested: string): Promise<string> {
  const base = normalizeUsername(requested) || "user";
  const candidates = [base];
  for (let i = 0; i < 5; i++) {
    candidates.push(
      `${base}${Math.floor(Math.random() * 100000)
        .toString()
        .padStart(2, "0")}`,
    );
  }
  for (const candidate of candidates) {
    if (isReservedUsername(candidate)) continue;
    const [taken] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(sql`lower(${profilesTable.username}) = ${candidate}`);
    if (!taken) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const profile = await buildProfileDetail(req.userId!, req.userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found. Call /auth/sync first." });
    return;
  }
  res.json(GetCurrentUserResponse.parse(profile));
});

// Public (used on the wizard's name step, before any session exists). Always
// answers 200 with a result — a rejected name is not an HTTP error.
router.post("/auth/validate-name", async (req, res): Promise<void> => {
  const parsed = ValidateNameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = validateFullName(
    parsed.data.firstName,
    parsed.data.lastName,
  );
  res.json(ValidateNameResponse.parse(result));
});

// ---------------- Find my account (public, rate-limited) ----------------

// Simple in-memory per-IP limiter: FIND_MAX lookups per FIND_WINDOW_MS.
// Good enough for a single-instance API; protects against contact-list
// enumeration without any extra infrastructure.
const FIND_WINDOW_MS = 5 * 60 * 1000;
const FIND_MAX = 10;
const findAttempts = new Map<string, { count: number; resetAt: number }>();

function isFindRateLimited(key: string): boolean {
  const now = Date.now();
  // Opportunistic prune so the map can't grow unbounded.
  if (findAttempts.size > 10_000) {
    for (const [k, v] of findAttempts) {
      if (v.resetAt <= now) findAttempts.delete(k);
    }
  }
  const entry = findAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    findAttempts.set(key, { count: 1, resetAt: now + FIND_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > FIND_MAX;
}

function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    // Use the RIGHTMOST hop: it is appended by our trusted edge proxy and
    // cannot be spoofed by the client (leftmost entries are client-supplied).
    const hops = fwd.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return req.ip ?? "unknown";
}

/** j******e@g****.com — never reveals the full local part or domain name. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const lastDot = domain.lastIndexOf(".");
  const domainName = lastDot > 0 ? domain.slice(0, lastDot) : domain;
  const tld = lastDot > 0 ? domain.slice(lastDot) : "";
  const maskedLocal =
    local.length <= 2
      ? `${local[0] ?? "*"}***`
      : `${local[0]}${"*".repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}`;
  const maskedDomain = `${domainName[0] ?? "*"}${"*".repeat(Math.min(Math.max(domainName.length - 1, 2), 6))}`;
  return `${maskedLocal}@${maskedDomain}${tld}`;
}

/** +8801*****89 — keeps the country-code prefix and last two digits only. */
function maskPhone(phone: string): string {
  const trimmed = phone.replace(/[^\d+]/g, "");
  if (trimmed.length <= 6) return "*".repeat(trimmed.length);
  const head = trimmed.slice(0, 5);
  const tail = trimmed.slice(-2);
  return `${head}${"*".repeat(Math.max(trimmed.length - 7, 3))}${tail}`;
}

router.post("/auth/find-account", async (req, res): Promise<void> => {
  if (isFindRateLimited(clientIp(req))) {
    res.status(429).json({ error: "Too many attempts. Please try again in a few minutes." });
    return;
  }
  const parsed = FindAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const identifier = parsed.data.identifier.trim();
  // Second throttle keyed by the identifier itself so a spoofed/rotating IP
  // still cannot hammer lookups for the same account.
  if (isFindRateLimited(`id:${identifier.toLowerCase()}`)) {
    res.status(429).json({ error: "Too many attempts. Please try again in a few minutes." });
    return;
  }
  const notFound = FindAccountResponse.parse({ found: false });

  let match:
    | { displayName: string; avatarUrl: string | null; email: string | null; phone: string | null }
    | undefined;

  if (identifier.includes("@")) {
    const [row] = await db
      .select({
        displayName: profilesTable.displayName,
        avatarUrl: profilesTable.avatarUrl,
        email: profilesTable.email,
        phone: profilesTable.phone,
      })
      .from(profilesTable)
      .where(sql`lower(${profilesTable.email}) = ${identifier.toLowerCase()}`)
      .limit(1);
    match = row;
    if (match) {
      res.json(
        FindAccountResponse.parse({
          found: true,
          displayName: match.displayName,
          avatarUrl: match.avatarUrl,
          maskedEmail: match.email ? maskEmail(match.email) : null,
          maskedPhone: null,
          method: "email",
        }),
      );
      return;
    }
    res.json(notFound);
    return;
  }

  const digits = identifier.replace(/\D/g, "");
  if (digits.length < 6) {
    res.json(notFound);
    return;
  }
  // Accept local BD format (01XXXXXXXXX) as well as full +880 numbers.
  const candidates = [digits];
  if (digits.startsWith("0")) candidates.push(`880${digits.slice(1)}`);
  const [row] = await db
    .select({
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
      email: profilesTable.email,
      phone: profilesTable.phone,
    })
    .from(profilesTable)
    .where(
      sql`regexp_replace(coalesce(${profilesTable.phone}, ''), '\\D', '', 'g') IN (${sql.join(
        candidates.map((c) => sql`${c}`),
        sql`, `,
      )})`,
    )
    .limit(1);
  if (row) {
    res.json(
      FindAccountResponse.parse({
        found: true,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        maskedEmail: null,
        maskedPhone: row.phone ? maskPhone(row.phone) : null,
        method: "phone",
      }),
    );
    return;
  }
  res.json(notFound);
});

router.post("/auth/sync", requireAuth, async (req, res): Promise<void> => {
  const parsed = SyncProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.userId!;
  const data = parsed.data;
  // Server-side enforcement of the real-name policy — the wizard validates
  // via /auth/validate-name, but sync must reject bad names too so the
  // endpoint can't be used to bypass validation.
  if (data.firstName !== undefined) {
    const err = validateNamePart(data.firstName, "First name");
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
  }
  if (data.lastName !== undefined) {
    const err = validateNamePart(data.lastName, "Last name");
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
  }
  // displayName is re-sent on every login re-sync, so only validate when it's
  // a new profile or the name is actually changing — otherwise a legacy user
  // whose stored name predates the policy would be locked out of login.
  const existing = await db
    .select({
      displayName: profilesTable.displayName,
      phone: profilesTable.phone,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId))
    .limit(1);
  const isNewProfile = existing.length === 0;
  if (isNewProfile || existing[0].displayName !== data.displayName) {
    const err = validateDisplayName(data.displayName);
    if (err) {
      res.status(400).json({ error: err });
      return;
    }
  }
  // Country access control (block-list) for PHONE signups. Enforced whenever a
  // phone is being bound for the first time — a brand-new profile, or an
  // existing account that had no phone yet (closes the "create email account,
  // then bind a blocked-country phone" bypass). It is NEVER enforced on a
  // re-sync where the phone is unchanged, so an existing phone user from a
  // now-blocked country is never locked out of login.
  //
  // The country is derived from and validated against the VERIFIED phone's dial
  // code — a client cannot bypass the block by omitting or spoofing `country`,
  // and an unknown/mismatched country is rejected outright.
  const hadPhone = !isNewProfile && !!existing[0].phone;
  const bindingPhone = !!data.phone && !hadPhone;
  if (bindingPhone) {
    const declared = findCountry(data.country ?? null);
    const normalizedPhone = data.phone!.replace(/\s+/g, "");
    if (!declared || !normalizedPhone.startsWith(declared.dialCode)) {
      res.status(400).json({
        error: "A valid country matching your phone number is required.",
      });
      return;
    }
    const blocked = await getBlockedSignupCountries();
    if (blocked.includes(declared.code)) {
      res.status(403).json({
        error: "Sign-ups from your country are currently not allowed.",
      });
      return;
    }
  }
  const username = await pickAvailableUsername(data.username);
  // Wizard-only fields: never null-out existing values on re-sync — only
  // update when the client actually sends them.
  const wizardSet: Record<string, unknown> = {};
  if (data.firstName !== undefined) wizardSet.firstName = data.firstName;
  if (data.lastName !== undefined) wizardSet.lastName = data.lastName;
  if (data.gender !== undefined) wizardSet.gender = data.gender;
  if (data.birthday !== undefined) wizardSet.birthday = data.birthday;
  if (data.country !== undefined)
    wizardSet.country = data.country.toUpperCase();
  const [row] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      username,
      displayName: data.displayName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      avatarUrl: data.avatarUrl ?? null,
      ...wizardSet,
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        displayName: data.displayName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        avatarUrl: data.avatarUrl ?? null,
        ...wizardSet,
      },
    })
    .returning();
  const profile = await buildProfileDetail(row.id, userId);
  res.json(SyncProfileResponse.parse(profile));
});

// Public (pre-auth) signup configuration so the web/mobile signup UI can hide
// blocked countries before the user picks one. Under /auth so it bypasses the
// maintenance guard like the rest of the signup flow.
router.get("/auth/signup-config", async (_req, res): Promise<void> => {
  const blockedCountries = await getBlockedSignupCountries();
  res.json({ blockedCountries });
});

// Public OTP/verification configuration — which OTP events are enabled and
// whether email/phone verification are required. Clients check this before
// asking Supabase to send an OTP so admin toggles take effect immediately.
router.get("/auth/otp-config", async (_req, res): Promise<void> => {
  const [events, settings] = await Promise.all([getOtpEvents(), getSettings()]);
  res.json({
    events,
    emailVerificationEnabled: settings.email_verification_enabled !== "off",
    phoneVerificationEnabled: settings.phone_verification_enabled !== "off",
  });
});

/**
 * Supabase "send SMS" auth hook. Supabase generates the OTP and calls this
 * endpoint to deliver it; we forward it via the GreenWeb (bdbulksms.com)
 * gateway. BD (+880) numbers ONLY — anything else fails loudly so the user
 * sees a clear error instead of a silently missing SMS.
 *
 * Auth: the hook URI configured in Supabase carries `?key=<sms_hook_secret>`;
 * the constant-time comparison below rejects everything else.
 */
// Abuse guards (SMS-pumping): per-phone and global send-rate caps. In-memory
// is fine — the API runs as a single instance and these are soft limits on
// top of Supabase's own sms_max_frequency throttle.
const smsPerPhone = new Map<string, number[]>();
let smsGlobal: number[] = [];
const SMS_PER_PHONE_MAX = 3; // per 10 minutes per number
const SMS_PER_PHONE_WINDOW_MS = 10 * 60 * 1000;
const SMS_GLOBAL_MAX = 120; // per hour across all numbers
const SMS_GLOBAL_WINDOW_MS = 60 * 60 * 1000;

function smsRateLimited(phone: string): boolean {
  const now = Date.now();
  smsGlobal = smsGlobal.filter((t) => now - t < SMS_GLOBAL_WINDOW_MS);
  if (smsGlobal.length >= SMS_GLOBAL_MAX) return true;
  const hits = (smsPerPhone.get(phone) ?? []).filter(
    (t) => now - t < SMS_PER_PHONE_WINDOW_MS,
  );
  if (hits.length >= SMS_PER_PHONE_MAX) return true;
  hits.push(now);
  smsPerPhone.set(phone, hits);
  smsGlobal.push(now);
  if (smsPerPhone.size > 5000) {
    // Cheap GC so the map can't grow unbounded.
    for (const [k, v] of smsPerPhone) {
      if (v.every((t) => now - t >= SMS_PER_PHONE_WINDOW_MS)) smsPerPhone.delete(k);
    }
  }
  return false;
}

router.post("/auth/sms-hook", async (req, res): Promise<void> => {
  const [settings, otpEvents] = await Promise.all([getSettings(), getOtpEvents()]);
  const secret = (settings.sms_hook_secret || "").trim();
  const provided = String(req.query.key ?? "");
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  // Server-side policy enforcement (client checks are advisory only):
  // master phone switch, plus refuse when every phone OTP event is disabled.
  const anyPhoneEventOn =
    otpEvents.login_phone ||
    otpEvents.signup_phone_verify ||
    otpEvents.password_reset_phone ||
    otpEvents.phone_change;
  if (settings.phone_verification_enabled === "off" || !anyPhoneEventOn) {
    res.status(400).json({
      error: "Phone verification is currently turned off by the admins.",
    });
    return;
  }
  const body = req.body as {
    user?: { phone?: string };
    sms?: { otp?: string };
  };
  const phone = String(body?.user?.phone ?? "");
  const otp = String(body?.sms?.otp ?? "");
  // Strict shape validation — this must look like a Supabase auth-hook OTP.
  if (!/^\+?\d{8,15}$/.test(phone.replace(/\s/g, "")) || !/^\d{4,10}$/.test(otp)) {
    res.status(400).json({ error: "invalid request" });
    return;
  }
  if (smsRateLimited(phone)) {
    res.status(429).json({ error: "Too many codes requested — try again later." });
    return;
  }
  try {
    await sendGreenWebSms(
      phone,
      `Your HiMewo verification code is ${otp}. It expires in 5 minutes.`,
    );
    res.json({});
  } catch (err) {
    // Log the provider detail privately; keep the caller-facing error generic
    // (except the BD-only rule, which the end user genuinely needs to see).
    console.error("[sms-hook] delivery failed:", err);
    const msg =
      err instanceof Error && /Bangladeshi/.test(err.message)
        ? err.message
        : "SMS delivery failed. Please try again later.";
    res.status(400).json({ error: msg });
  }
});

export default router;
