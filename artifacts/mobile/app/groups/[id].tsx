import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
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
  getListGroupsQueryKey,
  getGetGroupQueryKey,
} from "@workspace/api-client-react";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";

export default function GroupDetailScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);

  const { data: group, isLoading } = useGetGroup(id);
  const { data: posts, isLoading: postsLoading } = useGetGroupPosts(id);
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetGroupQueryKey(id) });
  };

  const handleMembership = () => {
    if (!group) return;
    if (group.viewerIsMember) {
      leaveGroup.mutate({ id }, { onSuccess: invalidate });
    } else {
      joinGroup.mutate({ id }, { onSuccess: invalidate });
    }
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
              <Pressable
                style={[
                  styles.joinBtn,
                  { backgroundColor: group.viewerIsMember ? c.secondary : c.primary },
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
  joinBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, paddingHorizontal: 16, paddingBottom: 8 },
  empty: { textAlign: "center", marginTop: 24, fontFamily: "Inter_500Medium" },
});
