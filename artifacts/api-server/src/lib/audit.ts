import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Append an entry to the admin audit log. Every mutating admin action should
 * call this. Failures are swallowed so auditing never breaks the request.
 */
export async function writeAudit(params: {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      actorId: params.actorId ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId != null ? String(params.targetId) : null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    logger.error({ err, action: params.action }, "Failed to write audit log");
  }
}
