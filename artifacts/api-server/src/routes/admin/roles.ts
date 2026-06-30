import { Router, type IRouter } from "express";
import { db, rolePermissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import {
  requirePermission,
  effectivePermissions,
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import { invalidateConfigCache } from "../../lib/flags";

const router: IRouter = Router();

const EDITABLE_ROLES = ["support", "moderator"] as const;

router.get(
  "/permissions",
  requirePermission("roles.view"),
  async (_req, res): Promise<void> => {
    res.json({ permissions: PERMISSIONS });
  },
);

router.get(
  "/roles",
  requirePermission("roles.view"),
  async (_req, res): Promise<void> => {
    const roles = ["admin", "moderator", "support", "user"] as const;
    const result = await Promise.all(
      roles.map(async (role) => ({
        role,
        permissions: await effectivePermissions(role),
        defaults: DEFAULT_ROLE_PERMISSIONS[role],
        editable: (EDITABLE_ROLES as readonly string[]).includes(role),
      })),
    );
    res.json({ catalog: PERMISSIONS, roles: result });
  },
);

const UpdateRoleBody = z.object({
  permissions: z.array(z.enum(PERMISSIONS)),
});

router.put(
  "/roles/:role",
  requirePermission("roles.manage"),
  async (req, res): Promise<void> => {
    const role = String(req.params.role);
    if (!(EDITABLE_ROLES as readonly string[]).includes(role)) {
      res
        .status(400)
        .json({ error: "Only the support and moderator roles can be edited" });
      return;
    }
    const parsed = UpdateRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .insert(rolePermissionsTable)
      .values({
        role: role as never,
        permissions: parsed.data.permissions,
        updatedBy: req.userId!,
      })
      .onConflictDoUpdate({
        target: rolePermissionsTable.role,
        set: { permissions: parsed.data.permissions, updatedBy: req.userId! },
      })
      .returning();
    invalidateConfigCache();
    await writeAudit({
      actorId: req.userId,
      action: "role.update",
      targetType: "role",
      targetId: role,
      metadata: { permissions: parsed.data.permissions },
    });
    res.json(row);
  },
);

export default router;
