import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  postsTable,
  friendshipsTable,
  friendRequestsTable,
} from "@workspace/db";
import {
  and,
  or,
  eq,
  ne,
  lt,
  desc,
  ilike,
  inArray,
  notInArray,
  isNull,
} from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  toProfile,
  buildProfileDetail,
  buildPosts,
  buildListProfiles,
} from "../lib/serialize";
import { areFriends, canViewProfileDetails } from "../lib/authz";
import {
  SearchUsersQueryParams,
  SearchUsersResponse,
  GetFriendSuggestionsResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
  GetUserParams,
  GetUserResponse,
  GetUserPostsParams,
  GetUserPostsQueryParams,
  GetUserPostsResponse,
  GetUserFriendsParams,
  GetUserFriendsQueryParams,
  GetUserFriendsResponse,
  GetTodaysBirthdaysResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const q = SearchUsersQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const term = (q.data.q ?? "").trim();
  const limit = q.data.limit ?? 20;
  const rows = term
    ? await db
        .select()
        .from(profilesTable)
        .where(
          or(
            ilike(profilesTable.username, `%${term}%`),
            ilike(profilesTable.displayName, `%${term}%`),
          ),
        )
        .limit(limit)
    : await db.select().from(profilesTable).limit(limit);
  res.json(
    SearchUsersResponse.parse(await buildListProfiles(rows)),
  );
});

router.get(
  "/users/suggestions",
  requireAuth,
  async (req, res): Promise<void> => {
    const viewer = req.userId!;
    const friends = await db
      .select()
      .from(friendshipsTable)
      .where(
        or(
          eq(friendshipsTable.userAId, viewer),
          eq(friendshipsTable.userBId, viewer),
        ),
      );
    const friendIds = friends.map((f) =>
      f.userAId === viewer ? f.userBId : f.userAId,
    );

    // Exclude anyone with a pending friend request in either direction —
    // suggesting them again is confusing (the button would just fail).
    const pending = await db
      .select()
      .from(friendRequestsTable)
      .where(
        and(
          eq(friendRequestsTable.status, "pending"),
          or(
            eq(friendRequestsTable.requesterId, viewer),
            eq(friendRequestsTable.addresseeId, viewer),
          ),
        ),
      );
    const pendingIds = pending.map((r) =>
      r.requesterId === viewer ? r.addresseeId : r.requesterId,
    );
    const exclude = [viewer, ...friendIds, ...pendingIds];
    const excludeSet = new Set(exclude);
    const friendIdSet = new Set(friendIds);

    // Friends-of-friends ranked by mutual friend count.
    const mutualCounts = new Map<string, number>();
    if (friendIds.length > 0) {
      const fof = await db
        .select()
        .from(friendshipsTable)
        .where(
          or(
            inArray(friendshipsTable.userAId, friendIds),
            inArray(friendshipsTable.userBId, friendIds),
          ),
        );
      for (const f of fof) {
        const friendSide = friendIdSet.has(f.userAId) ? f.userAId : f.userBId;
        const candidate = friendSide === f.userAId ? f.userBId : f.userAId;
        if (excludeSet.has(candidate)) continue;
        mutualCounts.set(candidate, (mutualCounts.get(candidate) ?? 0) + 1);
      }
    }
    const ranked = [...mutualCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    // Fill the rest with other users so new accounts still see people.
    let fillRows: (typeof profilesTable.$inferSelect)[] = [];
    if (ranked.length < 10) {
      fillRows = await db
        .select()
        .from(profilesTable)
        .where(notInArray(profilesTable.id, [...exclude, ...ranked]))
        .limit(10 - ranked.length);
    }
    const rankedRows = ranked.length
      ? await db
          .select()
          .from(profilesTable)
          .where(inArray(profilesTable.id, ranked))
      : [];
    const rowById = new Map(rankedRows.map((r) => [r.id, r]));
    const orderedRows = [
      ...ranked.map((id) => rowById.get(id)).filter((r): r is NonNullable<typeof r> => !!r),
      ...fillRows,
    ];

    const profiles = await buildListProfiles(orderedRows);
    res.json(
      GetFriendSuggestionsResponse.parse(
        profiles.map((p) => ({
          ...p,
          mutualFriendsCount: mutualCounts.get(p.id) ?? 0,
        })),
      ),
    );
  },
);

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = { ...parsed.data };
  if ("birthday" in updates) {
    const b = String(updates.birthday ?? "").trim();
    updates.birthday = b.length ? b : null;
  }
  await db
    .update(profilesTable)
    .set(updates)
    .where(eq(profilesTable.id, req.userId!));
  const profile = await buildProfileDetail(req.userId!, req.userId);
  res.json(UpdateMyProfileResponse.parse(profile));
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!UUID_RE.test(params.data.id)) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const profile = await buildProfileDetail(params.data.id, req.userId);
  if (!profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetUserResponse.parse(profile));
});

