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
  useListPages,
  useCreatePage,
  getListPagesQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function PagesScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { data: pages, isLoading } = useListPages();
  const createPage = useCreatePage();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createPage.mutate(
      {
        data: {
          name: name.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: (page) => {
          qc.invalidateQueries({ queryKey: getListPagesQueryKey() });
          setOpen(false);
          setName("");
          setCategory("");
          setDescription("");
          router.push(`/pages/${page.id}`);
        },
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Pages",
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
          data={pages ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No pages found.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push(`/pages/${item.id}`)}
            >
              <View style={[styles.avatar, { backgroundColor: c.secondary }]}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Ionicons name="document-text" size={24} color={c.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.cardSub, { color: c.mutedForeground }]} numberOfLines={1}>
                  {item.category || "General"}
                </Text>
                <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>
                  {item.followerCount} followers
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Create Page</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Page name"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary }]}
            />
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Business, Community"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.secondary }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this page about?"
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
                disabled={!name.trim() || createPage.isPending}
              >
                {createPage.isPending ? (
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
    width: 60,
    height: 60,
    borderRadius: 30,
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
