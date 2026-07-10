import { Router, type IRouter } from "express";
import {
  db,
  pagesTable,
  pageFollowersTable,
  pageMembersTable,
  pageReviewsTable,
  profilesTable,
  postsTable,
} from "@workspace/db";
import { and, eq, lt, desc, or, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  buildPage,
  buildPageReviews,
  buildPageMembers,
  buildPosts,
} from "../lib/serialize";
import {
  ListPagesResponse,
  ListPagesQueryParams,
  ListPageMembersParams,
  ListPageMembersResponse,
  AddPageMemberParams,
  AddPageMemberBody,
  AddPageMemberResponse,
  RemovePageMemberParams,
  CreatePageBody,
  CreatePageResponse,
  GetPageParams,
  GetPageResponse,
  UpdatePageParams,
  UpdatePageBody,
  UpdatePageResponse,
  GetPagePostsParams,
  GetPagePostsQueryParams,
  GetPagePostsResponse,
  FollowPageParams,
  UnfollowPageParams,
  ListPageReviewsParams,
  ListPageReviewsResponse,
  ReviewPageParams,
  ReviewPageBody,
  ReviewPageResponse,
  DeletePageReviewParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

router.get("/pages", requireAuth, async (req, res): Promise<void> => {
  const query = ListPagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let where;
  if (query.data.mine) {
    const memberRows = await db
      .select({ pageId: pageMembersTable.pageId })
      .from(pageMembersTable)
      .where(eq(pageMembersTable.userId, req.userId!));
    const memberPageIds = memberRows.map((r) => r.pageId);
    where = or(
      eq(pagesTable.createdBy, req.userId!),
      memberPageIds.length > 0 ? inArray(pagesTable.id, memberPageIds) : undefined,
    );
  }
  const rows = await db
    .select()
    .from(pagesTable)
    .where(where)
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
  if (
    !isSafeHttpUrl(parsed.data.website) ||
    !isSafeHttpUrl(parsed.data.ctaUrl)
  ) {
    res.status(400).json({ error: "Website and button link must be http(s) URLs" });
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
      contactPhone: parsed.data.contactPhone ?? null,
      contactEmail: parsed.data.contactEmail ?? null,
      website: parsed.data.website ?? null,
      address: parsed.data.address ?? null,
      hours: parsed.data.hours ?? null,
      ctaType: parsed.data.ctaType ?? "none",
      ctaUrl: parsed.data.ctaUrl ?? null,
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

router.patch("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePageParams.safeParse(req.params);
  const parsed = UpdatePageBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  if (
    !isSafeHttpUrl(parsed.data.website) ||
    !isSafeHttpUrl(parsed.data.ctaUrl)
  ) {
    res.status(400).json({ error: "Website and button link must be http(s) URLs" });
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
  if (page.createdBy !== req.userId) {
    const [member] = await db
      .select({ id: pageMembersTable.id })
      .from(pageMembersTable)
      .where(
        and(
          eq(pageMembersTable.pageId, params.data.id),
          eq(pageMembersTable.userId, req.userId!),
        ),
      );
    if (!member) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const [updated] = await db
    .update(pagesTable)
    .set(parsed.data)
    .where(eq(pagesTable.id, params.data.id))
    .returning();
  res.json(UpdatePageResponse.parse(await buildPage(updated, req.userId)));
});

// ---------------- Page access (members) ----------------
// Only the page OWNER may view/manage the Page access list.
async function requirePageOwner(
  res: Parameters<Parameters<IRouter["get"]>[1]>[1],
  userId: string,
  pageId: number,
): Promise<boolean> {
  const [page] = await db
    .select({ createdBy: pagesTable.createdBy })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return false;
  }
  if (page.createdBy !== userId) {
    res.status(403).json({ error: "Only the page owner can manage Page access" });
    return false;
  }
  return true;
}

router.get(
  "/pages/:id/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListPageMembersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!(await requirePageOwner(res, req.userId!, params.data.id))) return;
    const rows = await db
      .select()
      .from(pageMembersTable)
      .where(eq(pageMembersTable.pageId, params.data.id))
      .orderBy(desc(pageMembersTable.id));
    res.json(ListPageMembersResponse.parse(await buildPageMembers(rows)));
  },
);

router.post(
  "/pages/:id/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AddPageMemberParams.safeParse(req.params);
    const body = AddPageMemberBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!(await requirePageOwner(res, req.userId!, params.data.id))) return;
    if (body.data.userId === req.userId) {
      res.status(400).json({ error: "You already own this page" });
      return;
    }
    const [profile] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, body.data.userId));
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [row] = await db
      .insert(pageMembersTable)
      .values({
        pageId: params.data.id,
        userId: body.data.userId,
        role: body.data.role ?? "editor",
      })
      .onConflictDoUpdate({
        target: [pageMembersTable.pageId, pageMembersTable.userId],
        set: { role: body.data.role ?? "editor" },
      })
      .returning();
    const [built] = await buildPageMembers([row]);
    res.status(201).json(AddPageMemberResponse.parse(built));
  },
);

router.delete(
  "/pages/:id/members/:userId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemovePageMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!(await requirePageOwner(res, req.userId!, params.data.id))) return;
    await db
      .delete(pageMembersTable)
      .where(
        and(
          eq(pageMembersTable.pageId, params.data.id),
          eq(pageMembersTable.userId, params.data.userId),
        ),
      );
    res.sendStatus(204);
  },
);

router.get(
  "/pages/:id/reviews",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListPageReviewsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(pageReviewsTable)
      .where(eq(pageReviewsTable.pageId, params.data.id))
      .orderBy(desc(pageReviewsTable.id))
      .limit(100);
    res.json(ListPageReviewsResponse.parse(await buildPageReviews(rows)));
  },
);

router.post(
  "/pages/:id/reviews",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ReviewPageParams.safeParse(req.params);
    const parsed = ReviewPageBody.safeParse(req.body);
    if (!params.success || !parsed.success) {
      res.status(400).json({ error: "Invalid request" });
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
    const [row] = await db
      .insert(pageReviewsTable)
      .values({
        pageId: params.data.id,
        userId: req.userId!,
        rating: parsed.data.rating,
        body: parsed.data.body ?? null,
      })
      .onConflictDoUpdate({
        target: [pageReviewsTable.pageId, pageReviewsTable.userId],
        set: { rating: parsed.data.rating, body: parsed.data.body ?? null },
      })
      .returning();
    const [built] = await buildPageReviews([row]);
    res.json(ReviewPageResponse.parse(built));
  },
);

router.delete(
  "/pages/:id/reviews",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeletePageReviewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(pageReviewsTable)
      .where(
        and(
          eq(pageReviewsTable.pageId, params.data.id),
          eq(pageReviewsTable.userId, req.userId!),
        ),
      );
    res.sendStatus(204);
  },
);

router.get(
  "/pages/:id/posts",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetPagePostsParams.safeParse(req.params);
    const query = GetPagePostsQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const { cursor, limit } = query.data;
    const rows = await db
      .select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.pageId, params.data.id),
          cursor ? lt(postsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(postsTable.id))
      .limit(limit ?? 20);
    const built = await buildPosts(rows, req.userId);
    res.json(GetPagePostsResponse.parse(built));
  },
);

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
