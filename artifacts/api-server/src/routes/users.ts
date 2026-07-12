import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  postsTable,
  friendshipsTable,
  friendRequestsTable,
  albumsTable,
  albumPhotosTable,
  userBlocksTable,
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
  sql,
} from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  USERNAME_PATTERN,
  isReservedUsername,
  isUniqueViolation,
} from "../lib/username";
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
  GetUserByUsernameParams,
  GetUserByUsernameResponse,
  GetUserParams,
  GetUserResponse,
  GetUserPostsParams,
  GetUserPostsQueryParams,
  GetUserPostsResponse,
  GetUserFriendsParams,
  GetUserFriendsQueryParams,
  GetUserFriendsResponse,
  GetTodaysBirthdaysResponse,
  BlockUserParams,
  UnblockUserParams,
  RestrictUserParams,
  UnrestrictUserParams,
  ListBlockedUsersResponse,
  ListRestrictedUsersResponse,
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

// FB-style rename cooldowns: username locks for 30 days after a change,
// display name for 60 days. The value picked at signup can be changed once
// immediately (changedAt is null until the first user-initiated change).
const USERNAME_COOLDOWN_DAYS = 30;
const DISPLAY_NAME_COOLDOWN_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

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

  const [me] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, req.userId!));
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const now = new Date();

  if (typeof updates.username === "string") {
    const next = updates.username.trim().toLowerCase();
    if (next === me.username.toLowerCase()) {
      delete updates.username;
    } else {
      if (!USERNAME_PATTERN.test(next)) {
        res.status(400).json({
          error:
            "Usernames can only contain lowercase letters, numbers, periods and underscores.",
        });
        return;
      }
      if (isReservedUsername(next)) {
        res.status(409).json({ error: "This username is not available." });
        return;
      }
      if (me.usernameChangedAt) {
        const nextAllowed = new Date(
          me.usernameChangedAt.getTime() + USERNAME_COOLDOWN_DAYS * DAY_MS,
        );
        if (now < nextAllowed) {
          res.status(403).json({
            error: `You can change your username again on ${nextAllowed.toISOString().slice(0, 10)}. Usernames can only be changed once every ${USERNAME_COOLDOWN_DAYS} days.`,
          });
          return;
        }
      }
      const [taken] = await db
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(sql`lower(${profilesTable.username}) = ${next}`);
      if (taken) {
        res.status(409).json({ error: "This username is already taken." });
        return;
      }
      updates.username = next;
      updates.usernameChangedAt = now;
    }
  }

  if (typeof updates.displayName === "string") {
    const next = updates.displayName.trim();
    if (!next.length || next === me.displayName) {
      delete updates.displayName;
    } else {
      if (me.displayNameChangedAt) {
        const nextAllowed = new Date(
          me.displayNameChangedAt.getTime() +
            DISPLAY_NAME_COOLDOWN_DAYS * DAY_MS,
        );
        if (now < nextAllowed) {
          res.status(403).json({
            error: `You can change your name again on ${nextAllowed.toISOString().slice(0, 10)}. Names can only be changed once every ${DISPLAY_NAME_COOLDOWN_DAYS} days.`,
          });
          return;
        }
      }
      updates.displayName = next;
      updates.displayNameChangedAt = now;
    }
  }

  // FB-style auto-albums: every new profile picture / cover photo also lands
  // in the user's "Profile pictures" / "Cover photos" album automatically.
  const autoAlbumAdds: { kind: "profile" | "cover"; url: string }[] = [];
  if (
    typeof updates.avatarUrl === "string" &&
    updates.avatarUrl.trim() &&
    updates.avatarUrl !== me.avatarUrl
  ) {
    autoAlbumAdds.push({ kind: "profile", url: updates.avatarUrl.trim() });
  }
  if (
    typeof updates.coverUrl === "string" &&
    updates.coverUrl.trim() &&
    updates.coverUrl !== me.coverUrl
  ) {
    autoAlbumAdds.push({ kind: "cover", url: updates.coverUrl.trim() });
  }

  if (Object.keys(updates).length > 0) {
    try {
      await db
        .update(profilesTable)
        .set(updates)
        .where(eq(profilesTable.id, req.userId!));
    } catch (err) {
      // Concurrent rename race: the unique lower(username) index wins.
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: "This username is already taken." });
        return;
      }
      throw err;
    }
  }

  for (const add of autoAlbumAdds) {
    const name = add.kind === "profile" ? "Profile pictures" : "Cover photos";
    let [album] = await db
      .select({ id: albumsTable.id })
      .from(albumsTable)
      .where(
        and(
          eq(albumsTable.ownerId, req.userId!),
          eq(albumsTable.kind, add.kind),
        ),
      );
    if (!album) {
      [album] = await db
        .insert(albumsTable)
        .values({ ownerId: req.userId!, name, kind: add.kind })
        .returning({ id: albumsTable.id });
    }
    if (album) {
      await db
        .insert(albumPhotosTable)
        .values({ albumId: album.id, url: add.url });
    }
  }

  const profile = await buildProfileDetail(req.userId!, req.userId);
  res.json(UpdateMyProfileResponse.parse(profile));
});

