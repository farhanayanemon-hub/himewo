---
name: HiMewo repost / share feature
description: How Facebook-style sharing works — share creates a real repost embedding the original — and the privacy rules that MUST hold.
---

# Share = real repost (not just a counter)

`POST /api/posts/:id/share` does three things in one DB transaction: inserts a `shares`
row (for the count) AND creates a NEW post (the repost) with `shared_post_id = originalId`,
then returns that repost serialized with the original embedded under `sharedPost`.
So a share shows up on the sharer's own timeline/feed, exactly like Facebook.

- `posts.shared_post_id` → self-FK `REFERENCES posts(id) ON DELETE SET NULL` (additive).
- `serialize.buildPosts(rows, viewerId, embedShared=true)` batch-fetches the originals and
  recurses with `embedShared=false` to embed them one level deep (no nested chains).
- Re-sharing a repost flattens to the TRUE original: `originalId = post.sharedPostId ?? id`.

## Privacy rules — do NOT regress these (caused a real review failure)
**Why:** a repost is always created `privacy: "public"`. Without guards, a public repost
would leak a friends-only/private/group original to everyone.
**How to apply — both guards must stay:**
1. **Embed gate (the critical one):** in `buildPosts`, every embedded original is run through
   `canViewPost(original, viewerId)` before embedding; if the viewer can't see it, `sharedPost`
   is `null`. So even a public repost only shows the original to people allowed to see it.
   (Unauthenticated/no-viewer path: embed only `public` + non-group.)
2. **Share policy:** the share route rejects (403) resharing a non-`public` post unless you
   own it. Trying to share a post you can't even view returns 404 (no existence leak).

Other invariants: share + repost inserts are wrapped in `db.transaction` (no orphan share
counts); the `share` notification goes to the ORIGINAL author and is skipped when you reshare
your own post (no self-notify).

## Verifying live
Multi-user test: T1 posts friends-only → T1 reshares own → T2 (no relation) GETs the public
repost and `sharedPost` MUST be `null`; T2 sharing the restricted post MUST be 404; a public
reshare MUST embed for everyone. (Throwaway @himewo-test.com users + service-role cleanup.)
