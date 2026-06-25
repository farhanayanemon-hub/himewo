import { Router, type IRouter } from "express";
import {
  db,
  groupsTable,
  groupMembersTable,
  postsTable,
} from "@workspace/db";
import { and, eq, lt, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildGroup, buildPosts } from "../lib/serialize";
import {
  ListGroupsResponse,
  CreateGroupBody,
  CreateGroupResponse,
  GetGroupParams,
  GetGroupResponse,
  JoinGroupParams,
  LeaveGroupParams,
  GetGroupPostsParams,
  GetGroupPostsQueryParams,
  GetGroupPostsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/groups", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(groupsTable)
    .orderBy(desc(groupsTable.id))
    .limit(50);
  const built = await Promise.all(rows.map((g) => buildGroup(g, req.userId)));
  res.json(ListGroupsResponse.parse(built));
});

router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [group] = await db
    .insert(groupsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      privacy: parsed.data.privacy ?? "public",
      avatarUrl: parsed.data.avatarUrl ?? null,
      coverUrl: parsed.data.coverUrl ?? null,
      createdBy: req.userId!,
    })
    .returning();
  await db
    .insert(groupMembersTable)
    .values({ groupId: group.id, userId: req.userId!, role: "admin" });
  const built = await buildGroup(group, req.userId);
  res.status(201).json(CreateGroupResponse.parse(built));
});

router.get("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, params.data.id));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(GetGroupResponse.parse(await buildGroup(group, req.userId)));
});

router.post("/groups/:id/join", requireAuth, async (req, res): Promise<void> => {
  const params = JoinGroupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .insert(groupMembersTable)
    .values({ groupId: params.data.id, userId: req.userId! })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.post(
  "/groups/:id/leave",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = LeaveGroupParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, req.userId!),
        ),
      );
    res.sendStatus(204);
  },
);

router.get(
  "/groups/:id/posts",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetGroupPostsParams.safeParse(req.params);
    const query = GetGroupPostsQueryParams.safeParse(req.query);
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
          eq(postsTable.groupId, params.data.id),
          cursor ? lt(postsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(postsTable.id))
      .limit(limit ?? 20);
    const built = await buildPosts(rows, req.userId);
    res.json(GetGroupPostsResponse.parse(built));
  },
);

export default router;
