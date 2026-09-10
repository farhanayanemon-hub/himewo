/**
 * Returns the canonical Facebook-style profile URL for a user (himewo.com/<username>).
 * Falls back to /profile/<id> or /<id> if username is not present.
 */
export function getUserProfileUrl(
  user?: { username?: string | null; id?: string | null } | null,
): string {
  if (!user) return "/";
  if (user.username && user.username.trim()) {
    return `/${user.username.trim()}`;
  }
  if (user.id) {
    return `/${user.id}`;
  }
  return "/";
}

/**
 * Returns the profile URL for a post or reel author (either a Hub/Page or a user).
 */
export function getAuthorProfileUrl(
  author?: { username?: string | null; id?: string | null } | null,
  authorPage?: { id?: number | null } | null,
): string {
  if (authorPage?.id) {
    return `/pages/${authorPage.id}`;
  }
  return getUserProfileUrl(author);
}
