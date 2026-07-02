---
name: Photo albums + tagging
description: Album/photo-tag privacy rules, notification reuse trick, and untag authz pattern.
---

# Photo albums + tagging

- Tables: `albums`, `album_photos`, `photo_tags` (unique photoId+taggedUserId, cascade deletes). Routes in api-server `routes/albums.ts`, page `/albums/:id`, Albums card in profile-view.
- **Tag notification reuses type `mention`** with `entityType "album"`, `entityId = albumId` — avoids an ALTER TYPE enum migration. notifications.tsx branches on entityType for text ("tagged you in a photo") and link `/albums/{id}`. Reuse this pattern for future notification kinds.
- Privacy rules: list/detail gated by `canViewProfileDetails`; locked-profile list returns `[]` (not 404). Owner-only: delete album, add/delete photos, tag. Tag target must be owner's friend or self.
- **Untag authz pattern (came from a review-caught IDOR):** do ONE constrained join (tag ⋈ photo ⋈ album) first, then authorize (owner OR tagged-self), else generic 404. Never `loadAlbum()` → 404 before authz on delete-style routes — the 404/204 difference leaks album existence to strangers.
- Photo URLs http(s)-allowlisted server-side (same stored-XSS guard as page/CTA URLs).
