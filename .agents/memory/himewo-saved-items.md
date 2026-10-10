---
name: HiMewo saved/bookmark items
description: How the polymorphic saved-items feature is wired, and why stories are excluded
---

# Saved/bookmark items (polymorphic)

`saved_items` is polymorphic: `entityType` (plain text, NO DB enum) + `entityId`. Supported types: `post`, `listing`, `reel`.

To add a new savable entity type, touch ALL of:
- `lib/api-spec/openapi.yaml`: add the type to the enum in 3 spots (SavedItem.entityType, SavedItemInput.entityType, the `/saved/{entityType}/{entityId}` delete path param), add a nullable `<entity>` field to the `SavedItem` schema, and add `viewerHasSaved` (REQUIRED) to the entity's own schema. Then run codegen.
- `artifacts/api-server/src/lib/serialize.ts`: `build<Entity>` must compute `viewerHasSaved` (query savedItems for that entityType), and `buildSavedItems` must load + serialize that type and skip deleted rows.
- Frontends: web + main mobile save toggle on the entity surface, and a section on the Saved page/screen with unsave. Invalidate both the entity list query key and `getListSavedItemsQueryKey` after save/unsave.

**Why `viewerHasSaved` must be in the entity schema `required` list:** if omitted it generates as `boolean | undefined`, and callers passing it to a `(saved: boolean)` handler fail typecheck.

## Stories are intentionally NOT savable
Stories expire (`expiresAt`, ~24h) and have no persistent entity worth bookmarking, so despite task titles mentioning "reels and stories", only reels got a save toggle. Don't add `entityType: "story"` unless stories become long-lived.
