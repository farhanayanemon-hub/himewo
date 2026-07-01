import { Router, type IRouter } from "express";
import {
  db,
  albumsTable,
  albumPhotosTable,
  photoTagsTable,
  profilesTable,
} from "@workspace/db";
import { and, eq, desc, asc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { canViewProfileDetails, areFriends } from "../lib/authz";
import { createNotification } from "../lib/notify";
import { buildProfileDetail } from "../lib/serialize";
import {
  GetUserAlbumsParams,
  GetUserAlbumsResponse,
  CreateAlbumBody,
  CreateAlbumResponse,
  GetAlbumParams,
  GetAlbumResponse,
  DeleteAlbumParams,
  AddAlbumPhotosParams,
  AddAlbumPhotosBody,
  AddAlbumPhotosResponse,
  DeleteAlbumPhotoParams,
  TagPhotoParams,
  TagPhotoBody,
  TagPhotoResponse,
  UntagPhotoParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type AlbumRow = typeof albumsTable.$inferSelect;

async function buildAlbums(rows: AlbumRow[]) {
  if (rows.length === 0) return [];
  const albumIds = rows.map((a) => a.id);
  const photos = await db
    .select({
      id: albumPhotosTable.id,
      albumId: albumPhotosTable.albumId,
      url: albumPhotosTable.url,
    })
    .from(albumPhotosTable)
    .where(inArray(albumPhotosTable.albumId, albumIds))
    .orderBy(asc(albumPhotosTable.createdAt));
  const countByAlbum = new Map<number, number>();
  const coverByAlbum = new Map<number, string>();
  for (const p of photos) {
    countByAlbum.set(p.albumId, (countByAlbum.get(p.albumId) ?? 0) + 1);
    if (!coverByAlbum.has(p.albumId)) coverByAlbum.set(p.albumId, p.url);
  }
  return rows.map((a) => ({
    id: a.id,
    ownerId: a.ownerId,
    name: a.name,
    description: a.description,
    coverUrl: coverByAlbum.get(a.id) ?? null,
    photoCount: countByAlbum.get(a.id) ?? 0,
    createdAt: a.createdAt.toISOString(),
  }));
}

async function buildPhotos(
  rows: (typeof albumPhotosTable.$inferSelect)[],
) {
  if (rows.length === 0) return [];
  const photoIds = rows.map((p) => p.id);
  const tags = await db
    .select({
      photoId: photoTagsTable.photoId,
      userId: photoTagsTable.taggedUserId,
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
    })
    .from(photoTagsTable)
    .innerJoin(profilesTable, eq(profilesTable.id, photoTagsTable.taggedUserId))
    .where(inArray(photoTagsTable.photoId, photoIds));
  const tagsByPhoto = new Map<
    number,
    { userId: string; displayName: string; avatarUrl: string | null }[]
  >();
  for (const t of tags) {
    const list = tagsByPhoto.get(t.photoId) ?? [];
    list.push({
      userId: t.userId,
      displayName: t.displayName,
      avatarUrl: t.avatarUrl,
    });
    tagsByPhoto.set(t.photoId, list);
  }
  return rows.map((p) => ({
    id: p.id,
    albumId: p.albumId,
    url: p.url,
    caption: p.caption,
    tags: tagsByPhoto.get(p.id) ?? [],
    createdAt: p.createdAt.toISOString(),
  }));
}

/** Load an album or respond 404. Returns null after responding. */
async function loadAlbum(
  albumId: number,
  res: { status: (n: number) => { json: (b: unknown) => unknown } },
): Promise<AlbumRow | null> {
  const [album] = await db
    .select()
    .from(albumsTable)
    .where(eq(albumsTable.id, albumId));
  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return null;
  }
  return album;
}

router.get(
  "/users/:id/albums",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetUserAlbumsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    // Locked / restricted profiles hide albums from non-friends,
    // consistent with posts and friends lists.
    if (!(await canViewProfileDetails(params.data.id, req.userId!))) {
      res.json(GetUserAlbumsResponse.parse([]));
      return;
    }
    const rows = await db
      .select()
      .from(albumsTable)
      .where(eq(albumsTable.ownerId, params.data.id))
      .orderBy(desc(albumsTable.createdAt));
    res.json(GetUserAlbumsResponse.parse(await buildAlbums(rows)));
  },
);

router.post("/albums", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAlbumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Album name is required" });
    return;
  }
  const [row] = await db
    .insert(albumsTable)
    .values({
      ownerId: req.userId!,
      name,
      description: parsed.data.description?.trim() || null,
    })
    .returning();
  const [built] = await buildAlbums([row]);
  res.status(201).json(CreateAlbumResponse.parse(built));
});

