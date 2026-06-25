import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  postsTable,
  friendshipsTable,
} from "@workspace/db";
import {
  and,
  or,
  eq,
  ne,
  lt,
  desc,
  ilike,
  notInArray,
  isNull,
} from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { toProfile, buildProfileDetail, buildPosts } from "../lib/serialize";
import { areFriends } from "../lib/authz";
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
  res.json(SearchUsersResponse.parse(rows.map(toProfile)));
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
    const exclude = [viewer, ...friendIds];
    const rows = await db
      .select()
      .from(profilesTable)
      .where(notInArray(profilesTable.id, exclude))
      .limit(10);
    res.json(GetFriendSuggestionsResponse.parse(rows.map(toProfile)));
  },
);

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .update(profilesTable)
    .set(parsed.data)
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

export default router;
