// Facebook-style default avatar: gray person silhouette on a light gray
// circle, as an inline SVG data URI so it never needs a network request.
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="#e4e6eb"/><circle cx="48" cy="38" r="17" fill="#bcc0c4"/><path d="M48 60c-16.6 0-30 10.7-30 24v12h60V84c0-13.3-13.4-24-30-24z" fill="#bcc0c4"/></svg>`;

export const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;

// Use everywhere an avatar image src is needed: falls back to the
// Facebook-style silhouette when the user has no profile photo.
export function avatarSrc(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : DEFAULT_AVATAR;
}
