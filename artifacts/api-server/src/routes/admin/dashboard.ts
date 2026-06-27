import { Router, type IRouter } from "express";
import {
  db,
  profilesTable,
  postsTable,
  commentsTable,
  reelsTable,
  storiesTable,
  groupsTable,
  pagesTable,
  postReactionsTable,
  reportsTable,
  verificationRequestsTable,
} from "@workspace/db";
import { and, count, eq, gt, gte, sql } from "drizzle-orm";
import { requirePermission } from "../../lib/admin-auth";

const router: IRouter = Router();

/* eslint-disable @typescript-eslint/no-explicit-any */
async function tableCount(table: any, where?: any): Promise<number> {
  const q = db.select({ value: count() }).from(table);
  const [row] = await (where ? q.where(where) : q);
  return row?.value ?? 0;
}

// High-level platform metrics for the dashboard.
router.get(
  "/metrics",
  requirePermission("dashboard.view"),
  async (_req, res): Promise<void> => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      verifiedUsers,
      suspendedUsers,
      bannedUsers,
      totalPosts,
      postsWeek,
      totalComments,
      totalReels,
      activeStories,
      totalReactions,
      totalGroups,
      totalPages,
      openReports,
      pendingVerifications,
    ] = await Promise.all([
      tableCount(profilesTable),
      tableCount(profilesTable, gte(profilesTable.createdAt, dayAgo)),
      tableCount(profilesTable, gte(profilesTable.createdAt, weekAgo)),
      tableCount(profilesTable, eq(profilesTable.isVerified, true)),
      tableCount(profilesTable, eq(profilesTable.isSuspended, true)),
      tableCount(profilesTable, eq(profilesTable.isBanned, true)),
      tableCount(postsTable),
      tableCount(postsTable, gte(postsTable.createdAt, weekAgo)),
      tableCount(commentsTable),
      tableCount(reelsTable),
      tableCount(storiesTable, gt(storiesTable.expiresAt, now)),
      tableCount(postReactionsTable),
      tableCount(groupsTable),
      tableCount(pagesTable),
      tableCount(reportsTable, eq(reportsTable.status, "open")),
      tableCount(
        verificationRequestsTable,
        eq(verificationRequestsTable.status, "pending"),
      ),
    ]);

    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
      },
      content: {
        posts: totalPosts,
        postsThisWeek: postsWeek,
        comments: totalComments,
        reels: totalReels,
        activeStories,
        reactions: totalReactions,
      },
      communities: { groups: totalGroups, pages: totalPages },
      moderation: { openReports, pendingVerifications },
    });
  },
);

// Daily signup / post counts for the last 14 days (growth charts).
router.get(
  "/metrics/growth",
  requirePermission("dashboard.view"),
  async (_req, res): Promise<void> => {
    const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    const userDay = sql<string>`to_char(${profilesTable.createdAt}, 'YYYY-MM-DD')`;
    const postDay = sql<string>`to_char(${postsTable.createdAt}, 'YYYY-MM-DD')`;

    const [signups, posts] = await Promise.all([
      db
        .select({ day: userDay, value: count() })
        .from(profilesTable)
        .where(gte(profilesTable.createdAt, since))
        .groupBy(userDay)
        .orderBy(userDay),
      db
        .select({ day: postDay, value: count() })
        .from(postsTable)
        .where(gte(postsTable.createdAt, since))
        .groupBy(postDay)
        .orderBy(postDay),
    ]);

    // Fill missing days with zeros so the chart is continuous.
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }
    const signupMap = new Map(signups.map((r) => [r.day, r.value]));
    const postMap = new Map(posts.map((r) => [r.day, r.value]));
    res.json(
      days.map((day) => ({
        day,
        signups: signupMap.get(day) ?? 0,
        posts: postMap.get(day) ?? 0,
      })),
    );
  },
);

export default router;
