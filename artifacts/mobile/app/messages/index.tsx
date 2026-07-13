import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListConversations,
  useCreateConversation,
  useSearchUsers,
  getSearchUsersQueryKey,
  getListConversationsQueryKey,
  ConversationInputType,
  type Conversation,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";

function otherMember(conv: Conversation, myId?: string): Profile | undefined {
  const others = conv.members.filter((m) => m.user.id !== myId);
  return others[0]?.user;
}

export default function ConversationsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isOnline, subscribe } = useRealtime();
  const [newOpen, setNewOpen] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useListConversations();
  const conversations = (data ?? []) as Conversation[];

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    refetch();
  }, [qc, refetch]);

  useEffect(() => {
    const unsub = subscribe((event) => {
      if (
        event.type === "message" ||
        event.type === "message_deleted" ||
        event.type === "seen"
      ) {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      }
    });
    return unsub;
  }, [subscribe, qc]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: c.foreground }]}>Chats</Text>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: c.secondary }]}
          onPress={() => setNewOpen(true)}
        >
          <Ionicons name="create-outline" size={20} color={c.foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          renderItem={({ item }) => {
            const peer = otherMember(item, user?.id);
            const isGroup = item.type === "group";
            const name = isGroup
              ? item.title || "Group chat"
              : peer?.displayName || "Unknown";
            const avatarUri = isGroup ? item.avatarUrl : peer?.avatarUrl;
            const online = !isGroup && peer ? isOnline(peer.id) : false;
            const last = item.lastMessage;
            const preview = last
              ? last.type === "text"
                ? last.content
                : last.type === "image"
                  ? "Photo"
                  : last.type === "video"
                    ? "Video"
                    : "Attachment"
              : "No messages yet";
            const mine = last && last.sender.id === user?.id;
            const unread = item.unreadCount > 0;

            return (
              <Pressable
                style={[styles.row, { borderBottomColor: c.border }]}
                onPress={() => router.push(`/messages/${item.id}`)}
              >
                <Avatar uri={avatarUri} name={name} size={56} online={online} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.rowTop}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.name,
                        { color: c.foreground, fontFamily: unread ? "Inter_700Bold" : "Inter_600SemiBold" },
                      ]}
                    >
                      {name}
                    </Text>
                    <Text style={[styles.time, { color: c.mutedForeground }]}>
                      {timeAgo(item.lastMessageAt)}
                    </Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: unread ? c.foreground : c.mutedForeground,
                        fontFamily: unread ? "Inter_600SemiBold" : "Inter_400Regular",
                        fontSize: 14,
                      }}
                    >
                      {mine ? "You: " : ""}
                      {preview}
                    </Text>
                    {unread && (
                      <View style={[styles.badge, { backgroundColor: c.primary }]}>
                        <Text style={styles.badgeText}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No conversations yet. Start a new chat!
              </Text>
            </View>
          }
        />
      )}

      <NewMessageModal visible={newOpen} onClose={() => setNewOpen(false)} />
    </SafeAreaView>
  );
}

function NewMessageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const createConversation = useCreateConversation();
  const [creating, setCreating] = useState(false);

  const params = useMemo(() => ({ q: query.trim(), limit: 20 }), [query]);
  const { data, isLoading } = useSearchUsers(params, {
    query: {
      enabled: visible && query.trim().length > 0,
      queryKey: getSearchUsersQueryKey(params),
    },
  });
  const results = ((data ?? []) as Profile[]).filter((p) => p.id !== user?.id);

  const startChat = async (otherId: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const conv = await createConversation.mutateAsync({
        data: { type: ConversationInputType.direct, memberIds: [otherId] },
      });
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      setQuery("");
      onClose();
      router.push(`/messages/${conv.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: c.foreground }]}>New message</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={{ padding: 12 }}>
          <View style={[styles.searchBox, { backgroundColor: c.secondary }]}>
            <Ionicons name="search" size={18} color={c.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search people"
              placeholderTextColor={c.mutedForeground}
              autoFocus
              underlineColorAndroid="transparent"
              style={{ flex: 1, color: c.foreground, fontSize: 16, paddingVertical: 0 }}
            />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.userRow, { borderBottomColor: c.border }]}
                onPress={() => startChat(item.id)}
                disabled={creating}
              >
                <Avatar uri={item.avatarUrl} name={item.displayName} size={44} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {item.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>@{item.username}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <Text style={{ color: c.mutedForeground, textAlign: "center", marginTop: 40 }}>
                  No people found
                </Text>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowBottom: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 8 },
  name: { flex: 1, fontSize: 16, marginRight: 8 },
  time: { fontSize: 12 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
