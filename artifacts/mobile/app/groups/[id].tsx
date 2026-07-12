import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGroup,
  useGetGroupPosts,
  useJoinGroup,
  useLeaveGroup,
  useInviteToGroup,
  useListFriends,
  getListGroupsQueryKey,
  getGetGroupQueryKey,
  getListGroupInvitesQueryKey,
  getListFriendsQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";

function InviteFriendsModal({
  visible,
  onClose,
  onInvite,
  isPending,
  groupName,
}: {
  visible: boolean;
  onClose: () => void;
  onInvite: (userIds: string[]) => void;
  isPending: boolean;
  groupName: string;
}) {
  const c = useColors();
  const { data: friends, isLoading } = useListFriends({
    query: { enabled: visible, queryKey: getListFriendsQueryKey() },
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) setSelected(new Set());
  }, [visible]);

  const toggle = (fid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  const submit = () => {
    if (selected.size === 0) return;
    onInvite(Array.from(selected));
  };

  const list = (friends ?? []) as Profile[];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>Invite friends</Text>
          <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 10 }}>
            Invite friends to join {groupName}.
          </Text>
          {isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
          ) : list.length === 0 ? (
            <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, paddingVertical: 16 }}>
              You have no friends to invite yet.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
              {list.map((f) => {
                const checked = selected.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    style={[styles.memberRow, { borderColor: c.border }]}
                    onPress={() => toggle(f.id)}
                  >
                    <View style={[styles.rowAvatar, { backgroundColor: c.secondary }]}>
                      {f.avatarUrl ? (
                        <Image source={{ uri: f.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Ionicons name="person" size={18} color={c.mutedForeground} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }} numberOfLines={1}>
                        {f.displayName}
                      </Text>
                      <Text style={{ color: c.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
                        @{f.username}
                      </Text>
                    </View>
                    <Ionicons
                      name={checked ? "checkbox" : "square-outline"}
                      size={22}
                      color={checked ? c.primary : c.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, { backgroundColor: c.secondary }]} onPress={onClose}>
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: selected.size > 0 ? c.primary : c.secondary }]}
              onPress={submit}
              disabled={selected.size === 0 || isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: selected.size > 0 ? "#fff" : c.mutedForeground, fontFamily: "Inter_700Bold" }}>
                  {selected.size > 0 ? `Invite (${selected.size})` : "Invite"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function GroupDetailScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);

  const { data: group, isLoading } = useGetGroup(id);
  const { data: posts, isLoading: postsLoading } = useGetGroupPosts(id);
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const inviteToGroup = useInviteToGroup();

  const [inviteOpen, setInviteOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetGroupQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() });
  };

  const handleMembership = () => {
    if (!group) return;
    if (group.viewerIsMember) {
      leaveGroup.mutate({ id }, { onSuccess: invalidate });
    } else {
      joinGroup.mutate({ id }, { onSuccess: invalidate });
    }
  };

  const handleInvite = (userIds: string[]) => {
    inviteToGroup.mutate(
      { id, data: { userIds } },
      {
        onSuccess: () => {
          setInviteOpen(false);
          Alert.alert("Invites sent", "Your friends have been invited to join this group.");
        },
        onError: () => Alert.alert("Could not send invites", "Please try again."),
      },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: "Group" }} />
        <ActivityIndicator color={c.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: "Group" }} />
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>Group not found</Text>
      </SafeAreaView>
    );
  }

  const busy = joinGroup.isPending || leaveGroup.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: group.name }} />
      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.cover, { backgroundColor: c.secondary }]}>
              {group.coverUrl ? (
                <Image source={{ uri: group.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : null}
            </View>
            <View style={{ padding: 16 }}>
              <Text style={[styles.name, { color: c.foreground }]}>{group.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="people" size={14} color={c.mutedForeground} />
                <Text style={[styles.meta, { color: c.mutedForeground }]}>
                  {group.privacy} group · {group.memberCount} members
                </Text>
              </View>
              {group.description ? (
                <Text style={[styles.desc, { color: c.foreground }]}>{group.description}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  style={[
                    styles.joinBtn,
                    { flex: 1, backgroundColor: group.viewerIsMember ? c.secondary : c.primary },
                  ]}
                  onPress={handleMembership}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={group.viewerIsMember ? c.foreground : "#fff"} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: group.viewerIsMember ? c.foreground : "#fff",
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {group.viewerIsMember ? "Joined" : "Join Group"}
                    </Text>
                  )}
                </Pressable>
                {group.viewerIsMember ? (
                  <Pressable
                    style={[styles.joinBtn, styles.inviteBtn, { backgroundColor: c.secondary }]}
                    onPress={() => setInviteOpen(true)}
                  >
                    <Ionicons name="person-add-outline" size={18} color={c.foreground} />
                    <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold" }}>Invite</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Discussion</Text>
          </View>
        }
        ListEmptyComponent={
          postsLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
          ) : (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>
              No posts yet. Start the discussion!
            </Text>
          )
        }
        renderItem={({ item }) => <PostCard post={item} />}
      />

      <InviteFriendsModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        isPending={inviteToGroup.isPending}
        groupName={group.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cover: { height: 150 },
  name: { fontFamily: "Inter_800ExtraBold", fontSize: 24 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  meta: { fontFamily: "Inter_500Medium", fontSize: 13 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 15, marginTop: 10, lineHeight: 21 },
  joinBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  inviteBtn: { flexDirection: "row", gap: 6, paddingHorizontal: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, paddingHorizontal: 16, paddingBottom: 8 },
  empty: { textAlign: "center", marginTop: 24, fontFamily: "Inter_500Medium" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 19, marginBottom: 4 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
