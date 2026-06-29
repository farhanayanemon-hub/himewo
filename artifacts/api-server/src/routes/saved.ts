import { Router, type IRouter } from "express";
import { db, savedItemsTable, postsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { canViewPost } from "../lib/authz";
import { buildSavedItems } from "../lib/serialize";
import {
  ListSavedItemsResponse,
  SaveItemBody,
  SaveItemResponse,
  UnsaveItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/saved", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(savedItemsTable)
    .where(eq(savedItemsTable.userId, req.userId!))
    .orderBy(desc(savedItemsTable.createdAt));
  const built = await buildSavedItems(rows, req.userId!);
  res.json(ListSavedItemsResponse.parse(built));
});

router.post("/saved", requireAuth, async (req, res): Promise<void> => {
  const parsed = SaveItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityType, entityId } = parsed.data;
  // Don't let a viewer save a post they can't see (e.g. a locked non-friend's
  // post) — otherwise the saved-list read path would have to silently drop it.
  if (entityType === "post") {
    const [post] = await db
      .select({
        authorId: postsTable.authorId,
        privacy: postsTable.privacy,
        groupId: postsTable.groupId,
      })
      .from(postsTable)
      .where(eq(postsTable.id, entityId));
    if (!post || !(await canViewPost(post, req.userId!))) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
  }
  const [row] = await db
    .insert(savedItemsTable)
    .values({ userId: req.userId!, entityType, entityId })
    .onConflictDoNothing()
    .returning();
  const saved =
    row ??
    (
      await db
        .select()
        .from(savedItemsTable)
        .where(
          and(
            eq(savedItemsTable.userId, req.userId!),
            eq(savedItemsTable.entityType, entityType),
            eq(savedItemsTable.entityId, entityId),
          ),
        )
    )[0];
  const [built] = await buildSavedItems([saved], req.userId!);
  res.status(201).json(SaveItemResponse.parse(built));
});

router.delete(
  "/saved/:entityType/:entityId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UnsaveItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(savedItemsTable)
      .where(
        and(
          eq(savedItemsTable.userId, req.userId!),
          eq(savedItemsTable.entityType, params.data.entityType),
          eq(savedItemsTable.entityId, params.data.entityId),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
