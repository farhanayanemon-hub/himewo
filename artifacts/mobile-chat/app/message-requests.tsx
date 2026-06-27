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
  useListFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  getListFriendRequestsQueryKey,
  getListFriendsQueryKey,
  type FriendRequest,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

export default function MessageRequestsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { data, isLoading } = useListFriendRequests();
  const requests = (data ?? []) as FriendRequest[];
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
    qc.invalidateQueries({ queryKey: getListFriendsQueryKey() });
  };

  const onAccept = async (id: number) => {
    await accept.mutateAsync({ id });
    refresh();
  };

  const onDecline = async (id: number) => {
    await decline.mutateAsync({ id });
    refresh();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Message requests
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const p = item.requester;
            return (
              <View style={[styles.row, { borderBottomColor: c.border }]}>
                <Avatar uri={p.avatarUrl} name={p.displayName} size={52} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}
                  >
                    {p.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                    wants to connect
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.accept, { backgroundColor: c.primary }]}
                    onPress={() => onAccept(item.id)}
                    disabled={accept.isPending}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Accept
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.decline, { backgroundColor: c.secondary }]}
                    onPress={() => onDecline(item.id)}
                    disabled={decline.isPending}
                  >
                    <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No message requests right now.
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { gap: 6, alignItems: "stretch" },
  accept: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  decline: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
});
