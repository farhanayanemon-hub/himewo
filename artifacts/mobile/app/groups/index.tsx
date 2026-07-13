import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGroups,
  useCreateGroup,
  useListGroupInvites,
  useJoinGroup,
  useDeclineGroupInvite,
  getListGroupsQueryKey,
  getListGroupInvitesQueryKey,
  type Group,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function GroupsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ create?: string }>();
  const { data: groups, isLoading } = useListGroups();
  const { data: invites } = useListGroupInvites();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const declineInvite = useDeclineGroupInvite();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    if (params.create) setOpen(true);
  }, [params.create]);

  const inviteList = (invites ?? []) as Group[];

  const invalidateInvites = () => {
    qc.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() });
    qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createGroup.mutate(
      { data: { name: name.trim(), description: description.trim() || undefined } },
      {
        onSuccess: (group) => {
          qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setOpen(false);
          setName("");
          setDescription("");
          router.push(`/groups/${group.id}`);
        },
      },
    );
  };

  const handleJoinInvite = (groupId: number) => {
    setPendingId(groupId);
    joinGroup.mutate(
      { id: groupId },
      {
        onSuccess: () => {
          invalidateInvites();
          setPendingId(null);
          router.push(`/groups/${groupId}`);
        },
        onError: () => setPendingId(null),
      },
    );
  };

  const handleDeclineInvite = (groupId: number) => {
    setPendingId(groupId);
    declineInvite.mutate(
      { id: groupId },
      {
        onSuccess: () => {
          invalidateInvites();
          setPendingId(null);
        },
        onError: () => setPendingId(null),
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Groups",
          headerRight: () => (
            <Pressable onPress={() => setOpen(true)} hitSlop={8}>
              <Ionicons name="add" size={26} color={c.primary} />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(g) => String(g.id)}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={
            inviteList.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>Invites</Text>
                {inviteList.map((g) => {
                  const busy = pendingId === g.id;
                  return (
                    <View
                      key={g.id}
                      style={[styles.inviteCard, { backgroundColor: c.card, borderColor: c.border }]}
                    >
                      <Pressable
                        style={styles.inviteHead}
                        onPress={() => router.push(`/groups/${g.id}`)}
                      >
                        <View style={[styles.avatar, { backgroundColor: c.secondary, width: 48, height: 48 }]}>
                          {g.avatarUrl ? (
                            <Image source={{ uri: g.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                          ) : (
                            <Ionicons name="people" size={22} color={c.primary} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={1}>
                            {g.name}
                          </Text>
                          <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>
                            {g.privacy} group · {g.memberCount} members
                          </Text>
                        </View>
                      </Pressable>
                      <View style={styles.inviteActions}>
                        <Pressable
                          style={[styles.inviteBtn, { backgroundColor: c.primary }]}
                          onPress={() => handleJoinInvite(g.id)}
                          disabled={busy}
                        >
                          {busy && joinGroup.isPending ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 }}>Join</Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={[styles.inviteBtn, { backgroundColor: c.secondary }]}
                          onPress={() => handleDeclineInvite(g.id)}
                          disabled={busy}
                        >
                          {busy && declineInvite.isPending ? (
                            <ActivityIndicator color={c.foreground} size="small" />
                          ) : (
                            <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 13 }}>Decline</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <Text style={[styles.sectionTitle, { color: c.foreground, marginTop: 8 }]}>Your groups</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No groups found.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push(`/groups/${item.id}`)}
            >
              <View style={[styles.avatar, { backgroundColor: c.secondary }]}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Ionicons name="people" size={28} color={c.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.cardSub, { color: c.mutedForeground }]} numberOfLines={1}>
                  {item.description || "No description"}
                </Text>
                <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>
                  {item.memberCount} members
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Create Group</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this group about?"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              multiline
              style={[styles.input, styles.textarea, { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary }]}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, { backgroundColor: c.secondary }]} onPress={() => setOpen(false)}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { backgroundColor: name.trim() ? c.primary : c.secondary }]}
                onPress={handleCreate}
                disabled={!name.trim() || createGroup.isPending}
              >
                {createGroup.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: name.trim() ? "#fff" : c.mutedForeground, fontFamily: "Inter_700Bold" }}>
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", marginTop: 40, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 8, marginLeft: 2 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    alignItems: "center",
  },
  inviteCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  inviteHead: { flexDirection: "row", gap: 12, alignItems: "center" },
  inviteActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  inviteBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  cardMeta: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  modalCard: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
