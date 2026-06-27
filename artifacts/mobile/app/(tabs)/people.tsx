import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFriends,
  useCreateConversation,
  getListConversationsQueryKey,
  ConversationInputType,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { StoryBar } from "@/components/StoryBar";
import { useRealtime } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { lastActiveLabel } from "@/lib/format";

export default function PeopleScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { isOnline } = useRealtime();
  const { data, isLoading } = useListFriends();
  const friends = (data ?? []) as Profile[];
  const createConversation = useCreateConversation();
  const [busy, setBusy] = useState(false);

  const isActive = (f: Profile) =>
    isOnline(f.id) || f.presence?.status === "online";

  const sorted = [...friends].sort(
    (a, b) => Number(isActive(b)) - Number(isActive(a)),
  );

  const openChat = async (id: string) => {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Text style={[styles.title, { color: c.foreground }]}>People</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              <Text style={[styles.section, { color: c.mutedForeground }]}>STORIES</Text>
              <StoryBar />
              <Text style={[styles.section, { color: c.mutedForeground }]}>FRIENDS</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = isActive(item);
            return (
              <Touchable
                style={[styles.row, { borderBottomColor: c.border }]}
                onPress={() => openChat(item.id)}
                disabled={busy}
              >
                <Avatar uri={item.avatarUrl} name={item.displayName} size={52} online={active} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(16) }}
                  >
                    {item.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(13), marginTop: 2 }}>
                    {active
                      ? "Active now"
                      : item.presence?.lastSeenAt
                        ? lastActiveLabel(item.presence.lastSeenAt)
                        : `@${item.username}`}
                  </Text>
                </View>
                <Ionicons name="chatbubble-outline" size={20} color={c.mutedForeground} />
              </Touchable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 20 }}>
              <Ionicons name="people-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No friends yet.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 2,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: fs(22) },
  section: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fs(12),
    letterSpacing: 0.5,
    marginLeft: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
