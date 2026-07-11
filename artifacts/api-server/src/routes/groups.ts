import { Router, type IRouter } from "express";
import {
  db,
  groupsTable,
  groupMembersTable,
  groupInvitesTable,
  postsTable,
} from "@workspace/db";
import { and, eq, lt, desc, ne, asc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createNotification } from "../lib/notify";
import { getFriendIds } from "../lib/authz";
import { buildGroup, buildPosts, buildGroupMembers } from "../lib/serialize";
import {
  ListGroupsResponse,
  CreateGroupBody,
  CreateGroupResponse,
  GetGroupParams,
  GetGroupResponse,
  UpdateGroupParams,
  UpdateGroupBody,
  UpdateGroupResponse,
  JoinGroupParams,
  JoinGroupBody,
  LeaveGroupParams,
  ListGroupMembersParams,
  ListGroupMembersResponse,
  ListGroupRequestsParams,
  ListGroupRequestsResponse,
  ApproveGroupRequestParams,
  DeclineGroupRequestParams,
  SetGroupMemberRoleParams,
  SetGroupMemberRoleBody,
  BanGroupMemberParams,
  MuteGroupMemberParams,
  MuteGroupMemberBody,
  RemoveGroupMemberParams,
  ListPendingGroupPostsParams,
  ListPendingGroupPostsResponse,
  ApproveGroupPostParams,
  RejectGroupPostParams,
  GetGroupPostsParams,
  GetGroupPostsQueryParams,
  GetGroupPostsResponse,
  ListGroupInvitesResponse,
  InviteToGroupParams,
  InviteToGroupBody,
  DeclineGroupInviteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type MemberRow = typeof groupMembersTable.$inferSelect;

async function getMembership(
  groupId: number,
  userId: string,
): Promise<MemberRow | undefined> {
  const [row] = await db
    .select()
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    );
  return row;
}

function isActiveAdmin(m: MemberRow | undefined): boolean {
  return !!m && m.status === "active" && m.role === "admin";
}

function isActiveMod(m: MemberRow | undefined): boolean {
  return (
    !!m &&
    m.status === "active" &&
    (m.role === "admin" || m.role === "moderator")
  );
}

router.get("/groups", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(groupsTable)
    .orderBy(desc(groupsTable.id))
    .limit(50);
  const built = await Promise.all(rows.map((g) => buildGroup(g, req.userId)));
  // Hidden groups are only visible in listings to their active members.
  const visible = built.filter(
    (g) => g.privacy !== "hidden" || g.viewerIsMember,
  );
  res.json(ListGroupsResponse.parse(visible));
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
      rules: parsed.data.rules ?? null,
      requirePostApproval: parsed.data.requirePostApproval ?? false,
      joinQuestions: parsed.data.joinQuestions ?? null,
      createdBy: req.userId!,
    })
    .returning();
  await db.insert(groupMembersTable).values({
    groupId: group.id,
    userId: req.userId!,
    role: "admin",
    status: "active",
  });
  const built = await buildGroup(group, req.userId);
  res.status(201).json(CreateGroupResponse.parse(built));
});

router.get(
  "/groups/invites",
  requireAuth,
  async (req, res): Promise<void> => {
    const rows = await db
      .select({ g: groupsTable })
      .from(groupInvitesTable)
      .innerJoin(groupsTable, eq(groupInvitesTable.groupId, groupsTable.id))
      .where(eq(groupInvitesTable.inviteeId, req.userId!))
      .orderBy(desc(groupInvitesTable.createdAt));
    const built = await Promise.all(
      rows.map((r) => buildGroup(r.g, req.userId)),
    );
    res.json(ListGroupInvitesResponse.parse(built));
  },
);

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
  const built = await buildGroup(group, req.userId);
  if (built.privacy === "hidden" && !built.viewerIsMember) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(GetGroupResponse.parse(built));
});

router.patch("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateGroupParams.safeParse(req.params);
  const body = UpdateGroupBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const membership = await getMembership(params.data.id, req.userId!);
  if (!isActiveAdmin(membership)) {
    res.status(403).json({ error: "Only admins can edit this group" });
    return;
  }
  const d = body.data;
  const updates: Partial<typeof groupsTable.$inferInsert> = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.description !== undefined) updates.description = d.description;
  if (d.privacy !== undefined) updates.privacy = d.privacy;
  if (d.avatarUrl !== undefined) updates.avatarUrl = d.avatarUrl;
  if (d.coverUrl !== undefined) updates.coverUrl = d.coverUrl;
  if (d.rules !== undefined) updates.rules = d.rules;
  if (d.requirePostApproval !== undefined)
    updates.requirePostApproval = d.requirePostApproval;
  if (d.joinQuestions !== undefined) updates.joinQuestions = d.joinQuestions;
  if (d.pinnedPostId !== undefined) updates.pinnedPostId = d.pinnedPostId;
  const [group] = await db
    .update(groupsTable)
    .set(updates)
    .where(eq(groupsTable.id, params.data.id))
    .returning();
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(UpdateGroupResponse.parse(await buildGroup(group, req.userId)));
});

