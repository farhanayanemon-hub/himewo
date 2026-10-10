---
name: Watch feed pagination
description: Video-only feed and the post-filter pagination trap shared by any filtered feed endpoint.
---

# Watch feed

- Watch = posts having ≥1 `post_media` row of type `video` (subquery via `inArray(postsTable.id, videoPostIds)`), group posts excluded; same coarse privacy net + `filterVisiblePosts` as home feed.
- **Pagination trap (review-failed once):** any feed that runs `filterVisiblePosts` AFTER a SQL `limit` can return a short page while older visible rows still exist. Clients treat `page.length < PAGE_SIZE` as end-of-feed → feed silently truncates (worst case: "No videos yet" with content present).
  - **How to apply:** scan in batches (e.g. 50) in a loop, accumulate visible rows until page is full or rows exhausted, then slice to the page limit. Cap iterations (e.g. 8) to bound cost. Cursor = last RETURNED post id; re-scanning filtered rows on the next page is harmless.
  - The home `/feed` endpoint technically shares this weakness but its filter rarely drops rows; apply the loop pattern to any NEW filtered feed.
