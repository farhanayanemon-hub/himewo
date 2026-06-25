import { Router, type IRouter } from "express";
import { db, profilesTable, storiesTable, storyViewsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { toProfile, buildStoryGroups, toStory } from "../lib/serialize";
import {
  ListStoriesResponse,
  CreateStoryBody,
  CreateStoryResponse,
  ViewStoryParams,
  ListStoryViewsParams,
  ListStoryViewsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
  const hours = parsed.data.expiresInHours ?? 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const [story] = await db
    .insert(storiesTable)
    .values({
      authorId: req.userId!,
      mediaUrl: parsed.data.mediaUrl,
      mediaType: parsed.data.mediaType,
      caption: parsed.data.caption ?? null,
      expiresAt,
    })
    .returning();
  const [author] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, req.userId!));
  res
    .status(201)
    .json(CreateStoryResponse.parse(toStory(story, toProfile(author), 0, false)));
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
    res.json(ListStoryViewsResponse.parse(profiles.map(toProfile)));
  },
);

export default router;
