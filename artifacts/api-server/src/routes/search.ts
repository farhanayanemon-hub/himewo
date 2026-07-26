import { Router, type IRouter } from "express";
import { db, profilesTable, pagesTable, groupsTable } from "@workspace/db";
import { ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { buildListProfiles, buildPage, buildGroup } from "../lib/serialize";
import { SearchAllQueryParams, SearchAllResponse } from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Unified FB-style search: People / Hubs (pages) / Circles (groups) in one
 * call so clients can render sectioned results under the search box.
 */
router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const q = SearchAllQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const term = (q.data.q ?? "").trim();
  const limit = Math.min(q.data.limit ?? 10, 25);
  if (!term) {
    res.json(SearchAllResponse.parse({ people: [], pages: [], groups: [] }));
    return;
  }
  const pattern = `%${term}%`;
  const [peopleRows, pageRows, groupRows] = await Promise.all([
    db
      .select()
      .from(profilesTable)
      .where(
        or(
          ilike(profilesTable.username, pattern),
          ilike(profilesTable.displayName, pattern),
        ),
      )
      .limit(limit),
    db.select().from(pagesTable).where(ilike(pagesTable.name, pattern)).limit(limit),
    db.select().from(groupsTable).where(ilike(groupsTable.name, pattern)).limit(limit),
  ]);
  const [people, pages, groupsBuilt] = await Promise.all([
    buildListProfiles(peopleRows),
    Promise.all(pageRows.map((p) => buildPage(p, req.userId))),
    Promise.all(groupRows.map((g) => buildGroup(g, req.userId))),
  ]);
  // Hidden circles are only discoverable by their active members (same rule
  // as the groups listing).
  const groups = groupsBuilt.filter(
    (g) => g.privacy !== "hidden" || g.viewerIsMember,
  );
  res.json(SearchAllResponse.parse({ people, pages, groups }));
});

export default router;