router.get(
  "/albums/:albumId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetAlbumParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const album = await loadAlbum(params.data.albumId, res);
    if (!album) return;
    if (!(await canViewProfileDetails(album.ownerId, req.userId!))) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    const photos = await db
      .select()
      .from(albumPhotosTable)
      .where(eq(albumPhotosTable.albumId, album.id))
      .orderBy(asc(albumPhotosTable.createdAt));
    const [builtAlbum] = await buildAlbums([album]);
    const owner = await buildProfileDetail(album.ownerId, req.userId!);
    res.json(
      GetAlbumResponse.parse({
        album: builtAlbum,
        owner,
        photos: await buildPhotos(photos),
      }),
    );
  },
);

router.delete(
  "/albums/:albumId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteAlbumParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const album = await loadAlbum(params.data.albumId, res);
    if (!album) return;
    if (album.ownerId !== req.userId!) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    await db.delete(albumsTable).where(eq(albumsTable.id, album.id));
    res.sendStatus(204);
  },
);

router.post(
  "/albums/:albumId/photos",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AddAlbumPhotosParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = AddAlbumPhotosBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const album = await loadAlbum(params.data.albumId, res);
    if (!album) return;
    if (album.ownerId !== req.userId!) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    // Only allow http(s) URLs (same stored-XSS guard as other media fields).
    const photos = body.data.photos
      .map((p) => ({ url: p.url.trim(), caption: p.caption?.trim() || null }))
      .filter((p) => /^https?:\/\//i.test(p.url));
    if (photos.length === 0) {
      res.status(400).json({ error: "No valid photo URLs" });
      return;
    }
    const rows = await db
      .insert(albumPhotosTable)
      .values(photos.map((p) => ({ albumId: album.id, ...p })))
      .returning();
    res.status(201).json(AddAlbumPhotosResponse.parse(await buildPhotos(rows)));
  },
);

router.delete(
  "/albums/:albumId/photos/:photoId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteAlbumPhotoParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const album = await loadAlbum(params.data.albumId, res);
    if (!album) return;
    if (album.ownerId !== req.userId!) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    await db
      .delete(albumPhotosTable)
      .where(
        and(
          eq(albumPhotosTable.id, params.data.photoId),
          eq(albumPhotosTable.albumId, album.id),
        ),
      );
    res.sendStatus(204);
  },
);

router.post(
  "/albums/:albumId/photos/:photoId/tags",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = TagPhotoParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = TagPhotoBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const album = await loadAlbum(params.data.albumId, res);
    if (!album) return;
    if (album.ownerId !== req.userId!) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    const [photo] = await db
      .select()
      .from(albumPhotosTable)
      .where(
        and(
          eq(albumPhotosTable.id, params.data.photoId),
          eq(albumPhotosTable.albumId, album.id),
        ),
      );
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    const taggedUserId = body.data.userId;
    // You can tag yourself or a friend — nobody else (mirrors Facebook).
    if (
      taggedUserId !== req.userId! &&
      !(await areFriends(req.userId!, taggedUserId))
    ) {
      res.status(400).json({ error: "You can only tag your friends" });
      return;
    }
    const [profile] = await db
      .select({
        id: profilesTable.id,
        displayName: profilesTable.displayName,
        avatarUrl: profilesTable.avatarUrl,
      })
      .from(profilesTable)
      .where(eq(profilesTable.id, taggedUserId));
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [inserted] = await db
      .insert(photoTagsTable)
      .values({
        photoId: photo.id,
        taggedUserId,
        taggerId: req.userId!,
      })
      .onConflictDoNothing()
      .returning();
    // Only notify on a fresh tag, not a repeat.
    if (inserted) {
      await createNotification({
        userId: taggedUserId,
        actorId: req.userId!,
        type: "mention",
        entityType: "album",
        entityId: album.id,
      });
    }
    res.status(201).json(
      TagPhotoResponse.parse({
        userId: profile.id,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }),
    );
  },
);

router.delete(
  "/albums/:albumId/photos/:photoId/tags/:userId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UntagPhotoParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    // Single constrained lookup: the tag must exist on that photo within
    // that album. Anything else is a generic 404 (no existence leakage).
    const [found] = await db
      .select({
        tagId: photoTagsTable.id,
        ownerId: albumsTable.ownerId,
        taggedUserId: photoTagsTable.taggedUserId,
      })
      .from(photoTagsTable)
      .innerJoin(
        albumPhotosTable,
        eq(albumPhotosTable.id, photoTagsTable.photoId),
      )
      .innerJoin(albumsTable, eq(albumsTable.id, albumPhotosTable.albumId))
      .where(
        and(
          eq(photoTagsTable.photoId, params.data.photoId),
          eq(photoTagsTable.taggedUserId, params.data.userId),
          eq(albumPhotosTable.albumId, params.data.albumId),
        ),
      );
    // Only the album owner, or the tagged person removing their own tag.
    if (
      !found ||
      (found.ownerId !== req.userId! && found.taggedUserId !== req.userId!)
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(photoTagsTable).where(eq(photoTagsTable.id, found.tagId));
    res.sendStatus(204);
  },
);

export default router;
