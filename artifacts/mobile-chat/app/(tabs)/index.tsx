import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
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
  useListFriendRequests,
  getSearchUsersQueryKey,
  getListConversationsQueryKey,
  ConversationInputType,
  type Conversation,
  type Profile,
  type FriendRequest,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { ActiveRow } from "@/components/ActiveRow";
import { useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";
import { openMainApp } from "@/lib/mainApp";

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
  const [search, setSearch] = useState("");

  const { data, isLoading, isRefetching, refetch } = useListConversations();
  const conversations = (data ?? []) as Conversation[];

  const { data: requestData } = useListFriendRequests();
  const requestCount = ((requestData ?? []) as FriendRequest[]).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const peer = otherMember(conv, user?.id);
      const name =
        conv.type === "group"
          ? conv.title || "Group chat"
          : peer?.displayName || "";
      return name.toLowerCase().includes(q);
    });
  }, [conversations, search, user?.id]);

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
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.push("/settings")} hitSlop={8}>
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={36} />
        </Touchable>
        <Text style={[styles.wordmark, { color: c.primary }]}>himewo chat</Text>
        <View style={styles.headerRight}>
          <Touchable
            style={[styles.iconBtn, { backgroundColor: c.secondary }, shadow("sm")]}
            onPress={() => setNewOpen(true)}
          >
            <Ionicons name="create-outline" size={20} color={c.foreground} />
          </Touchable>
          <Touchable
            style={[styles.iconBtn, { backgroundColor: c.secondary }, shadow("sm")]}
            onPress={() => openMainApp()}
            hitSlop={6}
          >
            <Ionicons name="apps" size={20} color={c.foreground} />
          </Touchable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: c.card }, shadow("sm")]}>
          <Ionicons name="search" size={18} color={c.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search chats"
            placeholderTextColor={c.mutedForeground}
            style={{ flex: 1, color: c.foreground, fontSize: fs(15), paddingVertical: 0 }}
          />
          {search.length > 0 && (
            <Touchable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.mutedForeground} />
            </Touchable>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            search.trim().length > 0 ? null : (
              <View>
                <ActiveRow />
                {requestCount > 0 && (
                  <Touchable
                    style={[styles.requestRow, { borderBottomColor: c.border }]}
                    onPress={() => router.push("/message-requests")}
                  >
                    <View style={[styles.requestIcon, { backgroundColor: c.primary }, glow(c.primary)]}>
                      <Ionicons name="chatbox-ellipses" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(16) }}>
                        Message requests
                      </Text>
                      <Text style={{ color: c.mutedForeground, fontSize: fs(13), marginTop: 2 }}>
                        {requestCount} {requestCount === 1 ? "person wants" : "people want"} to connect
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: c.primary }, glow(c.primary)]}>
                      <Text style={styles.badgeText}>{requestCount > 99 ? "99+" : requestCount}</Text>
                    </View>
                  </Touchable>
                )}
              </View>
            )
          }
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
                    : last.type === "audio"
                      ? "🎤 Voice message"
                      : "Attachment"
              : "No messages yet";
            const mine = last && last.sender.id === user?.id;
            const unread = item.unreadCount > 0;

            return (
              <Touchable
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
                        fontSize: fs(14),
                      }}
                    >
                      {mine ? "You: " : ""}
                      {preview}
                    </Text>
                    {unread && (
                      <View style={[styles.badge, { backgroundColor: c.primary }, glow(c.primary)]}>
                        <Text style={styles.badgeText}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Touchable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                {search.trim().length > 0
                  ? "No chats match your search."
                  : "No conversations yet. Start a new chat!"}
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
        <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
          <Touchable onPress={onClose} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={c.foreground} />
          </Touchable>
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
              style={{ flex: 1, color: c.foreground, fontSize: fs(15), paddingVertical: 0 }}
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
              <Touchable
                style={[styles.userRow, { borderBottomColor: c.border }]}
                onPress={() => startChat(item.id)}
                disabled={creating}
              >
                <Avatar uri={item.avatarUrl} name={item.displayName} size={44} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                    {item.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>@{item.username}</Text>
                </View>
              </Touchable>
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
    zIndex: 2,
  },
  searchWrap: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: fs(20) },
  wordmark: { flex: 1, marginLeft: 12, fontFamily: "Inter_700Bold", fontSize: fs(22), letterSpacing: -0.5 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  requestIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  name: { flex: 1, fontSize: fs(16), marginRight: 8 },
  time: { fontSize: fs(12) },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(11) },
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
