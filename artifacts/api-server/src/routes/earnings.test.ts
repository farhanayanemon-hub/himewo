import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  db,
  pool,
  profilesTable,
  pointConfigTable,
  pointTransactionsTable,
  withdrawalAccountsTable,
  withdrawalRequestsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import app from "../app";
import { getBalancePoints } from "../lib/earnings";

// Behavioral coverage for the marketing points -> USD earning system, the part
// of the app that pays out real money. These lock in the documented invariants
// so a refactor that breaks an anti-farm guard, the daily cap, the posts-only
// earning scope, or the money-integrity rules fails the api-server-test step
// loudly instead of shipping. See memory `himewo-earnings-points.md`.

// Baseline point config used for every test unless a block overrides it. The
// point_config table is a single shared row (id = 1); we set it to a known
// state up front and restore the feature to "off" in afterAll.
const BASE_CONFIG = {
  enabled: true,
  pointsPerPost: 10,
  pointsPerLike: 1,
  pointsPerComment: 2,
  pointsPerShare: 3,
  pointsPerDollar: 1000,
  minWithdrawDollars: 5,
  dailyPointCap: 0,
};

const author = randomUUID();
const liker = randomUUID();
const commenter = randomUUID();
const sharer = randomUUID();
const capper = randomUUID();
const withdrawer = randomUUID();
const withdrawer2 = randomUUID();
const admin = randomUUID();

const everyUser = [
  author,
  liker,
  commenter,
  sharer,
  capper,
  withdrawer,
  withdrawer2,
  admin,
];

let postId: number;
let server: Server;
let baseUrl: string;

async function setConfig(patch: Partial<typeof BASE_CONFIG>): Promise<void> {
  await db.update(pointConfigTable).set(patch).where(eq(pointConfigTable.id, 1));
}

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

beforeAll(async () => {
  await db.insert(profilesTable).values(
    everyUser.map((id) => ({
      id,
      username: `earn-${id.slice(0, 8)}`,
      displayName: "Earnings Test User",
    })),
  );

  // Ensure the single config row exists, then force it to our baseline.
  await db
    .insert(pointConfigTable)
    .values({ id: 1, ...BASE_CONFIG })
    .onConflictDoUpdate({ target: pointConfigTable.id, set: BASE_CONFIG });

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  // Leave the feature off (its default) so we don't affect other test files /
  // environments that share this row.
  await setConfig({ enabled: false, dailyPointCap: 0 });
  // Deleting the profiles cascades to posts, ledger rows, withdrawal accounts
  // and requests via onDelete: cascade.
  await db.delete(profilesTable).where(inArray(profilesTable.id, everyUser));
  await pool.end();
});

