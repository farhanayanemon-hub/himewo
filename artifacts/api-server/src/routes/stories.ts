import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  storiesTable,
  storyViewsTable,
  storyReactionsTable,
  messagesTable,
  conversationsTable,
  musicTracksTable,
  pagesTable,
  pageMembersTable,
} from "@workspace/db";
import { eq, inArray, or, and, ilike, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  toProfile,
  buildStoryGroups,
  toStory,
  buildStoryById,
  buildMessageById,
} from "../lib/serialize";
import { findOrCreateDirectConversation } from "../lib/conversations";
import { realtime } from "../realtime";
import { createNotification } from "../lib/notify";
import {
  ListStoriesResponse,
  CreateStoryBody,
  CreateStoryResponse,
  ViewStoryParams,
  ListStoryViewsParams,
  ListStoryViewsResponse,
  ListMusicTracksQueryParams,
  ListMusicTracksResponse,
  UploadMusicTrackBody,
  UploadMusicTrackResponse,
  SetStoryReactionParams,
  SetStoryReactionBody,
  SetStoryReactionResponse,
  RemoveStoryReactionParams,
  RemoveStoryReactionResponse,
  ReplyToStoryParams,
  ReplyToStoryBody,
  ReplyToStoryResponse,
} from "@workspace/api-zod";

// When a story or reel is posted with music, add that track to the shared
// library (deduped by URL) so posted music becomes discoverable by everyone.
export async function shareMusicToLibrary(
  url: string | null | undefined,
  title: string | null | undefined,
  artist: string | null | undefined,
): Promise<void> {
  if (!url || !title) return;
  if (!isHttpUrl(url)) return;
  const [existing] = await db
    .select({ id: musicTracksTable.id })
    .from(musicTracksTable)
    .where(and(eq(musicTracksTable.url, url), eq(musicTracksTable.source, "library")));
  if (existing) return;
  await db
    .insert(musicTracksTable)
    .values({
      title: title.slice(0, 200),
      artist: artist?.slice(0, 200) ?? null,
      url,
      source: "library",
    });
}

const router: IRouter = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

router.get("/stories", requireAuth, async (req, res): Promise<void> => {
  const groups = await buildStoryGroups(req.userId!);
  res.json(ListStoriesResponse.parse(groups));
});

router.post("/stories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const storyType = data.storyType ?? "media";
  if (storyType === "media") {
    if (!data.mediaUrl || !data.mediaType) {
      res
        .status(400)
        .json({ error: "mediaUrl and mediaType are required for media stories" });
      return;
    }
    if (!isHttpUrl(data.mediaUrl)) {
      res.status(400).json({ error: "mediaUrl must be an http(s) URL" });
      return;
    }
  } else {
    const text = (data.textContent ?? "").trim();
    if (!text) {
      res
        .status(400)
        .json({ error: "textContent is required for text stories" });
      return;
    }
    if (text.length > 700) {
      res.status(400).json({ error: "textContent is too long" });
      return;
    }
  }
  if (data.musicUrl && !isHttpUrl(data.musicUrl)) {
    res.status(400).json({ error: "musicUrl must be an http(s) URL" });
    return;
  }
  // When posting AS a page, the requester must own or have access to it.
  let pageRef: { id: number; name: string; avatarUrl: string | null } | null =
    null;
  if (data.pageId != null) {
    const [page] = await db
      .select({
        id: pagesTable.id,
        name: pagesTable.name,
        avatarUrl: pagesTable.avatarUrl,
        createdBy: pagesTable.createdBy,
      })
      .from(pagesTable)
      .where(eq(pagesTable.id, data.pageId));
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
            eq(pageMembersTable.pageId, data.pageId),
            eq(pageMembersTable.userId, req.userId!),
          ),
        );
      if (!member) {
        res.status(403).json({
          error: "Only people with Page access can post as this page.",
        });
        return;
      }
    }
    pageRef = { id: page.id, name: page.name, avatarUrl: page.avatarUrl };
  }
  const hours = data.expiresInHours ?? 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const [story] = await db
    .insert(storiesTable)
    .values({
      authorId: req.userId!,
      pageId: data.pageId ?? null,
      storyType,
      mediaUrl: storyType === "media" ? data.mediaUrl! : null,
      mediaType: storyType === "media" ? data.mediaType! : null,
      caption: data.caption ?? null,
      textContent: storyType === "text" ? (data.textContent ?? null) : null,
      backgroundStyle: storyType === "text" ? (data.backgroundStyle ?? null) : null,
      musicUrl: data.musicUrl ?? null,
      musicTitle: data.musicTitle ?? null,
      musicArtist: data.musicArtist ?? null,
      expiresAt,
    })
    .returning();

  // Posted music becomes shared in the library.
  await shareMusicToLibrary(data.musicUrl, data.musicTitle, data.musicArtist);

  // Mentions in the caption or text content: @[Name](user:<uuid>) tokens.
  const mentionSource = `${data.caption ?? ""}\n${data.textContent ?? ""}`;
  const mentionIds = [
    ...new Set(
      [...mentionSource.matchAll(/@\[[^\]]+\]\(user:([^)]+)\)/g)].map(
        (m) => m[1],
      ),
    ),
  ]
    .filter((mid) => mid !== req.userId && UUID_RE.test(mid))
    .slice(0, 10);
  if (mentionIds.length > 0) {
    const mentioned = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(inArray(profilesTable.id, mentionIds));
    for (const m of mentioned) {
      await createNotification({
        userId: m.id,
        actorId: req.userId!,
        type: "mention",
        entityType: "story",
        entityId: story.id,
      });
    }
  }

  const [author] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, req.userId!));
  res
    .status(201)
    .json(
      CreateStoryResponse.parse(
        toStory(story, toProfile(author), 0, false, pageRef),
      ),
    );
});

