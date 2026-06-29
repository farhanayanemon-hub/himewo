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
import { desc, eq, inArray } from "drizzle-orm";
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
const racer = randomUUID();
const resetter = randomUUID();
const capRacer = randomUUID();
const adjustee = randomUUID();
const resetee = randomUUID();
const dupResetee = randomUUID();
const sneakEarner = randomUUID();
const admin = randomUUID();

const everyUser = [
  author,
  liker,
  commenter,
  sharer,
  capper,
  withdrawer,
  withdrawer2,
  racer,
  resetter,
  capRacer,
  adjustee,
  resetee,
  dupResetee,
  sneakEarner,
  admin,
];

let postId: number;
let server: Server;
let baseUrl: string;

async function setConfig(patch: Partial<typeof BASE_CONFIG>): Promise<void> {
  await db.update(pointConfigTable).set(patch).where(eq(pointConfigTable.id, 1));
}

async function ledgerCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: pointTransactionsTable.id })
    .from(pointTransactionsTable)
    .where(eq(pointTransactionsTable.userId, userId));
  return rows.length;
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

describe("concurrency: no double-spend under simultaneous requests", () => {
  // These exercise the per-user advisory locks + in-txn balance recheck that the
  // sequential tests can't reach. Each fires several identical requests at once
  // (Promise.all) and asserts the ledger is never overdrawn and only the
  // affordable number of operations win. Dropping the advisory lock (or the
  // in-txn balance recheck in the withdrawal create path) lets two requests both
  // pass the same check and overspend, failing these.

  it("lets only one of many simultaneous withdrawals win when the balance covers exactly one", async () => {
    // Seed exactly one $5 withdrawal worth of balance (5 * 1000 points).
    await db.insert(pointTransactionsTable).values({
      userId: racer,
      action: "admin_adjust",
      points: 5000,
      note: "seed balance",
    });
    const [account] = await db
      .insert(withdrawalAccountsTable)
      .values({
        userId: racer,
        method: "paypal",
        details: { email: "race@example.com" },
      })
      .returning();

    const N = 6;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        api("/earnings/withdrawals", racer, {
          method: "POST",
          body: JSON.stringify({ amountDollars: 5, accountId: account.id }),
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 201);
    const refused = results.filter((r) => r.status === 400);
    // The balance covers exactly one payout: only one request may win, the rest
    // must be refused as insufficient.
    expect(ok.length).toBe(1);
    expect(refused.length).toBe(N - 1);

    // The ledger is fully drained but never overdrawn — two requests can't each
    // deduct against the same starting balance.
    const balance = await getBalancePoints(racer);
    expect(balance).toBe(0);
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it("never drives the ledger negative when admin resets fire simultaneously", async () => {
    await db.insert(pointTransactionsTable).values({
      userId: resetter,
      action: "admin_adjust",
      points: 8000,
      note: "seed balance",
    });

    const N = 6;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        api(`/admin/earnings/users/${resetter}/reset`, admin, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);

    // Reset is absolute-to-zero under the same advisory lock awardPoints uses.
    // Without it, each concurrent reset reads the same 8000 and inserts -8000,
    // driving the ledger negative.
    const balance = await getBalancePoints(resetter);
    expect(balance).toBe(0);
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it("offsets the balance exactly once when two resets fire at once (no duplicated zeroing entry)", async () => {
    await db.insert(pointTransactionsTable).values({
      userId: dupResetee,
      action: "admin_adjust",
      points: 5000,
      note: "seed balance",
    });
    const before = await ledgerCount(dupResetee);

    const results = await Promise.all(
      Array.from({ length: 2 }, () =>
        api(`/admin/earnings/users/${dupResetee}/reset`, admin, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      ),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);

    // Under the shared advisory lock the loser of the race acquires the lock
    // only after the winner commits, reads the already-zeroed balance, and
    // writes nothing: exactly ONE offsetting entry. Drop/diverge the lock and
    // both resets read 5000 and each insert -5000 — a duplicated zeroing entry
    // that drives the ledger to -5000.
    expect(await ledgerCount(dupResetee)).toBe(before + 1);
    const balance = await getBalancePoints(dupResetee);
    expect(balance).toBe(0);
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it("serializes BOTH a reset and a concurrent earn on the same per-user advisory lock (catches a diverged/dropped lock key)", async () => {
    // This is the core invariant of the task: a concurrent earn must not be
    // able to slip between a reset's balance read and its offsetting write. A
    // balance-only assertion can't prove it — a post-reset earn legitimately
    // leaves a non-zero balance, so the buggy interleaving is indistinguishable
    // by final balance alone. Instead we force the interleaving directly: we
    // hold the EXACT advisory-lock key both code paths use and prove neither
    // can touch the ledger until we let go.
    await db.insert(pointTransactionsTable).values({
      userId: sneakEarner,
      action: "admin_adjust",
      points: 5000,
      note: "seed balance",
    });

    // Hold hashtext(userId)::bigint — the literal key in both the reset handler
    // and awardPoints — on a dedicated connection inside an open transaction.
    // Any code path that takes the same key now blocks until we ROLLBACK.
    const holder = await pool.connect();
    let reset!: Promise<{ status: number; body: any }>;
    let earn!: Promise<{ status: number; body: any }>;
    try {
      await holder.query("BEGIN");
      await holder.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
        sneakEarner,
      ]);

      // Fire a real admin reset and a real engagement earn (a share of another
      // user's public post) while the lock is held.
      reset = api(`/admin/earnings/users/${sneakEarner}/reset`, admin, {
        method: "POST",
        body: JSON.stringify({}),
      });
      earn = api(`/posts/${postId}/share`, sneakEarner, {
        method: "POST",
        body: JSON.stringify({ caption: "lock probe" }),
      });

      // Wait far longer than either request needs when unblocked. Because we
      // hold the shared lock, neither the reset's zeroing entry nor the share's
      // award can be written, so the points ledger is frozen at its seeded
      // value. If EITHER the reset OR awardPoints stops taking
      // hashtext(userId) (a dropped or diverged lock key), that operation slips
      // through here and the balance moves off 5000 — failing this assertion.
      await new Promise((r) => setTimeout(r, 1000));
      expect(await getBalancePoints(sneakEarner)).toBe(5000);
    } finally {
      // Release the lock; the two blocked operations now serialize and finish.
      await holder.query("ROLLBACK");
      holder.release();
    }

    const [resetRes, earnRes] = await Promise.all([reset, earn]);
    expect(resetRes.status).toBe(200);
    expect(earnRes.status).toBe(201);

    // Once serialized the only valid outcomes are 0 (earn absorbed before the
    // reset) or exactly the share award (earn after the reset) — never the
    // stale 5000 and never negative.
    const balance = await getBalancePoints(sneakEarner);
    expect([0, BASE_CONFIG.pointsPerShare]).toContain(balance);
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  describe("with a daily cap", () => {
    beforeAll(async () => {
      // cap 10 with 3 points/share means only 3 full shares + a 1-point clamp fit.
      await setConfig({ dailyPointCap: 10 });
    });
    afterAll(async () => {
      await setConfig({ dailyPointCap: 0 });
    });

    it("never awards past the daily cap when shares fire simultaneously", async () => {
      const N = 6;
      const results = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          api(`/posts/${postId}/share`, capRacer, {
            method: "POST",
            body: JSON.stringify({ caption: `race ${i}` }),
          }),
        ),
      );
      expect(results.every((r) => r.status === 201)).toBe(true);

      // awardPoints serializes per user so the cap read + insert are atomic.
      // 3 + 3 + 3 then a 1-point clamp = exactly 10, never more. Without the
      // lock, concurrent awards read the same "earned today" and overshoot.
      const balance = await getBalancePoints(capRacer);
      expect(balance).toBe(10);
      expect(balance).toBeLessThanOrEqual(10);
    });
  });
});

describe("admin point adjustment", () => {
  it("adds exactly the requested points and returns the matching balance + USD", async () => {
    expect(await getBalancePoints(adjustee)).toBe(0);

    const res = await api(`/admin/earnings/users/${adjustee}/adjust`, admin, {
      method: "POST",
      body: JSON.stringify({ points: 2500, note: "manual grant" }),
    });
    expect(res.status).toBe(200);
    // adjust is additive: the response reflects the new ledger sum, not the delta.
    expect(res.body.balancePoints).toBe(2500);
    // $2.50 at 1000 points/$ — the response USD must track the points exactly.
    expect(res.body.balanceDollars).toBe(2.5);
    expect(await getBalancePoints(adjustee)).toBe(2500);
  });

  it("subtracts exactly the requested points (negative is a debit, not a reset)", async () => {
    const res = await api(`/admin/earnings/users/${adjustee}/adjust`, admin, {
      method: "POST",
      body: JSON.stringify({ points: -1000 }),
    });
    expect(res.status).toBe(200);
    // A negative adjust subtracts from the running balance: 2500 - 1000 = 1500.
    expect(res.body.balancePoints).toBe(1500);
    expect(res.body.balanceDollars).toBe(1.5);
    expect(await getBalancePoints(adjustee)).toBe(1500);
  });

  it("404s for an unknown user and writes nothing", async () => {
    const ghost = randomUUID();
    const res = await api(`/admin/earnings/users/${ghost}/adjust`, admin, {
      method: "POST",
      body: JSON.stringify({ points: 100 }),
    });
    expect(res.status).toBe(404);
    expect(await getBalancePoints(ghost)).toBe(0);
  });

  it("records WHICH admin made the adjustment (audit trail)", async () => {
    const res = await api(`/admin/earnings/users/${adjustee}/adjust`, admin, {
      method: "POST",
      body: JSON.stringify({ points: 50, note: "audited grant" }),
    });
    expect(res.status).toBe(200);
    // The ledger row must carry the acting admin's id so disputes/fraud
    // investigations can trace who moved the balance.
    const [entry] = await db
      .select({ createdBy: pointTransactionsTable.createdBy })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, adjustee))
      .orderBy(desc(pointTransactionsTable.id))
      .limit(1);
    expect(entry.createdBy).toBe(admin);
  });
});

describe("admin balance reset", () => {
  it("zeroes a non-zero balance with a single offsetting ledger entry", async () => {
    // Seed a positive balance from two separate awards.
    await db.insert(pointTransactionsTable).values([
      { userId: resetee, action: "admin_adjust", points: 700, note: "seed a" },
      { userId: resetee, action: "admin_adjust", points: 300, note: "seed b" },
    ]);
    expect(await getBalancePoints(resetee)).toBe(1000);
    const before = await ledgerCount(resetee);

    const res = await api(`/admin/earnings/users/${resetee}/reset`, admin, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    // Balance lands on exactly zero (not merely additive/decremented by a fixed step).
    expect(res.body.balancePoints).toBe(0);
    expect(res.body.balanceDollars).toBe(0);
    expect(await getBalancePoints(resetee)).toBe(0);

    // Reset writes exactly ONE offsetting entry of -currentBalance, not many.
    const after = await ledgerCount(resetee);
    expect(after).toBe(before + 1);
    const [entry] = await db
      .select({
        action: pointTransactionsTable.action,
        points: pointTransactionsTable.points,
      })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, resetee))
      .orderBy(desc(pointTransactionsTable.id))
      .limit(1);
    expect(entry.action).toBe("admin_adjust");
    expect(entry.points).toBe(-1000);
  });

  it("records WHICH admin performed the reset on the offsetting entry", async () => {
    await db.insert(pointTransactionsTable).values({
      userId: resetee,
      action: "admin_adjust",
      points: 400,
      note: "seed for audited reset",
    });
    expect(await getBalancePoints(resetee)).toBe(400);

    const res = await api(`/admin/earnings/users/${resetee}/reset`, admin, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    // The zeroing entry must record the acting admin so a reset can be traced.
    const [entry] = await db
      .select({
        points: pointTransactionsTable.points,
        createdBy: pointTransactionsTable.createdBy,
      })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, resetee))
      .orderBy(desc(pointTransactionsTable.id))
      .limit(1);
    expect(entry.points).toBe(-400);
    expect(entry.createdBy).toBe(admin);
  });

  it("is a no-op when the balance is already zero (writes no ledger entry)", async () => {
    expect(await getBalancePoints(resetee)).toBe(0);
    const before = await ledgerCount(resetee);

    const res = await api(`/admin/earnings/users/${resetee}/reset`, admin, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(res.body.balancePoints).toBe(0);
    expect(res.body.balanceDollars).toBe(0);
    // No zero-valued entry is written when there is nothing to offset.
    expect(await ledgerCount(resetee)).toBe(before);
  });

  it("brings a negative balance back to zero too (adds the missing points)", async () => {
    // A negative balance can arise from an over-aggressive admin debit; reset
    // must restore it to exactly zero, not just subtract more.
    await db.insert(pointTransactionsTable).values({
      userId: resetee,
      action: "admin_adjust",
      points: -250,
      note: "overdraw",
    });
    expect(await getBalancePoints(resetee)).toBe(-250);

    const res = await api(`/admin/earnings/users/${resetee}/reset`, admin, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(res.body.balancePoints).toBe(0);
    expect(await getBalancePoints(resetee)).toBe(0);
    // The offsetting entry is +250 (the negation of -250).
    const [entry] = await db
      .select({ points: pointTransactionsTable.points })
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, resetee))
      .orderBy(desc(pointTransactionsTable.id))
      .limit(1);
    expect(entry.points).toBe(250);
  });
});
