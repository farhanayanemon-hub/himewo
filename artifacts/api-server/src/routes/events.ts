import { Router, type IRouter } from "express";
import { db, eventsTable, eventRsvpsTable, profilesTable } from "@workspace/db";
import { and, eq, inArray, sql, desc, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildListProfiles } from "../lib/serialize";
import {
  ListEventsResponse,
  CreateEventBody,
  CreateEventResponse,
  GetEventParams,
  GetEventResponse,
  DeleteEventParams,
  RsvpEventParams,
  RsvpEventBody,
  RsvpEventResponse,
  ClearEventRsvpParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type EventRow = typeof eventsTable.$inferSelect;

async function buildEvents(rows: EventRow[], viewerId: string) {
  if (rows.length === 0) return [];
  const eventIds = rows.map((e) => e.id);
  const hostIds = [...new Set(rows.map((e) => e.hostId))];

  const [hostRows, countRows, viewerRows] = await Promise.all([
    db.select().from(profilesTable).where(inArray(profilesTable.id, hostIds)),
    db
      .select({
        eventId: eventRsvpsTable.eventId,
        status: eventRsvpsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(eventRsvpsTable)
      .where(inArray(eventRsvpsTable.eventId, eventIds))
      .groupBy(eventRsvpsTable.eventId, eventRsvpsTable.status),
    db
      .select({
        eventId: eventRsvpsTable.eventId,
        status: eventRsvpsTable.status,
      })
      .from(eventRsvpsTable)
      .where(
        and(
          inArray(eventRsvpsTable.eventId, eventIds),
          eq(eventRsvpsTable.userId, viewerId),
        ),
      ),
  ]);

  const hosts = await buildListProfiles(hostRows);
  const hostById = new Map(hosts.map((h) => [h.id, h]));
  const going = new Map<number, number>();
  const interested = new Map<number, number>();
  for (const c of countRows) {
    if (c.status === "going") going.set(c.eventId, c.count);
    if (c.status === "interested") interested.set(c.eventId, c.count);
  }
  const viewerRsvpByEvent = new Map(viewerRows.map((v) => [v.eventId, v.status]));

  return rows
    .filter((e) => hostById.has(e.hostId))
    .map((e) => ({
      id: e.id,
      host: hostById.get(e.hostId)!,
      title: e.title,
      description: e.description,
      location: e.location,
      coverUrl: e.coverUrl,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      goingCount: going.get(e.id) ?? 0,
      interestedCount: interested.get(e.id) ?? 0,
      viewerRsvp: viewerRsvpByEvent.get(e.id) ?? null,
      createdAt: e.createdAt.toISOString(),
    }));
}

router.get("/events", requireAuth, async (req, res): Promise<void> => {
  // Upcoming first (soonest at top), then past events (most recent first).
  const rows = await db
    .select()
    .from(eventsTable)
    .orderBy(
      sql`CASE WHEN ${eventsTable.startsAt} >= now() THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${eventsTable.startsAt} >= now() THEN ${eventsTable.startsAt} END ASC`,
      desc(eventsTable.startsAt),
    )
    .limit(100);
  res.json(ListEventsResponse.parse(await buildEvents(rows, req.userId!)));
});

router.post("/events", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const title = parsed.data.title.trim();
  if (!title) {
    res.status(400).json({ error: "Event title is required" });
    return;
  }
  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    res.status(400).json({ error: "Invalid start time" });
    return;
  }
  let endsAt: Date | null = null;
  if (parsed.data.endsAt) {
    endsAt = new Date(parsed.data.endsAt);
    if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      res.status(400).json({ error: "End time must be after start time" });
      return;
    }
  }
  // http(s)-only guard for user-supplied cover URL (stored XSS).
  const coverUrl =
    parsed.data.coverUrl && /^https?:\/\//i.test(parsed.data.coverUrl.trim())
      ? parsed.data.coverUrl.trim()
      : null;
  const [row] = await db
    .insert(eventsTable)
    .values({
      hostId: req.userId!,
      title,
      description: parsed.data.description?.trim() || null,
      location: parsed.data.location?.trim() || null,
      coverUrl,
      startsAt,
      endsAt,
    })
    .returning();
  const [built] = await buildEvents([row], req.userId!);
  res.status(201).json(CreateEventResponse.parse(built));
});

router.get(
  "/events/:eventId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetEventParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const rsvps = await db
      .select({
        status: eventRsvpsTable.status,
        profile: profilesTable,
      })
      .from(eventRsvpsTable)
      .innerJoin(profilesTable, eq(profilesTable.id, eventRsvpsTable.userId))
      .where(eq(eventRsvpsTable.eventId, event.id))
      .orderBy(asc(eventRsvpsTable.createdAt));
    const goingProfiles = await buildListProfiles(
      rsvps.filter((r) => r.status === "going").map((r) => r.profile),
    );
    const interestedProfiles = await buildListProfiles(
      rsvps.filter((r) => r.status === "interested").map((r) => r.profile),
    );
    const [built] = await buildEvents([event], req.userId!);
    res.json(
      GetEventResponse.parse({
        event: built,
        going: goingProfiles,
        interested: interestedProfiles,
      }),
    );
  },
);

router.delete(
  "/events/:eventId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteEventParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, params.data.eventId));
    if (!event || event.hostId !== req.userId!) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    await db.delete(eventsTable).where(eq(eventsTable.id, event.id));
    res.sendStatus(204);
  },
);

router.post(
  "/events/:eventId/rsvp",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RsvpEventParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = RsvpEventBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, params.data.eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    await db
      .insert(eventRsvpsTable)
      .values({
        eventId: event.id,
        userId: req.userId!,
        status: body.data.status,
      })
      .onConflictDoUpdate({
        target: [eventRsvpsTable.eventId, eventRsvpsTable.userId],
        set: { status: body.data.status },
      });
    const [built] = await buildEvents([event], req.userId!);
    res.json(RsvpEventResponse.parse(built));
  },
);

router.delete(
  "/events/:eventId/rsvp",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ClearEventRsvpParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await db
      .delete(eventRsvpsTable)
      .where(
        and(
          eq(eventRsvpsTable.eventId, params.data.eventId),
          eq(eventRsvpsTable.userId, req.userId!),
        ),
      );
    res.sendStatus(204);
  },
);

export default router;
