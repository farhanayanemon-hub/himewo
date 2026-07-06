import {
  useSearchUsers,
  getSearchUsersQueryKey,
  useListFriends,
  type Profile,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Megaphone } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

// Mention token format shared with the API server and mobile app:
//   @[Display Name](user:<uuid>)
export const MENTION_RE = /@\[([^\]]+)\]\(user:([^)]+)\)/g;

// Special mention id: "@highlight" notifies ALL of the author's friends
// (Facebook-style). Stored as @[Highlight](user:highlight).
export const HIGHLIGHT_ID = "highlight";
export const HIGHLIGHT_TOKEN = `@[Highlight](user:${HIGHLIGHT_ID})`;

export type MentionTarget = Pick<Profile, "id" | "displayName">;

// The "@query" being typed at the end of the input, if any. Returns "" when
// the user has just typed a bare "@" (so the friend list can show right away).
export function activeMentionQuery(text: string): string | null {
  const m = /(?:^|\s)@([^\s@[\]()]{0,30})$/.exec(text);
  return m ? m[1] : null;
}

export function insertMention(text: string, profile: MentionTarget): string {
  return text.replace(
    /(^|\s)@[^\s@[\]()]{0,30}$/,
    `$1@[${profile.displayName}](user:${profile.id}) `,
  );
}

// Insert a human-friendly "@Name " into the input (no raw token — the token
// would look like code to the user). Track the picked profile separately and
// convert with applyMentionTokens() on submit.
export function insertMentionDisplay(
  text: string,
  profile: MentionTarget,
): string {
  return text.replace(
    /(^|\s)@[^\s@[\]()]{0,30}$/,
    `$1@${profile.displayName} `,
  );
}

// Pick a profile from the mention dropdown. Normally inserts friendly
// "@Name " text and records the target for submit-time conversion. If a
// DIFFERENT already-picked target has the same display name, the plain-text
// form would be ambiguous — fall back to inserting the raw token so both
// users stay distinct.
export function pickMention(
  text: string,
  targets: MentionTarget[],
  profile: MentionTarget,
): { text: string; targets: MentionTarget[] } {
  const clash = targets.some(
    (t) => t.displayName === profile.displayName && t.id !== profile.id,
  );
  if (clash) return { text: insertMention(text, profile), targets };
  const next = targets.some((t) => t.id === profile.id)
    ? targets
    : [...targets, profile];
  return { text: insertMentionDisplay(text, profile), targets: next };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Convert "@Name" occurrences back into mention tokens for the picked
// targets. Longest names first so "@Jo" never eats part of "@John Doe",
// and only on exact word boundaries so "@Johnx" (a partial edit) stays
// plain text instead of becoming a wrong mention.
export function applyMentionTokens(
  text: string,
  targets: MentionTarget[],
): string {
  let out = text;
  const seenIds = new Set<string>();
  const usedNames = new Set<string>();
  for (const t of [...targets].sort(
    (a, b) => b.displayName.length - a.displayName.length,
  )) {
    if (seenIds.has(t.id)) continue;
    seenIds.add(t.id);
    // Two different ids with the same name: plain text is ambiguous — skip
    // (pickMention already inserted a raw token for the clashing pick).
    if (usedNames.has(t.displayName)) continue;
    usedNames.add(t.displayName);
    const re = new RegExp(
      `(^|\\s)@${escapeRegExp(t.displayName)}(?=$|\\s|[.,!?;:])`,
      "g",
    );
    out = out.replace(re, `$1${mentionToken(t)}`);
  }
  return out;
}

export function mentionToken(profile: Pick<Profile, "id" | "displayName">) {
  return `@[${profile.displayName}](user:${profile.id})`;
}

// Strip tokens down to "@Name" for plain-text surfaces (previews, inputs).
export function mentionsToPlainText(content: string): string {
  return content.replace(MENTION_RE, "@$1");
}

export function RenderWithMentions({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of content.matchAll(MENTION_RE)) {
    if (m.index! > last) parts.push(content.slice(last, m.index));
    if (m[2] === HIGHLIGHT_ID) {
      parts.push(
        <span
          key={`m-${i++}`}
          className="font-semibold bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          @{m[1]}
        </span>,
      );
    } else {
      parts.push(
        <Link
          key={`m-${i++}`}
          href={`/profile/${m[2]}`}
          className="text-primary font-semibold hover:underline"
        >
          @{m[1]}
        </Link>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <>{parts}</>;
}

export function MentionSuggestions({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (profile: MentionTarget) => void;
}) {
  const { data: searchResults } = useSearchUsers(
    { q: query, limit: 5 },
    {
      query: {
        enabled: query.length >= 1,
        queryKey: getSearchUsersQueryKey({ q: query, limit: 5 }),
      },
    },
  );
  // Bare "@" (empty query): show the user's friends right away.
  const { data: friends } = useListFriends();

  const results =
    query.length >= 1 ? searchResults : (friends ?? []).slice(0, 6);
  const showHighlight =
    HIGHLIGHT_ID.startsWith(query.toLowerCase()) || query.length === 0;

  if (!showHighlight && (!results || results.length === 0)) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20 max-h-72 overflow-y-auto">
      {showHighlight && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect({ id: HIGHLIGHT_ID, displayName: "Highlight" });
          }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left"
        >
          <span className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400 shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </span>
          <span className="text-sm font-medium">@highlight</span>
          <span className="text-xs text-muted-foreground truncate">
            Notify all your friends
          </span>
        </button>
      )}
      {results?.map((p) => (
        <button
          key={p.id}
          type="button"
          onMouseDown={(e) => {
            // pointerdown-before-blur: keep input focus while selecting
            e.preventDefault();
            onSelect(p);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left"
        >
          <img
            src={p.avatarUrl || ""}
            alt=""
            className="w-7 h-7 rounded-full object-cover bg-muted"
          />
          <span className="text-sm font-medium truncate">
            {p.displayName}
            {p.isVerified && (
              <VerifiedBadge className="w-3.5 h-3.5 ml-1 inline align-text-bottom" />
            )}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            @{p.username}
          </span>
        </button>
      ))}
    </div>
  );
}
