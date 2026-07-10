import { Router, type IRouter } from "express";
import { db, commentsTable, commentReactionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildCommentById } from "../lib/serialize";
import { createNotification } from "../lib/notify";
import { canViewComment, canManagePage } from "../lib/authz";
import {
  UpdateCommentParams,
  UpdateCommentBody,
  UpdateCommentResponse,
  DeleteCommentParams,
  SetCommentReactionParams,
  SetCommentReactionBody,
  SetCommentReactionResponse,
  RemoveCommentReactionParams,
  RemoveCommentReactionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCommentParams.safeParse(req.params);
  const parsed = UpdateCommentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [existing] = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  if (existing.authorId !== req.userId) {
    res.status(403).json({ error: "Not your comment" });
    return;
  }
  // Comments can only be edited within 15 minutes of posting.
  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  if (Date.now() - new Date(existing.createdAt).getTime() > EDIT_WINDOW_MS) {
    res.status(403).json({ error: "Edit window expired" });
    return;
  }
  await db
    .update(commentsTable)
    .set({ content: parsed.data.content })
    .where(eq(commentsTable.id, params.data.id));
  const built = await buildCommentById(params.data.id, req.userId);
  res.json(UpdateCommentResponse.parse(built));
});

router.delete("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  if (existing.authorId !== req.userId) {
    res.status(403).json({ error: "Not your comment" });
    return;
  }
  await db.delete(commentsTable).where(eq(commentsTable.id, params.data.id));
  res.sendStatus(204);
});

router.put(
  "/comments/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetCommentReactionParams.safeParse(req.params);
    const parsed = SetCommentReactionBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const [comment] = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, params.data.id));
    if (!comment || !(await canViewComment(comment.id, req.userId!))) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    // Optionally react AS a page the user owns/edits. userId stays the acting
    // user (moderation + one-reaction-per-user); pageId only changes identity.
    const reactPageId = parsed.data.pageId ?? null;
    if (
      reactPageId != null &&
      !(await canManagePage(req.userId!, reactPageId))
    ) {
      res
        .status(403)
        .json({ error: "You don't have access to react as this page." });
      return;
    }
    await db
      .insert(commentReactionsTable)
      .values({
        commentId: params.data.id,
        userId: req.userId!,
        pageId: reactPageId,
        type: parsed.data.type,
      })
      .onConflictDoUpdate({
        target: [commentReactionsTable.commentId, commentReactionsTable.userId],
        set: { type: parsed.data.type, pageId: reactPageId },
      });
    await createNotification({
      userId: comment.authorId,
      actorId: req.userId!,
      type: "reaction",
      entityType: "comment",
      entityId: comment.id,
    });
    const built = await buildCommentById(params.data.id, req.userId);
    res.json(SetCommentReactionResponse.parse(built));
  },
);

router.delete(
  "/comments/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveCommentReactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!(await canViewComment(params.data.id, req.userId!))) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    await db
      .delete(commentReactionsTable)
      .where(
        and(
          eq(commentReactionsTable.commentId, params.data.id),
          eq(commentReactionsTable.userId, req.userId!),
        ),
      );
    const built = await buildCommentById(params.data.id, req.userId);
    res.json(RemoveCommentReactionResponse.parse(built));
  },
);

export default router;
