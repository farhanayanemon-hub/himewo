import { Router, type IRouter } from "express";
import { db, pagesTable, pageFollowersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildPage } from "../lib/serialize";
import {
  ListPagesResponse,
  CreatePageBody,
  CreatePageResponse,
  GetPageParams,
  GetPageResponse,
  FollowPageParams,
  UnfollowPageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/pages", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(pagesTable)
    .orderBy(desc(pagesTable.id))
    .limit(50);
  const built = await Promise.all(rows.map((p) => buildPage(p, req.userId)));
  res.json(ListPagesResponse.parse(built));
});

router.post("/pages", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [page] = await db
    .insert(pagesTable)
    .values({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      description: parsed.data.description ?? null,
      avatarUrl: parsed.data.avatarUrl ?? null,
      coverUrl: parsed.data.coverUrl ?? null,
      createdBy: req.userId!,
    })
    .returning();
  await db
    .insert(pageFollowersTable)
    .values({ pageId: page.id, userId: req.userId! })
    .onConflictDoNothing();
  const built = await buildPage(page, req.userId);
  res.status(201).json(CreatePageResponse.parse(built));
});

router.get("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [page] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.json(GetPageResponse.parse(await buildPage(page, req.userId)));
});

router.post("/pages/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const params = FollowPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .insert(pageFollowersTable)
    .values({ pageId: params.data.id, userId: req.userId! })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.delete(
  "/pages/:id/follow",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UnfollowPageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(pageFollowersTable)
      .where(
        and(
          eq(pageFollowersTable.pageId, params.data.id),
          eq(pageFollowersTable.userId, req.userId!),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