router.post("/groups/:id/join", requireAuth, async (req, res): Promise<void> => {
  const params = JoinGroupParams.safeParse(req.params);
  const body = JoinGroupBody.safeParse(req.body ?? {});
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
  const existing = await getMembership(params.data.id, req.userId!);
  if (existing?.status === "banned") {
    res.status(403).json({ error: "You are banned from this group" });
    return;
  }
  if (existing?.status === "active") {
    res.sendStatus(204);
    return;
  }
  // An outstanding invite lets the user join immediately, even for a
  // private group (invited users bypass approval).
  const [invite] = await db
    .select()
    .from(groupInvitesTable)
    .where(
      and(
        eq(groupInvitesTable.groupId, params.data.id),
        eq(groupInvitesTable.inviteeId, req.userId!),
      ),
    );
  const status =
    group.privacy === "public" || invite ? "active" : "pending";
  const answers = body.success ? (body.data?.answers ?? null) : null;
  await db
    .insert(groupMembersTable)
    .values({
      groupId: params.data.id,
      userId: req.userId!,
      role: "member",
      status,
      answers,
    })
    .onConflictDoUpdate({
      target: [groupMembersTable.groupId, groupMembersTable.userId],
      set: { status, answers },
    });
  if (invite) {
    await db
      .delete(groupInvitesTable)
      .where(
        and(
          eq(groupInvitesTable.groupId, params.data.id),
          eq(groupInvitesTable.inviteeId, req.userId!),
        ),
      );
  }
  res.sendStatus(204);
});

router.post(
  "/groups/:id/invite",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = InviteToGroupParams.safeParse(req.params);
    const body = InviteToGroupBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
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
    const membership = await getMembership(params.data.id, req.userId!);
    if (!membership || membership.status !== "active") {
      res.status(403).json({ error: "Only members can invite others" });
      return;
    }
    // You may only invite your own friends — prevents notifying arbitrary
    // users by guessing UUIDs (spam vector).
    const friendIds = await getFriendIds(req.userId!);
    const inviteeIds = [...new Set(body.data.userIds)].filter(
      (u) => u !== req.userId! && friendIds.has(u),
    );
    if (inviteeIds.length === 0) {
      res.sendStatus(204);
      return;
    }
    // Skip people who are already active members.
    const memberRows = await db
      .select({
        userId: groupMembersTable.userId,
        status: groupMembersTable.status,
      })
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          inArray(groupMembersTable.userId, inviteeIds),
        ),
      );
    const activeMembers = new Set(
      memberRows.filter((m) => m.status === "active").map((m) => m.userId),
    );
    for (const inviteeId of inviteeIds.filter((u) => !activeMembers.has(u))) {
      const [inv] = await db
        .insert(groupInvitesTable)
        .values({ groupId: params.data.id, inviterId: req.userId!, inviteeId })
        .onConflictDoNothing()
        .returning();
      if (inv) {
        await createNotification({
          userId: inviteeId,
          actorId: req.userId!,
          type: "group_invite",
          entityType: "group",
          entityId: params.data.id,
        });
      }
    }
    res.sendStatus(204);
  },
);

router.post(
  "/groups/:id/invite/decline",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeclineGroupInviteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    await db
      .delete(groupInvitesTable)
      .where(
        and(
          eq(groupInvitesTable.groupId, params.data.id),
          eq(groupInvitesTable.inviteeId, req.userId!),
        ),
      );
    res.sendStatus(204);
  },
);

router.delete(
  "/groups/:id/leave",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = LeaveGroupParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    // Banned members cannot clear their ban by leaving.
    await db
      .delete(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, req.userId!),
          ne(groupMembersTable.status, "banned"),
        ),
      );
    res.sendStatus(204);
  },
);

router.get(
  "/groups/:id/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListGroupMembersParams.safeParse(req.params);
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
    if (group.privacy !== "public") {
      const membership = await getMembership(params.data.id, req.userId!);
      if (!membership || membership.status !== "active") {
        res.status(403).json({ error: "Members only" });
        return;
      }
    }
    const rows = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.status, "active"),
        ),
      )
      .orderBy(asc(groupMembersTable.joinedAt));
    res.json(ListGroupMembersResponse.parse(await buildGroupMembers(rows)));
  },
);

router.get(
  "/groups/:id/requests",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListGroupRequestsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(membership)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    const rows = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.status, "pending"),
        ),
      )
      .orderBy(asc(groupMembersTable.joinedAt));
    res.json(ListGroupRequestsResponse.parse(await buildGroupMembers(rows)));
  },
);

