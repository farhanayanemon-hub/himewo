import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFriends,
  useListConversations,
  useCreateConversation,
  getListConversationsQueryKey,
  ConversationInputType,
  type Profile,
  type Conversation,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { lastActiveLabel } from "@/lib/format";

export const ActiveRow = React.memo(function ActiveRow() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useRealtime();
  const { data: friendData } = useListFriends();
  const friends = (friendData ?? []) as Profile[];
  const { data: convData } = useListConversations();
  const conversations = (convData ?? []) as Conversation[];
  const createConversation = useCreateConversation();
  const [busy, setBusy] = useState(false);

  const isActive = useCallback(
    (f: Profile) => isOnline(f.id) || f.presence?.status === "online",
    [isOnline],
  );

  // Combine confirmed friends and conversation peers so all contacts appear
  const sorted = useMemo(() => {
    const contactMap = new Map<string, Profile>();
    for (const f of friends) {
      if (f.id !== user?.id) {
        contactMap.set(f.id, f);
      }
    }
    for (const conv of conversations) {
      for (const m of conv.members) {
        if (m.user.id !== user?.id && !contactMap.has(m.user.id)) {
          contactMap.set(m.user.id, m.user);
        }
      }
    }
    const allContacts = Array.from(contactMap.values());
    return [...allContacts].sort(
      (a, b) => Number(isActive(b)) - Number(isActive(a)),
    );
  }, [friends, conversations, user?.id, isActive]);

  const open = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const existing = conversations.find(
        (conv) => conv.type === "direct" && conv.members.some((m) => m.user.id === id),
      );
      if (existing) {
        router.push(`/messages/${existing.id}`);
        return;
      }
      const conv = await createConversation.mutateAsync({
        data: { type: ConversationInputType.direct, memberIds: [id] },
      });
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      router.push(`/messages/${conv.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.wrap, { borderBottomColor: c.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Item 1: Your Story */}
        <Touchable style={styles.item} onPress={() => router.push("/create-story")}>
          <View style={{ position: "relative" }}>
            <Avatar uri={user?.avatarUrl} name={user?.displayName} size={58} />
            <View style={[styles.plusBadge, { backgroundColor: c.primary, borderColor: c.card }]}>
              <Ionicons name="add" size={13} color="#fff" />
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.name, { color: c.foreground }]}>
            Your story
          </Text>
        </Touchable>

        {/* Online / Active Friends List */}
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
                size={58}
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
});

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: 12, gap: 14 },
  item: { width: 62, alignItems: "center", gap: 4 },
  name: { fontSize: fs(11), fontFamily: "Inter_500Medium", maxWidth: 62, textAlign: "center" },
  sub: { fontSize: fs(9), fontFamily: "Inter_400Regular", maxWidth: 62, textAlign: "center" },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
