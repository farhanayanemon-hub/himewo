import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetFeed,
  getGetFeedQueryKey,
  type Post,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { StoryBar } from "@/components/StoryBar";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activePost, setActivePost] = useState<number | null>(null);

  const { data, isLoading, isRefetching, refetch } = useGetFeed();
  const posts = (data ?? []) as Post[];

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    refetch();
  }, [qc, refetch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.brand, { color: c.primary }]}>HiMewo</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => router.push("/search")}
          >
            <Ionicons name="search" size={20} color={c.foreground} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => router.push("/messages")}
          >
            <Ionicons name="chatbubbles" size={20} color={c.foreground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ListHeaderComponent={
            <>
              <StoryBar />
              <Pressable
                style={[styles.composer, { backgroundColor: c.card }]}
                onPress={() => router.push("/create-post")}
              >
                <Avatar uri={user?.avatarUrl} name={user?.displayName} size={40} />
                <View style={[styles.composerInput, { backgroundColor: c.secondary }]}>
                  <Text style={{ color: c.mutedForeground }}>What's on your mind?</Text>
                </View>
                <Ionicons name="images" size={24} color="#31a24c" />
              </Pressable>
            </>
          }
          renderItem={({ item }) => (
            <PostCard post={item} onComment={() => setActivePost(item.id)} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="newspaper-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No posts yet. Be the first to share something!
              </Text>
            </View>
          }
        />
      )}

      <CommentsSheet
        postId={activePost}
        visible={activePost != null}
        onClose={() => setActivePost(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { fontFamily: "Inter_700Bold", fontSize: 26 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 8,
  },
  composerInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