router.get("/users/:id/posts", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserPostsParams.safeParse(req.params);
  const query = GetUserPostsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const viewer = req.userId!;
  const target = params.data.id;
  const isOwner = viewer === target;
  const friend = isOwner ? false : await areFriends(viewer, target);
  // Restricted profile (lock / profileVisibility): unauthorized viewers get an
  // empty timeline.
  if (!(await canViewProfileDetails(target, viewer))) {
    res.json(GetUserPostsResponse.parse([]));
    return;
  }
  // Owner sees all; friends see public + friends; others see public only.
  // Group posts are excluded from the profile timeline.
  const privacyClause = isOwner
    ? undefined
    : friend
      ? or(
          eq(postsTable.privacy, "public"),
          eq(postsTable.privacy, "friends"),
        )
      : eq(postsTable.privacy, "public");
  const { cursor, limit } = query.data;
  const rows = await db
    .select()
    .from(postsTable)
    .where(
      and(
        eq(postsTable.authorId, target),
        isOwner ? undefined : isNull(postsTable.groupId),
        privacyClause,
        cursor ? lt(postsTable.id, cursor) : undefined,
      ),
    )
    .orderBy(desc(postsTable.id))
    .limit(limit ?? 20);
  const posts = await buildPosts(rows, req.userId);
  res.json(GetUserPostsResponse.parse(posts));
});

router.get(
  "/users/:id/friends",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetUserFriendsParams.safeParse(req.params);
    const query = GetUserFriendsQueryParams.safeParse(req.query);
    if (!params.success || !query.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const target = params.data.id;
    const viewer = req.userId!;
    // Restricted profile (lock / profileVisibility): unauthorized viewers
    // cannot see the friends list.
    if (!(await canViewProfileDetails(target, viewer))) {
      res.json(GetUserFriendsResponse.parse([]));
      return;
    }
    const limit = query.data.limit ?? 50;
    const rows = await db
      .select()
      .from(friendshipsTable)
      .where(
        or(
          eq(friendshipsTable.userAId, target),
          eq(friendshipsTable.userBId, target),
        ),
      );
    const friendIds = rows.map((f) =>
      f.userAId === target ? f.userBId : f.userAId,
    );
    if (friendIds.length === 0) {
      res.json(GetUserFriendsResponse.parse([]));
      return;
    }
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(inArray(profilesTable.id, friendIds))
      .limit(limit);
    res.json(
      GetUserFriendsResponse.parse(await buildListProfiles(profiles)),
    );
  },
);

router.get("/birthdays", requireAuth, async (req, res): Promise<void> => {
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
    res.json(GetTodaysBirthdaysResponse.parse([]));
    return;
  }
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, friendIds));

  // Compare on month-day in Asia/Dhaka (HiMewo's primary timezone).
  const todayMmDd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(-5); // "MM-DD"
  const birthdayFriends = profiles.filter(
    (p) => p.birthday && p.birthday.slice(5) === todayMmDd,
  );
  res.json(GetTodaysBirthdaysResponse.parse(birthdayFriends.map((p) => toProfile(p))));
});

export default router;
