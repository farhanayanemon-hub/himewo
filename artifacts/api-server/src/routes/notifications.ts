import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, eq, lt, desc, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildNotifications } from "../lib/serialize";
import {
  ListNotificationsQueryParams,
  ListNotificationsResponse,
  GetUnreadNotificationCountResponse,
  MarkNotificationReadParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const query = ListNotificationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, req.userId!),
        cursor ? lt(notificationsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(notificationsTable.id))
    .limit(limit ?? 30);
  res.json(ListNotificationsResponse.parse(await buildNotifications(rows)));
});

router.get(
  "/notifications/count",
  requireAuth,
  async (req, res): Promise<void> => {
    const [row] = await db
      .select({ value: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, req.userId!),
          eq(notificationsTable.isRead, false),
        ),
      );
    res.json(
      GetUnreadNotificationCountResponse.parse({ count: row?.value ?? 0 }),
    );
  },
);

router.post(
  "/notifications/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = MarkNotificationReadParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, params.data.id),
          eq(notificationsTable.userId, req.userId!),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/notifications/read-all",
  requireAuth,
  async (req, res): Promise<void> => {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.userId!));
    res.sendStatus(204);
  },
);

export default router;
