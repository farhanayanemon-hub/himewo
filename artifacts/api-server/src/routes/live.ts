import { Router, type IRouter } from "express";
import { db, liveStreamsTable, profilesTable } from "@workspace/db";
import { and, eq, inArray, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildListProfiles } from "../lib/serialize";
import { endLiveRoom } from "../realtime";
import {
  ListLiveStreamsResponse,
  StartLiveStreamBody,
  StartLiveStreamResponse,
  GetLiveStreamParams,
  GetLiveStreamResponse,
  EndLiveStreamParams,
  EndLiveStreamResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type LiveStreamRow = typeof liveStreamsTable.$inferSelect;

async function buildStreams(rows: LiveStreamRow[]) {
  if (rows.length === 0) return [];
  const hostIds = [...new Set(rows.map((s) => s.hostId))];
  const hostRows = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, hostIds));
  const hosts = await buildListProfiles(hostRows);
  const hostById = new Map(hosts.map((h) => [h.id, h]));
  return rows
    .filter((s) => hostById.has(s.hostId))
    .map((s) => ({
      id: s.id,
      host: hostById.get(s.hostId)!,
      title: s.title,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      isLive: s.endedAt === null,
    }));
}

router.get("/live", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(liveStreamsTable)
    .where(isNull(liveStreamsTable.endedAt))
    .orderBy(desc(liveStreamsTable.startedAt))
    .limit(50);
  res.json(ListLiveStreamsResponse.parse(await buildStreams(rows)));
});

router.post("/live", requireAuth, async (req, res): Promise<void> => {
  const parsed = StartLiveStreamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const title = parsed.data.title.trim();
  if (!title) {
    res.status(400).json({ error: "Stream title is required" });
    return;
  }
  // A host can only run one live stream at a time: end any leftovers first.
  const stale = await db
    .select({ id: liveStreamsTable.id })
    .from(liveStreamsTable)
    .where(
      and(
        eq(liveStreamsTable.hostId, req.userId!),
        isNull(liveStreamsTable.endedAt),
      ),
    );
  if (stale.length > 0) {
    await db
      .update(liveStreamsTable)
      .set({ endedAt: new Date() })
      .where(
        inArray(
          liveStreamsTable.id,
          stale.map((s) => s.id),
        ),
      );
    for (const s of stale) endLiveRoom(s.id);
  }
  const [row] = await db
    .insert(liveStreamsTable)
    .values({ hostId: req.userId!, title })
    .returning();
  const [built] = await buildStreams([row]);
  res.status(201).json(StartLiveStreamResponse.parse(built));
});

router.get("/live/:streamId", requireAuth, async (req, res): Promise<void> => {
  const params = GetLiveStreamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(liveStreamsTable)
    .where(eq(liveStreamsTable.id, params.data.streamId));
  if (!row) {
    res.status(404).json({ error: "Live stream not found" });
    return;
  }
  const [built] = await buildStreams([row]);
  if (!built) {
    res.status(404).json({ error: "Live stream not found" });
    return;
  }
  res.json(GetLiveStreamResponse.parse(built));
});

router.post(
  "/live/:streamId/end",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = EndLiveStreamParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .select()
      .from(liveStreamsTable)
      .where(eq(liveStreamsTable.id, params.data.streamId));
    if (!row || row.hostId !== req.userId!) {
      res.status(404).json({ error: "Live stream not found" });
      return;
    }
    let updated = row;
    if (row.endedAt === null) {
      const [u] = await db
        .update(liveStreamsTable)
        .set({ endedAt: new Date() })
        .where(eq(liveStreamsTable.id, row.id))
        .returning();
      updated = u;
      endLiveRoom(row.id);
    }
    const [built] = await buildStreams([updated]);
    res.json(EndLiveStreamResponse.parse(built));
  },
);

export default router;
