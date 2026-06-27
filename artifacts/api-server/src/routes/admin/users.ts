import { Router, type IRouter } from "express";
import { db, profilesTable, postsTable } from "@workspace/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod/v4";
import { hasPermission, requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import {
  toAdminProfile,
  parsePaging,
} from "../../lib/admin-serialize";
import { getSupabaseAdmin } from "../../lib/supabase";

const router: IRouter = Router();

// List / search / filter users.
router.get(
  "/users",
  requirePermission("users.view"),
  async (req, res): Promise<void> => {
    const { limit, offset } = parsePaging(req.query);
    const q = String(req.query.q ?? "").trim();
    const role = req.query.role;
    const status = req.query.status;

    const conds = [];
    if (q) {
      conds.push(
        or(
          ilike(profilesTable.username, `%${q}%`),
          ilike(profilesTable.displayName, `%${q}%`),
          ilike(profilesTable.email, `%${q}%`),
        ),
      );
    }
    if (typeof role === "string" && role) {
      conds.push(eq(profilesTable.role, role as never));
    }
    if (status === "suspended") conds.push(eq(profilesTable.isSuspended, true));
    else if (status === "banned") conds.push(eq(profilesTable.isBanned, true));
    else if (status === "verified")
      conds.push(eq(profilesTable.isVerified, true));
    else if (status === "active")
      conds.push(
        and(
          eq(profilesTable.isSuspended, false),
          eq(profilesTable.isBanned, false),
        ),
      );
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(profilesTable)
        .where(where)
        .orderBy(desc(profilesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(profilesTable).where(where),
    ]);
    res.json({ items: rows.map(toAdminProfile), total, limit, offset });
  },
);

router.get(
  "/users/:id",
  requirePermission("users.view"),
  async (req, res): Promise<void> => {
    const id = String(req.params.id);
    const [row] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, id));
    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [[posts]] = await Promise.all([
      db
        .select({ value: count() })
        .from(postsTable)
        .where(eq(postsTable.authorId, id)),
    ]);
    res.json({
      ...toAdminProfile(row),
      bio: row.bio,
      location: row.location,
      coverUrl: row.coverUrl,
      postCount: posts?.value ?? 0,
    });
  },
);

const UpdateUserBody = z.object({
  role: z.enum(["user", "support", "moderator", "admin"]).optional(),
  isVerified: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  suspendedUntil: z.string().datetime().nullable().optional(),
  isBanned: z.boolean().optional(),
});

router.patch(
  "/users/:id",
  requirePermission("users.manage"),
  async (req, res): Promise<void> => {
    const id = String(req.params.id);
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [target] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, id));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    // Only admins may modify other admins.
    if (target.role === "admin" && req.adminRole !== "admin") {
      res.status(403).json({ error: "Cannot modify an admin account" });
      return;
    }
    const data = parsed.data;
    if (data.role !== undefined) {
      if (!hasPermission(req, "users.role")) {
        res.status(403).json({ error: "Missing permission: users.role" });
        return;
      }
      if (req.adminRole !== "admin") {
        res.status(403).json({ error: "Only admins can change roles" });
        return;
      }
    }

    const update: Record<string, unknown> = {};
    if (data.role !== undefined) update.role = data.role;
    if (data.isVerified !== undefined) update.isVerified = data.isVerified;
    if (data.isSuspended !== undefined) update.isSuspended = data.isSuspended;
    if (data.suspendedUntil !== undefined)
      update.suspendedUntil = data.suspendedUntil
        ? new Date(data.suspendedUntil)
        : null;
    if (data.isBanned !== undefined) update.isBanned = data.isBanned;
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "No changes" });
      return;
    }

    const [updated] = await db
      .update(profilesTable)
      .set(update)
      .where(eq(profilesTable.id, id))
      .returning();
    await writeAudit({
      actorId: req.userId,
      action: "user.update",
      targetType: "user",
      targetId: id,
      metadata: { changes: update },
    });
    res.json(toAdminProfile(updated));
  },
);

router.delete(
  "/users/:id",
  requirePermission("users.delete"),
  async (req, res): Promise<void> => {
    const id = String(req.params.id);
    if (id === req.userId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }
    const [target] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, id));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role === "admin" && req.adminRole !== "admin") {
      res.status(403).json({ error: "Cannot delete an admin account" });
      return;
    }
    await db.delete(profilesTable).where(eq(profilesTable.id, id));
    await writeAudit({
      actorId: req.userId,
      action: "user.delete",
      targetType: "user",
      targetId: id,
      metadata: { username: target.username },
    });
    res.sendStatus(204);
  },
);

// "Login as user" — issue a magic link (prod) or a dev token (development).
router.post(
  "/users/:id/impersonate",
  requirePermission("users.impersonate"),
  async (req, res): Promise<void> => {
    const id = String(req.params.id);
    const [target] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, id));
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await writeAudit({
      actorId: req.userId,
      action: "user.impersonate",
      targetType: "user",
      targetId: id,
      metadata: { username: target.username },
    });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.json({ mode: "dev", devToken: `dev:${id}` });
      return;
    }
    if (!target.email) {
      res
        .status(400)
        .json({ error: "User has no email; cannot generate a login link" });
      return;
    }
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: target.email,
    });
    if (error) {
      res.status(502).json({ error: error.message });
      return;
    }
    res.json({
      mode: "magiclink",
      actionLink: data.properties?.action_link ?? null,
    });
  },
);

export default router;