// ---------------- Music library ----------------

router.get("/music/tracks", requireAuth, async (req, res): Promise<void> => {
  const query = ListMusicTracksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const q = query.data.q?.trim();
  // Library tracks are visible to everyone; uploads only to their owner.
  const visibility = or(
    eq(musicTracksTable.source, "library"),
    eq(musicTracksTable.uploadedBy, req.userId!),
  );
  const rows = await db
    .select()
    .from(musicTracksTable)
    .where(
      q
        ? and(
            visibility,
            or(
              ilike(musicTracksTable.title, `%${q}%`),
              ilike(musicTracksTable.artist, `%${q}%`),
              ilike(musicTracksTable.mood, `%${q}%`),
            ),
          )
        : visibility,
    )
    .orderBy(desc(musicTracksTable.id))
    .limit(200);
  res.json(
    ListMusicTracksResponse.parse(
      rows.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        url: t.url,
        mood: t.mood,
        source: t.source,
      })),
    ),
  );
});

router.post("/music/tracks", requireAuth, async (req, res): Promise<void> => {
  const parsed = UploadMusicTrackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!isHttpUrl(parsed.data.url)) {
    res.status(400).json({ error: "url must be an http(s) URL" });
    return;
  }
  const [track] = await db
    .insert(musicTracksTable)
    .values({
      title: parsed.data.title.slice(0, 200),
      artist: parsed.data.artist?.slice(0, 200) ?? null,
      url: parsed.data.url,
      source: "upload",
      uploadedBy: req.userId!,
    })
    .returning();
  res.status(201).json(
    UploadMusicTrackResponse.parse({
      id: track.id,
      title: track.title,
      artist: track.artist,
      url: track.url,
      mood: track.mood,
      source: track.source,
    }),
  );
});

router.post("/stories/:id/view", requireAuth, async (req, res): Promise<void> => {
  const params = ViewStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .insert(storyViewsTable)
    .values({ storyId: params.data.id, viewerId: req.userId! })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.get(
  "/stories/:id/views",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListStoryViewsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const views = await db
      .select()
      .from(storyViewsTable)
      .where(eq(storyViewsTable.storyId, params.data.id));
    const viewerIds = views.map((v) => v.viewerId);
    if (viewerIds.length === 0) {
      res.json(ListStoryViewsResponse.parse([]));
      return;
    }
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(inArray(profilesTable.id, viewerIds));
    res.json(ListStoryViewsResponse.parse(profiles.map((p) => toProfile(p))));
  },
);

router.put(
  "/stories/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SetStoryReactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = SetStoryReactionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [story] = await db
      .select()
      .from(storiesTable)
      .where(eq(storiesTable.id, params.data.id));
    if (!story || new Date(story.expiresAt).getTime() < Date.now()) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    await db
      .insert(storyReactionsTable)
      .values({
        storyId: params.data.id,
        userId: req.userId!,
        type: body.data.type,
      })
      .onConflictDoUpdate({
        target: [storyReactionsTable.storyId, storyReactionsTable.userId],
        set: { type: body.data.type },
      });
    if (story.authorId !== req.userId) {
      await createNotification({
        userId: story.authorId,
        actorId: req.userId!,
        type: "reaction",
        entityType: "story",
        entityId: params.data.id,
      });
    }
    const built = await buildStoryById(params.data.id, req.userId!);
    res.json(SetStoryReactionResponse.parse(built));
  },
);

router.delete(
  "/stories/:id/reaction",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveStoryReactionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(storyReactionsTable)
      .where(
        and(
          eq(storyReactionsTable.storyId, params.data.id),
          eq(storyReactionsTable.userId, req.userId!),
        ),
      );
    const built = await buildStoryById(params.data.id, req.userId!);
    if (!built) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    res.json(RemoveStoryReactionResponse.parse(built));
  },
);

router.post(
  "/stories/:id/reply",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ReplyToStoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = ReplyToStoryBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const text = body.data.text.trim();
    if (!text) {
      res.status(400).json({ error: "Reply text is required" });
      return;
    }
    const [story] = await db
      .select()
      .from(storiesTable)
      .where(eq(storiesTable.id, params.data.id));
    if (!story || new Date(story.expiresAt).getTime() < Date.now()) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    if (story.authorId === req.userId) {
      res.status(400).json({ error: "You can't reply to your own story" });
      return;
    }
    const conversationId = await findOrCreateDirectConversation(
      req.userId!,
      story.authorId,
    );
    const [message] = await db
      .insert(messagesTable)
      .values({
        conversationId,
        senderId: req.userId!,
        content: text,
        type: "text",
        storyId: params.data.id,
      })
      .returning();
    await db
      .update(conversationsTable)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));
    const built = await buildMessageById(message.id, req.userId!);
    await realtime.toConversation(conversationId, {
      type: "message",
      conversationId,
      message: built,
    });
    await createNotification({
      userId: story.authorId,
      actorId: req.userId!,
      type: "message",
      entityType: "conversation",
      entityId: conversationId,
    });
    res
      .status(201)
      .json(ReplyToStoryResponse.parse({ conversationId, message: built }));
  },
);

export default router;
