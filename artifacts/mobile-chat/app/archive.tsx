import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListConversations,
  useUpdateConversationPrefs,
  getListConversationsQueryKey,
  type Conversation,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";

function otherMember(conv: Conversation, myId?: string): Profile | undefined {
  const others = conv.members.filter((m) => m.user.id !== myId);
  return others[0]?.user;
}

export default function ArchiveScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useListConversations();
  const archived = ((data ?? []) as Conversation[]).filter((conv) => conv.isArchived);
  const prefs = useUpdateConversationPrefs();

  const unarchive = async (conv: Conversation) => {
    await prefs.mutateAsync({ id: conv.id, data: { isArchived: false } });
    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Archived chats
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={archived}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="archive-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(16), marginTop: 12 }}>
                No archived chats
              </Text>
              <Text style={{ color: c.mutedForeground, textAlign: "center", marginTop: 6, paddingHorizontal: 32 }}>
                Chats you archive will show up here. Your archived conversations stay private.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const peer = otherMember(item, user?.id);
            const isGroup = item.type === "group";
            const name = isGroup
              ? item.title || "Group chat"
              : peer?.displayName || "Unknown";
            const avatarUri = isGroup ? item.avatarUrl : peer?.avatarUrl;
            const last = item.lastMessage;
            const preview = last
              ? last.type === "text"
                ? last.content
                : "Attachment"
              : "No messages yet";

            return (
              <Touchable
                style={[styles.row, { borderBottomColor: c.border }]}
                onPress={() => router.push(`/messages/${item.id}`)}
              >
                <Avatar uri={avatarUri} name={name} size={52} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.rowTop}>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15), marginRight: 8 }}
                    >
                      {name}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: fs(12) }}>
                      {timeAgo(item.lastMessageAt)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={{ color: c.mutedForeground, fontSize: fs(13), marginTop: 2 }}>
                    {preview}
                  </Text>
                </View>
                <Touchable
                  style={[styles.unarchiveBtn, { backgroundColor: c.secondary }]}
                  onPress={() => void unarchive(item)}
                  hitSlop={6}
                >
                  <Ionicons name="arrow-up-circle-outline" size={16} color={c.foreground} />
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(12) }}>
                    Unarchive
                  </Text>
                </Touchable>
              </Touchable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 2,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTop: { flexDirection: "row", alignItems: "center" },
  unarchiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
});
