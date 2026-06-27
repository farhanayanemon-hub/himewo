import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFriends,
  useCreateConversation,
  getListConversationsQueryKey,
  ConversationInputType,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useRealtime } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { lastActiveLabel } from "@/lib/format";

export function ActiveRow() {
  const c = useColors();
  const qc = useQueryClient();
  const { isOnline } = useRealtime();
  const { data } = useListFriends();
  const friends = (data ?? []) as Profile[];
  const createConversation = useCreateConversation();
  const [busy, setBusy] = useState(false);

  const open = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const conv = await createConversation.mutateAsync({
        data: { type: ConversationInputType.direct, memberIds: [id] },
      });
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      router.push(`/messages/${conv.id}`);
    } finally {
      setBusy(false);
    }
  };

  const isActive = (f: Profile) =>
    isOnline(f.id) || f.presence?.status === "online";

  const sorted = [...friends].sort(
    (a, b) => Number(isActive(b)) - Number(isActive(a)),
  );

  if (sorted.length === 0) return null;

  return (
    <View style={[styles.wrap, { borderBottomColor: c.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sorted.map((f) => {
          const active = isActive(f);
          return (
            <Touchable
              key={f.id}
              style={styles.item}
              onPress={() => open(f.id)}
              disabled={busy}
            >
              <Avatar
                uri={f.avatarUrl}
                name={f.displayName}
                size={60}
                online={active}
              />
              <Text numberOfLines={1} style={[styles.name, { color: c.foreground }]}>
                {f.displayName.split(" ")[0]}
              </Text>
              {!active && f.presence?.lastSeenAt ? (
                <Text numberOfLines={1} style={[styles.sub, { color: c.mutedForeground }]}>
                  {lastActiveLabel(f.presence.lastSeenAt).replace("Active ", "")}
                </Text>
              ) : null}
            </Touchable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: 12, gap: 14 },
  item: { width: 64, alignItems: "center", gap: 4 },
  name: { fontSize: fs(12), fontFamily: "Inter_500Medium", maxWidth: 64, textAlign: "center" },
  sub: { fontSize: fs(10), fontFamily: "Inter_400Regular", maxWidth: 64, textAlign: "center" },
});
