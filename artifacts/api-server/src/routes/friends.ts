import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  friendRequestsTable,
  friendshipsTable,
  followsTable,
  type FriendRequest,
} from "@workspace/db";
import { and, or, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { toProfile } from "../lib/serialize";
import { createNotification } from "../lib/notify";
import {
  ListFriendsResponse,
  ListFriendRequestsResponse,
  SendFriendRequestBody,
  SendFriendRequestResponse,
  AcceptFriendRequestParams,
  AcceptFriendRequestResponse,
  DeclineFriendRequestParams,
  DeclineFriendRequestResponse,
  RemoveFriendParams,
  FollowUserParams,
  UnfollowUserParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function serializeRequests(rows: FriendRequest[]) {
  if (rows.length === 0) return [];
  const ids = [
    ...new Set(rows.flatMap((r) => [r.requesterId, r.addresseeId])),
  ];
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, ids));
  const map = new Map(profiles.map((p) => [p.id, toProfile(p)]));
  return rows.map((r) => ({
    id: r.id,
    requester: map.get(r.requesterId)!,
    addressee: map.get(r.addresseeId)!,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

router.get("/friends", requireAuth, async (req, res): Promise<void> => {
  const viewer = req.userId!;
  const rows = await db
    .select()
    .from(friendshipsTable)
    .where(
      or(
        eq(friendshipsTable.userAId, viewer),
        eq(friendshipsTable.userBId, viewer),
      ),
    );
  const friendIds = rows.map((f) =>
    f.userAId === viewer ? f.userBId : f.userAId,
  );
  if (friendIds.length === 0) {
    res.json(ListFriendsResponse.parse([]));
    return;
  }
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, friendIds));
  res.json(ListFriendsResponse.parse(profiles.map(toProfile)));
});

router.get("/friends/requests", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(friendRequestsTable)
    .where(
      and(
        eq(friendRequestsTable.addresseeId, req.userId!),
        eq(friendRequestsTable.status, "pending"),
      ),
    );
  res.json(ListFriendRequestsResponse.parse(await serializeRequests(rows)));
});

router.post("/friends/requests", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendFriendRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.addresseeId === req.userId) {
    res.status(400).json({ error: "Cannot friend yourself" });
    return;
  }
  const [row] = await db
    .insert(friendRequestsTable)
    .values({
      requesterId: req.userId!,
      addresseeId: parsed.data.addresseeId,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [friendRequestsTable.requesterId, friendRequestsTable.addresseeId],
      set: { status: "pending" },
    })
    .returning();
  await createNotification({
    userId: parsed.data.addresseeId,
    actorId: req.userId!,
    type: "friend_request",
    entityType: "friend_request",
    entityId: row.id,
  });
  const [serialized] = await serializeRequests([row]);
  res.status(201).json(SendFriendRequestResponse.parse(serialized));
});

router.post(
  "/friends/requests/:id/accept",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AcceptFriendRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [reqRow] = await db
      .select()
      .from(friendRequestsTable)
      .where(eq(friendRequestsTable.id, params.data.id));
    if (!reqRow) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (reqRow.addresseeId !== req.userId) {
      res.status(403).json({ error: "Not your request" });
      return;
    }
    await db
      .update(friendRequestsTable)
      .set({ status: "accepted" })
      .where(eq(friendRequestsTable.id, params.data.id));
    const [a, b] = canonicalPair(reqRow.requesterId, reqRow.addresseeId);
    await db
      .insert(friendshipsTable)
      .values({ userAId: a, userBId: b })
      .onConflictDoNothing();
    await createNotification({
      userId: reqRow.requesterId,
      actorId: req.userId!,
      type: "friend_accept",
      entityType: "user",
    });
    const [serialized] = await serializeRequests([
      { ...reqRow, status: "accepted" },
    ]);
    res.json(AcceptFriendRequestResponse.parse(serialized));
  },
);

router.post(
  "/friends/requests/:id/decline",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeclineFriendRequestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [reqRow] = await db
      .select()
      .from(friendRequestsTable)
      .where(eq(friendRequestsTable.id, params.data.id));
    if (!reqRow) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (reqRow.addresseeId !== req.userId) {
      res.status(403).json({ error: "Not your request" });
      return;
    }
    await db
      .update(friendRequestsTable)
      .set({ status: "declined" })
      .where(eq(friendRequestsTable.id, params.data.id));
    const [serialized] = await serializeRequests([
      { ...reqRow, status: "declined" },
    ]);
    res.json(DeclineFriendRequestResponse.parse(serialized));
  },
);

router.delete("/friends/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveFriendParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [a, b] = canonicalPair(req.userId!, params.data.userId);
  await db
    .delete(friendshipsTable)
    .where(
      and(eq(friendshipsTable.userAId, a), eq(friendshipsTable.userBId, b)),
    );
  res.sendStatus(204);
});

router.post("/follow/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = FollowUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (params.data.userId === req.userId) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }
  await db
    .insert(followsTable)
    .values({ followerId: req.userId!, followingId: params.data.userId })
    .onConflictDoNothing();
  await createNotification({
    userId: params.data.userId,
    actorId: req.userId!,
    type: "follow",
    entityType: "user",
  });
  res.sendStatus(204);
});

router.delete("/follow/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = UnfollowUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(followsTable)
    .where(
      and(
        eq(followsTable.followerId, req.userId!),
        eq(followsTable.followingId, params.data.userId),
      ),
    );
  res.sendStatus(204);
});

export default router;