describe("earning scope is posts-only", () => {
  it("rewards the author for creating a post", async () => {
    const res = await api("/posts", author, {
      method: "POST",
      body: JSON.stringify({ content: "earn post", privacy: "public" }),
    });
    expect(res.status).toBe(201);
    postId = res.body.id;
    expect(await getBalancePoints(author)).toBe(BASE_CONFIG.pointsPerPost);
  });

  it("never rewards reacting to your own post", async () => {
    const res = await api(`/posts/${postId}/reaction`, author, {
      method: "PUT",
      body: JSON.stringify({ type: "like" }),
    });
    expect(res.status).toBe(200);
    // Still just the post-creation award; liking your own content earns nothing.
    expect(await getBalancePoints(author)).toBe(BASE_CONFIG.pointsPerPost);
  });

  it("does not reward liking a comment (engagement is posts-only)", async () => {
    const c = await api(`/posts/${postId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content: "a genuine first comment" }),
    });
    expect(c.status).toBe(201);
    const commentId = c.body.id;
    // Commenting on someone else's post earns.
    expect(await getBalancePoints(commenter)).toBe(BASE_CONFIG.pointsPerComment);

    const before = await getBalancePoints(liker);
    const r = await api(`/comments/${commentId}/reaction`, liker, {
      method: "PUT",
      body: JSON.stringify({ type: "like" }),
    });
    expect(r.status).toBe(200);
    // Liking a comment is not a rewarded action.
    expect(await getBalancePoints(liker)).toBe(before);
  });
});

describe("anti-farm guards", () => {
  it("rewards liking another user's post only once (idempotent per post)", async () => {
    const like = () =>
      api(`/posts/${postId}/reaction`, liker, {
        method: "PUT",
        body: JSON.stringify({ type: "like" }),
      });
    const unlike = () =>
      api(`/posts/${postId}/reaction`, liker, { method: "DELETE" });

    const before = await getBalancePoints(liker);
    expect((await like()).status).toBe(200);
    expect((await unlike()).status).toBe(200);
    expect((await like()).status).toBe(200);
    // like -> unlike -> like awards exactly one like, keyed by the post.
    expect(await getBalancePoints(liker)).toBe(before + BASE_CONFIG.pointsPerLike);
  });

  it("rewards distinct comments but blocks duplicate-text farming", async () => {
    const start = await getBalancePoints(commenter);

    // Re-posting the SAME text as an earlier comment earns nothing.
    const dup = await api(`/posts/${postId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content: "a genuine first comment" }),
    });
    expect(dup.status).toBe(201);
    expect(await getBalancePoints(commenter)).toBe(start);

    // A genuinely new comment earns again.
    const fresh = await api(`/posts/${postId}/comments`, commenter, {
      method: "POST",
      body: JSON.stringify({ content: "a different, second comment" }),
    });
    expect(fresh.status).toBe(201);
    expect(await getBalancePoints(commenter)).toBe(
      start + BASE_CONFIG.pointsPerComment,
    );
  });

  it("rewards each share (keyed per share row, not once per post)", async () => {
    const before = await getBalancePoints(sharer);
    const s1 = await api(`/posts/${postId}/share`, sharer, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const s2 = await api(`/posts/${postId}/share`, sharer, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(s1.status).toBe(201);
    expect(s2.status).toBe(201);
    // Two shares of the same post earn twice, unlike likes.
    expect(await getBalancePoints(sharer)).toBe(
      before + BASE_CONFIG.pointsPerShare * 2,
    );
  });
});

describe("daily cap", () => {
  beforeAll(async () => {
    // cap of 15 with 10 points/post means the 2nd post must be clamped to 5.
    await setConfig({ dailyPointCap: 15 });
  });
  afterAll(async () => {
    await setConfig({ dailyPointCap: 0 });
  });

  it("clamps the final award to the remaining allowance and then stops", async () => {
    const post = (content: string) =>
      api("/posts", capper, {
        method: "POST",
        body: JSON.stringify({ content, privacy: "public" }),
      });

    expect((await post("cap 1")).status).toBe(201);
    expect(await getBalancePoints(capper)).toBe(10); // full award

    expect((await post("cap 2")).status).toBe(201);
    // Clamped: only 5 of the 10 remain under the cap, so total is exactly 15.
    expect(await getBalancePoints(capper)).toBe(15);

    expect((await post("cap 3")).status).toBe(201);
    // Cap is exhausted; no further points are awarded (and never overshoots).
    expect(await getBalancePoints(capper)).toBe(15);
  });
});