router.post(
  "/groups/:id/requests/:userId/approve",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ApproveGroupRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(membership)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    await db
      .update(groupMembersTable)
      .set({ status: "active" })
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, params.data.userId),
          eq(groupMembersTable.status, "pending"),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/groups/:id/requests/:userId/decline",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeclineGroupRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(membership)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    await db
      .delete(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, params.data.userId),
          eq(groupMembersTable.status, "pending"),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/groups/:id/members/:userId/role",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetGroupMemberRoleParams.safeParse(req.params);
    const body = SetGroupMemberRoleBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
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
    const actor = await getMembership(params.data.id, req.userId!);
    if (!isActiveAdmin(actor)) {
      res.status(403).json({ error: "Only admins can change roles" });
      return;
    }
    if (params.data.userId === group.createdBy) {
      res.status(403).json({ error: "Cannot change the owner's role" });
      return;
    }
    await db
      .update(groupMembersTable)
      .set({ role: body.data.role })
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, params.data.userId),
          eq(groupMembersTable.status, "active"),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/groups/:id/members/:userId/ban",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = BanGroupMemberParams.safeParse(req.params);
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
    const actor = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(actor)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    if (params.data.userId === group.createdBy) {
      res.status(403).json({ error: "Cannot ban the owner" });
      return;
    }
    const target = await getMembership(params.data.id, params.data.userId);
    if (target?.role === "admin" && actor!.role !== "admin") {
      res.status(403).json({ error: "Moderators cannot ban admins" });
      return;
    }
    await db
      .update(groupMembersTable)
      .set({ status: "banned", role: "member", isMuted: false })
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, params.data.userId),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/groups/:id/members/:userId/mute",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = MuteGroupMemberParams.safeParse(req.params);
    const body = MuteGroupMemberBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid request" });
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
    const actor = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(actor)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    if (params.data.userId === group.createdBy) {
      res.status(403).json({ error: "Cannot mute the owner" });
      return;
    }
    const target = await getMembership(params.data.id, params.data.userId);
    if (target?.role === "admin" && actor!.role !== "admin") {
      res.status(403).json({ error: "Moderators cannot mute admins" });
      return;
    }
    await db
      .update(groupMembersTable)
      .set({ isMuted: body.data.muted })
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, params.data.userId),
          eq(groupMembersTable.status, "active"),
        ),
      );
    res.sendStatus(204);
  },
);

router.delete(
  "/groups/:id/members/:userId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveGroupMemberParams.safeParse(req.params);
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
    const actor = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(actor)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    if (params.data.userId === group.createdBy) {
      res.status(403).json({ error: "Cannot remove the owner" });
      return;
    }
    const target = await getMembership(params.data.id, params.data.userId);
    if (target?.role === "admin" && actor!.role !== "admin") {
      res.status(403).json({ error: "Moderators cannot remove admins" });
      return;
    }
    await db
      .delete(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, params.data.id),
          eq(groupMembersTable.userId, params.data.userId),
          ne(groupMembersTable.status, "banned"),
        ),
      );
    res.sendStatus(204);
  },
);

router.get(
  "/groups/:id/pending-posts",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListPendingGroupPostsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(membership)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    const rows = await db
      .select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.groupId, params.data.id),
          eq(postsTable.pendingApproval, true),
        ),
      )
      .orderBy(desc(postsTable.id))
      .limit(50);
    const built = await buildPosts(rows, req.userId);
    res.json(ListPendingGroupPostsResponse.parse(built));
  },
);

router.post(
  "/groups/:id/pending-posts/:postId/approve",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ApproveGroupPostParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(membership)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    await db
      .update(postsTable)
      .set({ pendingApproval: false })
      .where(
        and(
          eq(postsTable.id, params.data.postId),
          eq(postsTable.groupId, params.data.id),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/groups/:id/pending-posts/:postId/reject",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RejectGroupPostParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const membership = await getMembership(params.data.id, req.userId!);
    if (!isActiveMod(membership)) {
      res.status(403).json({ error: "Moderators only" });
      return;
    }
    await db
      .delete(postsTable)
      .where(
        and(
          eq(postsTable.id, params.data.postId),
          eq(postsTable.groupId, params.data.id),
          eq(postsTable.pendingApproval, true),
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
    const pageSize = limit ?? 20;
    const [group] = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, params.data.id));
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    // Posts in private/hidden groups are only readable by active members;
    // hidden groups return 404 to non-members so they stay unlisted.
    if (group.privacy !== "public") {
      const membership = await getMembership(params.data.id, req.userId!);
      const isActiveMember = membership?.status === "active";
      if (!isActiveMember) {
        if (group.privacy === "hidden") {
          res.status(404).json({ error: "Group not found" });
        } else {
          res.status(403).json({ error: "Members only" });
        }
        return;
      }
    }
    let rows = await db
      .select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.groupId, params.data.id),
          eq(postsTable.pendingApproval, false),
          cursor ? lt(postsTable.id, cursor) : undefined,
        ),
      )
      .orderBy(desc(postsTable.id))
      .limit(pageSize);
    // Float the pinned post to the top of the first page, keeping the page size.
    if (!cursor && group.pinnedPostId) {
      const pinnedId = group.pinnedPostId;
      rows = rows.filter((r) => r.id !== pinnedId);
      const [pinned] = await db
        .select()
        .from(postsTable)
        .where(
          and(
            eq(postsTable.id, pinnedId),
            eq(postsTable.groupId, params.data.id),
            eq(postsTable.pendingApproval, false),
          ),
        );
      if (pinned) rows = [pinned, ...rows].slice(0, pageSize);
    }
    const built = await buildPosts(rows, req.userId);
    res.json(GetGroupPostsResponse.parse(built));
  },
);

export default router;
