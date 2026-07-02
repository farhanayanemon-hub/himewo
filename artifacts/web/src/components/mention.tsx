import {
  useSearchUsers,
  getSearchUsersQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { VerifiedBadge } from "@/components/verified-badge";

// Mention token format shared with the API server and mobile app:
//   @[Display Name](user:<uuid>)
export const MENTION_RE = /@\[([^\]]+)\]\(user:([^)]+)\)/g;

// The "@query" being typed at the end of the input, if any.
export function activeMentionQuery(text: string): string | null {
  const m = /(?:^|\s)@([^\s@[\]()]{1,30})$/.exec(text);
  return m ? m[1] : null;
}

export function insertMention(text: string, profile: Profile): string {
  return text.replace(
    /(^|\s)@[^\s@[\]()]{1,30}$/,
    `$1@[${profile.displayName}](user:${profile.id}) `,
  );
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
    parts.push(
      <Link
        key={`m-${i++}`}
        href={`/profile/${m[2]}`}
        className="text-primary font-semibold hover:underline"
      >
        @{m[1]}
      </Link>,
    );
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
  onSelect: (profile: Profile) => void;
}) {
  const { data: results } = useSearchUsers(
    { q: query, limit: 5 },
    {
      query: {
        enabled: query.length >= 1,
        queryKey: getSearchUsersQueryKey({ q: query, limit: 5 }),
      },
    },
  );

  if (!results || results.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20">
      {results.map((p) => (
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