describe("withdrawal money integrity", () => {
  let accountId: number;

  beforeAll(async () => {
    // Seed a known balance: 10000 points == $10 at 1000 points/$.
    await db.insert(pointTransactionsTable).values({
      userId: withdrawer,
      action: "admin_adjust",
      points: 10000,
      note: "seed balance",
    });
    const [account] = await db
      .insert(withdrawalAccountsTable)
      .values({
        userId: withdrawer,
        method: "paypal",
        details: { email: "earn@example.com" },
      })
      .returning();
    accountId = account.id;
  });

  it("rejects an amount below the configured minimum", async () => {
    const res = await api("/earnings/withdrawals", withdrawer, {
      method: "POST",
      body: JSON.stringify({ amountDollars: 3, accountId }),
    });
    expect(res.status).toBe(400);
    // No ledger movement: balance untouched.
    expect(await getBalancePoints(withdrawer)).toBe(10000);
  });

  it("rejects an amount that exceeds the balance", async () => {
    const res = await api("/earnings/withdrawals", withdrawer, {
      method: "POST",
      body: JSON.stringify({ amountDollars: 20, accountId }),
    });
    expect(res.status).toBe(400);
    expect(await getBalancePoints(withdrawer)).toBe(10000);
  });

  it("deducts exactly amount*rate points and never lets balance diverge from USD", async () => {
    const res = await api("/earnings/withdrawals", withdrawer, {
      method: "POST",
      body: JSON.stringify({ amountDollars: 10, accountId }),
    });
    expect(res.status).toBe(201);
    // pointsSpent must equal dollars * pointsPerDollar — the money-integrity link.
    expect(res.body.pointsSpent).toBe(10 * BASE_CONFIG.pointsPerDollar);
    expect(res.body.status).toBe("pending");
    expect(await getBalancePoints(withdrawer)).toBe(0);

    // The user-facing summary must report the same zeroed balance in USD.
    const summary = await api("/earnings/summary", withdrawer);
    expect(summary.status).toBe(200);
    expect(summary.body.balancePoints).toBe(0);
    expect(summary.body.balanceDollars).toBe(0);
    // The pending request is reflected as owed.
    expect(summary.body.pendingWithdrawalDollars).toBe(10);
  });

  it("refunds the spent points when a withdrawal is rejected, and only once", async () => {
    // Grab the pending request id for this user.
    const mine = await api("/earnings/withdrawals", withdrawer);
    const pending = mine.body.find((w: any) => w.status === "pending");
    expect(pending).toBeTruthy();

    const reject = await api(
      `/admin/earnings/withdrawals/${pending.id}/process`,
      admin,
      {
        method: "POST",
        body: JSON.stringify({ status: "rejected", adminNote: "no" }),
      },
    );
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe("rejected");
    // Points are returned to the user.
    expect(await getBalancePoints(withdrawer)).toBe(10000);

    // rejected is terminal: re-processing must fail and not double-refund.
    const again = await api(
      `/admin/earnings/withdrawals/${pending.id}/process`,
      admin,
      {
        method: "POST",
        body: JSON.stringify({ status: "paid" }),
      },
    );
    expect(again.status).toBe(400);
    expect(await getBalancePoints(withdrawer)).toBe(10000);
  });

  it("approve -> paid moves the request without ever touching the ledger", async () => {
    await db.insert(pointTransactionsTable).values({
      userId: withdrawer2,
      action: "admin_adjust",
      points: 10000,
      note: "seed balance",
    });
    const [account] = await db
      .insert(withdrawalAccountsTable)
      .values({
        userId: withdrawer2,
        method: "wise",
        details: { email: "earn2@example.com" },
      })
      .returning();

    const create = await api("/earnings/withdrawals", withdrawer2, {
      method: "POST",
      body: JSON.stringify({ amountDollars: 5, accountId: account.id }),
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const afterCreate = await getBalancePoints(withdrawer2);
    expect(afterCreate).toBe(5000); // 10000 - 5*1000

    const approve = await api(
      `/admin/earnings/withdrawals/${id}/process`,
      admin,
      { method: "POST", body: JSON.stringify({ status: "approved" }) },
    );
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe("approved");
    expect(await getBalancePoints(withdrawer2)).toBe(5000); // unchanged

    const paid = await api(`/admin/earnings/withdrawals/${id}/process`, admin, {
      method: "POST",
      body: JSON.stringify({ status: "paid" }),
    });
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe("paid");
    // Approve/paid never refund or re-deduct; the ledger is unchanged.
    expect(await getBalancePoints(withdrawer2)).toBe(5000);
  });
});
