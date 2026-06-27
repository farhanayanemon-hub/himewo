import { useState } from "react";
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
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGroups,
  useCreateGroup,
  getListGroupsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function GroupsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useListGroups();
  const createGroup = useCreateGroup();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
          <View style={[styles.modalCard, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Create Group</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this group about?"
              placeholderTextColor={c.mutedForeground}
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
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    alignItems: "center",
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
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
