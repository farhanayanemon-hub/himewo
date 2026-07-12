import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { buildProfileDetail } from "../lib/serialize";
import { normalizeUsername, isReservedUsername } from "../lib/username";
import { validateFullName, validateNamePart } from "../lib/nameValidation";
import {
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

export default router;
