import { Pressable, Text, View, StyleSheet, type TextStyle } from "react-native";
import { router } from "expo-router";
import {
  useSearchUsers,
  getSearchUsersQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

// Mention token format shared with the API server and web app:
//   @[Display Name](user:<uuid>)
export const MENTION_RE = /@\[([^\]]+)\]\(user:([^)]+)\)/g;

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

export function MentionText({
  content,
  style,
}: {
  content: string;
  style?: TextStyle | TextStyle[];
}) {
  const c = useColors();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of content.matchAll(MENTION_RE)) {
    if (m.index! > last) {
      parts.push(content.slice(last, m.index));
    }
    const userId = m[2];
    parts.push(
      <Text
        key={`m-${i++}`}
        style={{ color: c.primary, fontFamily: "Inter_600SemiBold" }}
        onPress={() => router.push(`/profile/${userId}` as never)}
      >
        @{m[1]}
      </Text>,
    );
    last = m.index! + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <Text style={style}>{parts}</Text>;
}

export function MentionSuggestions({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (profile: Profile) => void;
}) {
  const c = useColors();
  const { data } = useSearchUsers(
    { q: query, limit: 5 },
    {
      query: {
        enabled: query.length >= 1,
        queryKey: getSearchUsersQueryKey({ q: query, limit: 5 }),
      },
    },
  );
  const results = (data ?? []) as Profile[];

  if (results.length === 0) return null;

  return (
    <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
      {results.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onSelect(p)}
          style={styles.row}
        >
          <Avatar uri={p.avatarUrl} name={p.displayName} size={28} />
          <Text
            style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}
            numberOfLines={1}
          >
            {p.displayName}
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: 12 }} numberOfLines={1}>
            @{p.username}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
