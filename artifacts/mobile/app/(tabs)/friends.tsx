import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListFriends,
  useListFriendRequests,
  useGetFriendSuggestions,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useSendFriendRequest,
  getListFriendsQueryKey,
  getListFriendRequestsQueryKey,
  getGetFriendSuggestionsQueryKey,
  type FriendRequest,
  type Profile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

export default function FriendsScreen() {
  const c = useColors();
  const qc = useQueryClient();

  const requests = useListFriendRequests();
  const suggestions = useGetFriendSuggestions();
  const friends = useListFriends();

  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const sendRequest = useSendFriendRequest();

  const requestList = (requests.data ?? []) as FriendRequest[];
  const suggestionList = (suggestions.data ?? []) as Profile[];
  const friendList = (friends.data ?? []) as Profile[];

  const isLoading =
    requests.isLoading || suggestions.isLoading || friends.isLoading;
  const isRefetching =
    requests.isRefetching || suggestions.isRefetching || friends.isRefetching;

  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetFriendSuggestionsQueryKey() });
    qc.invalidateQueries({ queryKey: getListFriendsQueryKey() });
  }, [qc]);

  const onRefresh = useCallback(() => {
    refreshAll();
    requests.refetch();
    suggestions.refetch();
    friends.refetch();
  }, [refreshAll, requests, suggestions, friends]);

  const handleAccept = (id: number) => {
    acceptRequest.mutate({ id }, { onSuccess: refreshAll });
  };
  const handleDecline = (id: number) => {
    declineRequest.mutate({ id }, { onSuccess: refreshAll });
  };
  const handleAdd = (addresseeId: string) => {
    sendRequest.mutate(
      { data: { addresseeId } },
      { onSuccess: refreshAll },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View
        style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>Friends</Text>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: c.secondary }]}
          onPress={() => router.push("/search")}
        >
          <Ionicons name="search" size={20} color={c.foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
        >
          {requestList.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                Friend Requests
              </Text>
              {requestList.map((req) => (
                <View
                  key={req.id}
                  style={[styles.row, { backgroundColor: c.card }]}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => router.push(`/profile/${req.requester.id}`)}
                  >
                    <Avatar
                      uri={req.requester.avatarUrl}
                      name={req.requester.displayName}
                      size={52}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.name, { color: c.foreground }]}
                        numberOfLines={1}
                      >
                        {req.requester.displayName}
                      </Text>
                      <Text
                        style={{ color: c.mutedForeground, fontSize: 13 }}
                        numberOfLines={1}
                      >
                        @{req.requester.username}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.actionsCol}>
                    <Pressable
                      style={[styles.primaryBtn, { backgroundColor: c.primary }]}
                      onPress={() => handleAccept(req.id)}
                    >
                      <Text
                        style={[styles.primaryBtnText, { color: c.primaryForeground }]}
                      >
                        Confirm
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryBtn, { backgroundColor: c.secondary }]}
                      onPress={() => handleDecline(req.id)}
                    >
                      <Text
                        style={[
                          styles.secondaryBtnText,
                          { color: c.secondaryForeground },
                        ]}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {suggestionList.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                People You May Know
              </Text>
              {suggestionList.map((person) => (
                <View
                  key={person.id}
                  style={[styles.row, { backgroundColor: c.card }]}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => router.push(`/profile/${person.id}`)}
                  >
                    <Avatar
                      uri={person.avatarUrl}
                      name={person.displayName}
                      size={52}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.name, { color: c.foreground }]}
                        numberOfLines={1}
                      >
                        {person.displayName}
                      </Text>
                      <Text
                        style={{ color: c.mutedForeground, fontSize: 13 }}
                        numberOfLines={1}
                      >
                        @{person.username}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.addBtn, { backgroundColor: c.primary }]}
                    onPress={() => handleAdd(person.id)}
                    disabled={person.viewerHasPendingRequest ?? false}
                  >
                    <Ionicons
                      name="person-add"
                      size={16}
                      color={c.primaryForeground}
                    />
                    <Text
                      style={[styles.primaryBtnText, { color: c.primaryForeground }]}
                    >
                      {person.viewerHasPendingRequest ? "Sent" : "Add Friend"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              All Friends
            </Text>
            {friendList.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: 24, paddingHorizontal: 20 }}>
                <Ionicons name="people-outline" size={44} color={c.mutedForeground} />
                <Text
                  style={{ color: c.mutedForeground, marginTop: 10, textAlign: "center" }}
                >
                  No friends yet. Add some people you know!
                </Text>
              </View>
            ) : (
              friendList.map((friend) => (
                <View
                  key={friend.id}
                  style={[styles.row, { backgroundColor: c.card }]}
                >
                  <Pressable
                    style={styles.rowMain}
                    onPress={() => router.push(`/profile/${friend.id}`)}
                  >
                    <Avatar
                      uri={friend.avatarUrl}
                      name={friend.displayName}
                      size={52}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.name, { color: c.foreground }]}
                        numberOfLines={1}
                      >
                        {friend.displayName}
                      </Text>
                      <Text
                        style={{ color: c.mutedForeground, fontSize: 13 }}
                        numberOfLines={1}
                      >
                        @{friend.username}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.msgBtn, { backgroundColor: c.secondary }]}
                    onPress={() => router.push("/messages")}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={18}
                      color={c.foreground}
                    />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: 12 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  actionsCol: { gap: 6 },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  msgBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
