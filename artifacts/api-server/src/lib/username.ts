// Canonical username rules shared by signup (/auth/sync) and rename
// (PATCH /users/me). Usernames are stored lowercase; uniqueness is enforced
// case-insensitively via the profiles_username_lower_idx unique index.

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

// Usernames that would collide with app routes (himewo.com/<username>).
const RESERVED_USERNAMES = new Set([
  "admin", "api", "me", "post", "profile", "edit-profile", "friends",
  "messages", "reels", "groups", "pages", "marketplace", "notifications",
  "search", "settings", "earnings", "stories", "memories", "saved", "albums",
  "events", "watch", "live", "login", "signup", "auth", "help", "about",
  "terms", "privacy", "himewo", "ads", "ads-manager", "hashtag", "hashtags", "verified",
]);

export function isReservedUsername(name: string): boolean {
  return RESERVED_USERNAMES.has(name.toLowerCase());
}

/**
 * Normalize a requested username to canonical form: lowercase, strip
 * disallowed characters, trim leading/trailing separators, cap at 30 chars.
 * Returns "" when nothing usable remains.
 */
export function normalizeUsername(requested: string): string {
  return requested
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 30);
}

/** Postgres unique-violation error code. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}