router.get(
  "/users/by-username/:username",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetUserByUsernameParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const uname = params.data.username.trim().toLowerCase();
    const [row] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(sql`lower(${profilesTable.username}) = ${uname}`);
    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const profile = await buildProfileDetail(row.id, req.userId);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(GetUserByUsernameResponse.parse(profile));
  },
);

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

// ---------------- Block / Restrict ----------------

async function setBlockKind(
  viewer: string,
  targetId: string,
  kind: "block" | "restrict",
  enabled: boolean,
): Promise<{ status: number; error?: string }> {
  if (viewer === targetId) {
    return { status: 400, error: "You can't do this to yourself" };
  }
  const [target] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.id, targetId));
  if (!target) return { status: 404, error: "User not found" };
  if (enabled) {
    await db
      .insert(userBlocksTable)
      .values({ userId: viewer, targetId, kind })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userBlocksTable)
      .where(
        and(
          eq(userBlocksTable.userId, viewer),
          eq(userBlocksTable.targetId, targetId),
          eq(userBlocksTable.kind, kind),
        ),
      );
  }
  return { status: 204 };
}

router.post("/users/:id/block", requireAuth, async (req, res): Promise<void> => {
  const params = BlockUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await setBlockKind(req.userId!, params.data.id, "block", true);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.sendStatus(204);
});

router.delete("/users/:id/block", requireAuth, async (req, res): Promise<void> => {
  const params = UnblockUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await setBlockKind(req.userId!, params.data.id, "block", false);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.sendStatus(204);
});

router.post("/users/:id/restrict", requireAuth, async (req, res): Promise<void> => {
  const params = RestrictUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await setBlockKind(req.userId!, params.data.id, "restrict", true);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.sendStatus(204);
});

router.delete("/users/:id/restrict", requireAuth, async (req, res): Promise<void> => {
  const params = UnrestrictUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await setBlockKind(req.userId!, params.data.id, "restrict", false);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.sendStatus(204);
});

async function listBlockKind(viewer: string, kind: "block" | "restrict") {
  const rows = await db
    .select({ targetId: userBlocksTable.targetId })
    .from(userBlocksTable)
    .where(
      and(eq(userBlocksTable.userId, viewer), eq(userBlocksTable.kind, kind)),
    )
    .orderBy(desc(userBlocksTable.createdAt));
  const ids = rows.map((r) => r.targetId);
  if (ids.length === 0) return [];
  const profiles = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, ids));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => toProfile(p));
}

router.get("/me/blocked", requireAuth, async (req, res): Promise<void> => {
  const built = await listBlockKind(req.userId!, "block");
  res.json(ListBlockedUsersResponse.parse(built));
});

router.get("/me/restricted", requireAuth, async (req, res): Promise<void> => {
  const built = await listBlockKind(req.userId!, "restrict");
  res.json(ListRestrictedUsersResponse.parse(built));
});

export default router;
