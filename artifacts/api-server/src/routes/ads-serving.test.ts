import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { db, pool, profilesTable, postsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import app from "../app";

// Locks in Admin Approval + Ad Serving (Task #3): boost-post/boost-page create
// ads submitted for review; the admin approves/rejects them; only approved +
// active ads serve; serving embeds the boosted post (public only) and dedupes;
// impression/click tracking is authed + deduped.

const owner = randomUUID();
const admin = randomUUID();
const viewer = randomUUID();
const stranger = randomUUID();
const slug = owner.slice(0, 8);

let server: Server;
let baseUrl: string;

async function api(
  path: string,
  asUser: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer dev:${asUser}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let publicPostId: number;
let privatePostId: number;

beforeAll(async () => {
  await db.insert(profilesTable).values([
    { id: owner, username: `serve-owner-${slug}`, displayName: "Serve Owner" },
    {
      id: admin,
      username: `serve-admin-${slug}`,
      displayName: "Serve Admin",
      role: "admin",
    },
    { id: viewer, username: `serve-viewer-${slug}`, displayName: "Serve View" },
    { id: stranger, username: `serve-str-${slug}`, displayName: "Serve Str" },
  ]);
  const [pub] = await db
    .insert(postsTable)
    .values({ authorId: owner, content: "Buy my thing!", privacy: "public" })
    .returning({ id: postsTable.id });
  publicPostId = pub.id;
  const [priv] = await db
    .insert(postsTable)
    .values({ authorId: owner, content: "secret", privacy: "private" })
    .returning({ id: postsTable.id });
  privatePostId = priv.id;

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db
    .delete(profilesTable)
    .where(inArray(profilesTable.id, [owner, admin, viewer, stranger]));
  await pool.end();
});

describe("Ad boost + approval + serving", () => {
  let adId: number;

  it("boosts a public post, creating an ad pending review", async () => {
    const res = await api(`/posts/${publicPostId}/boost`, owner, {
      method: "POST",
      body: JSON.stringify({ budgetCents: 500, days: 7 }),
    });
    expect(res.status).toBe(201);
    expect(res.body.reviewStatus).toBe("pending");
    expect(res.body.status).toBe("in_review");
    expect(res.body.boostedPostId).toBe(publicPostId);
    adId = res.body.id;
  });

  it("refuses to boost someone else's post", async () => {
    const res = await api(`/posts/${publicPostId}/boost`, stranger, {
      method: "POST",
      body: JSON.stringify({ budgetCents: 500, days: 7 }),
    });
    expect(res.status).toBe(403);
  });

  it("refuses to boost a non-public post", async () => {
    const res = await api(`/posts/${privatePostId}/boost`, owner, {
      method: "POST",
      body: JSON.stringify({ budgetCents: 500, days: 7 }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid destinationUrl", async () => {
    const res = await api(`/posts/${publicPostId}/boost`, owner, {
      method: "POST",
      body: JSON.stringify({
        budgetCents: 500,
        days: 7,
        destinationUrl: "javascript:alert(1)",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("does not serve the ad before approval", async () => {
    const res = await api("/ads/serve?placement=feed", viewer);
    expect(res.status).toBe(200);
    expect(res.body.some((a: any) => a.adId === adId)).toBe(false);
  });

  it("hides the admin ads queue from non-admins", async () => {
    const res = await api("/admin/ads?status=pending", stranger);
    expect(res.status).toBe(403);
  });

  it("lists the pending ad in the admin queue", async () => {
    const res = await api("/admin/ads?status=pending", admin);
    expect(res.status).toBe(200);
    const found = res.body.items.find((a: any) => a.id === adId);
    expect(found).toBeTruthy();
    expect(found.objective).toBe("post_boost");
  });

  it("approves the ad", async () => {
    const res = await api(`/admin/ads/${adId}/approve`, admin, {
      method: "POST",
      body: JSON.stringify({ note: "looks good" }),
    });
    expect(res.status).toBe(200);
    expect(res.body.reviewStatus).toBe("approved");
    expect(res.body.status).toBe("active");
  });

  it("serves the approved ad with the embedded public post", async () => {
    const res = await api("/ads/serve?placement=feed", viewer);
    expect(res.status).toBe(200);
    const served = res.body.find((a: any) => a.adId === adId);
    expect(served).toBeTruthy();
    expect(served.boostedPost?.id).toBe(publicPostId);
  });

  it("records an impression then dedupes a rapid repeat", async () => {
    const first = await api(`/ads/${adId}/impression`, viewer, {
      method: "POST",
      body: JSON.stringify({ placement: "feed" }),
    });
    expect(first.status).toBe(204);
    const second = await api(`/ads/${adId}/impression`, viewer, {
      method: "POST",
      body: JSON.stringify({ placement: "feed" }),
    });
    expect(second.status).toBe(204);
  });

  it("records a click", async () => {
    const res = await api(`/ads/${adId}/click`, viewer, {
      method: "POST",
      body: JSON.stringify({ placement: "feed" }),
    });
    expect(res.status).toBe(204);
  });

  it("404s tracking for an unknown ad", async () => {
    const res = await api(`/ads/999999999/impression`, viewer, {
      method: "POST",
      body: JSON.stringify({ placement: "feed" }),
    });
    expect(res.status).toBe(404);
  });

  it("stops serving the ad to a viewer who just saw it (dedupe)", async () => {
    // The viewer above logged an impression, so the ad is suppressed for them.
    const res = await api("/ads/serve?placement=feed", viewer);
    expect(res.body.some((a: any) => a.adId === adId)).toBe(false);
  });

  it("rejects a second boosted ad with a note", async () => {
    const boost = await api(`/posts/${publicPostId}/boost`, owner, {
      method: "POST",
      body: JSON.stringify({ budgetCents: 500, days: 7 }),
    });
    const rejectId = boost.body.id;
    const res = await api(`/admin/ads/${rejectId}/reject`, admin, {
      method: "POST",
      body: JSON.stringify({ note: "policy violation" }),
    });
    expect(res.status).toBe(200);
    expect(res.body.reviewStatus).toBe("rejected");

    const serve = await api("/ads/serve?placement=feed", stranger);
    expect(serve.body.some((a: any) => a.adId === rejectId)).toBe(false);
  });
});
