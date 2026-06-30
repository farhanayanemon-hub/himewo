import { type Request, type Response, type NextFunction } from "express";
import { db, profilesTable, rolePermissionsTable } from "@workspace/db";
import type { UserRole } from "@workspace/db";
import { eq } from "drizzle-orm";

// Catalog of every granular permission used across the admin suite.
export const PERMISSIONS = [
  "dashboard.view",
  "users.view",
  "users.manage",
  "users.role",
  "users.impersonate",
  "users.delete",
  "content.view",
  "content.moderate",
  "messages.view",
  "reports.view",
  "reports.manage",
  "communities.view",
  "communities.manage",
  "announcements.view",
  "announcements.manage",
  "settings.view",
  "settings.manage",
  "roles.view",
  "roles.manage",
  "audit.view",
  "verification.view",
  "verification.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Roles that may access the admin panel at all.
export const PANEL_ROLES: UserRole[] = ["admin", "moderator", "support"];

// Built-in defaults. Stored overrides in `role_permissions` take precedence.
// "admin" always implicitly has every permission.
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [],
  support: [
    "dashboard.view",
    "users.view",
    "users.impersonate",
    "reports.view",
    "content.view",
    "communities.view",
    "announcements.view",
    "verification.view",
    "audit.view",
  ],
  moderator: [
    "dashboard.view",
    "users.view",
    "users.manage",
    "content.view",
    "content.moderate",
    "messages.view",
    "reports.view",
    "reports.manage",
    "communities.view",
    "communities.manage",
    "announcements.view",
    "verification.view",
    "verification.manage",
    "audit.view",
  ],
  admin: [...PERMISSIONS],
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminRole?: UserRole;
      adminPermissions?: Permission[];
    }
  }
}

export async function getRole(userId: string): Promise<UserRole | null> {
  const [row] = await db
    .select({ role: profilesTable.role })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  return row?.role ?? null;
}

export async function effectivePermissions(
  role: UserRole,
): Promise<Permission[]> {
  if (role === "admin") return [...PERMISSIONS];
  const [row] = await db
    .select()
    .from(rolePermissionsTable)
    .where(eq(rolePermissionsTable.role, role));
  const stored = row?.permissions as string[] | undefined;
  if (stored && stored.length > 0) {
    const valid = new Set<string>(PERMISSIONS);
    return stored.filter((p): p is Permission => valid.has(p));
  }
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

// Gate: signed in AND holds a panel role. Attaches role + effective permissions.
export function requirePanel(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void (async () => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const role = await getRole(req.userId);
    if (!role || !PANEL_ROLES.includes(role)) {
      res.status(403).json({ error: "Forbidden: admin panel access required" });
      return;
    }
    req.adminRole = role;
    req.adminPermissions = await effectivePermissions(role);
    next();
  })().catch(next);
}

export function hasPermission(req: Request, perm: Permission): boolean {
  return (
    req.adminRole === "admin" || (req.adminPermissions ?? []).includes(perm)
  );
}

export function requirePermission(perm: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (hasPermission(req, perm)) {
      next();
      return;
    }
    res.status(403).json({ error: `Missing permission: ${perm}` });
  };
}
