import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  pool,
  profilesTable,
  postsTable,
  marketplaceListingsTable,
  savedItemsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { buildSavedItems } from "./serialize";

// Locks in the behavior that buildSavedItems silently drops saved rows whose
// underlying entity (post/listing) was deleted after being saved, so the Saved
// list never shows a broken/ghost card.

const userId = randomUUID();
let postId: number;
let listingId: number;

async function listSaved() {
  const rows = await db
    .select()
    .from(savedItemsTable)
    .where(eq(savedItemsTable.userId, userId))
    .orderBy(desc(savedItemsTable.createdAt));
  return buildSavedItems(rows, userId);
}

beforeAll(async () => {
  await db.insert(profilesTable).values({
    id: userId,
    username: `saved-test-${userId.slice(0, 8)}`,
    displayName: "Saved Test User",
  });

  const [post] = await db
    .insert(postsTable)
    .values({ authorId: userId, content: "Saved post under test" })
    .returning();
  postId = post.id;

  const [listing] = await db
    .insert(marketplaceListingsTable)
    .values({ sellerId: userId, title: "Saved listing under test" })
    .returning();
  listingId = listing.id;

  await db.insert(savedItemsTable).values([
    { userId, entityType: "post", entityId: postId },
    { userId, entityType: "listing", entityId: listingId },
  ]);
});

afterAll(async () => {
  // Deleting the profile cascades to posts, listings, and saved_items.
  await db.delete(profilesTable).where(eq(profilesTable.id, userId));
  await pool.end();
});

describe("buildSavedItems with deleted entities", () => {
  it("returns the saved post and listing while both still exist", async () => {
    const items = await listSaved();
    expect(items).toHaveLength(2);

    const savedPost = items.find((i) => i.entityType === "post");
    const savedListing = items.find((i) => i.entityType === "listing");
    expect(savedPost?.post?.id).toBe(postId);
    expect(savedListing?.listing?.id).toBe(listingId);
  });

  it("filters out a saved post after the post is deleted (no error, no ghost card)", async () => {
    await db.delete(postsTable).where(eq(postsTable.id, postId));

    const items = await listSaved();

    // The deleted post is gone, the listing remains.
    expect(items.find((i) => i.entityType === "post")).toBeUndefined();
    const remaining = items.find((i) => i.entityType === "listing");
    expect(remaining?.listing?.id).toBe(listingId);
    expect(items).toHaveLength(1);
  });

  it("filters out a saved listing after the listing is deleted", async () => {
    await db
      .delete(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, listingId));

    const items = await listSaved();

    expect(items).toHaveLength(0);
  });
});
