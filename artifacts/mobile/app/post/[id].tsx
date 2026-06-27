import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPost,
  useListComments,
  useCreateComment,
  useSharePost,
  getGetPostQueryKey,
  getGetFeedQueryKey,
  getListCommentsQueryKey,
  type Comment,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";

export default function PostDetailScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);

  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const {
    data: post,
    isLoading: postLoading,
  } = useGetPost(postId, {
    query: {
      enabled: Number.isFinite(postId),
      queryKey: getGetPostQueryKey(postId),
    },
  });

  const { data: commentsData, isLoading: commentsLoading } = useListComments(
    postId,
    undefined,
    {
      query: {
        enabled: Number.isFinite(postId),
        queryKey: getListCommentsQueryKey(postId),
      },
    },
  );
  const comments = (commentsData ?? []) as Comment[];

  const createComment = useCreateComment();
  const sharePost = useSharePost();

  const onShare = () => {
    if (!Number.isFinite(postId)) return;
    sharePost.mutate(
      { id: postId, data: {} },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
          Alert.alert("Shared", "This post has been shared to your timeline.");
        },
        onError: () => Alert.alert("Error", "Could not share this post."),
      },
    );
  };

  const send = () => {
    const content = text.trim();
    if (!content || !Number.isFinite(postId)) return;
    setText("");
    createComment.mutate(
      { id: postId, data: { content } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
          qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
          qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        },
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={10}
      >
        {postLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
        ) : !post ? (
          <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
            <Ionicons name="alert-circle-outline" size={48} color={c.mutedForeground} />
            <Text style={{ color: c.mutedForeground, marginTop: 12 }}>
              This post could not be found.
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListHeaderComponent={
              <View>
                <PostCard post={post} onShare={onShare} />
                <View style={[styles.commentsHeader, { borderTopColor: c.border }]}>
                  <Text style={[styles.commentsTitle, { color: c.foreground }]}>Comments</Text>
                </View>
                {commentsLoading && (
                  <ActivityIndicator color={c.primary} style={{ marginTop: 20 }} />
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Avatar uri={item.author.avatarUrl} name={item.author.displayName} size={34} />
                <View style={{ flex: 1 }}>
                  <View style={[styles.bubble, { backgroundColor: c.secondary }]}>
                    <Text
                      style={{
                        color: c.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                      }}
                    >
                      {item.author.displayName}
                    </Text>
                    <Text style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}>
                      {item.content}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: c.mutedForeground,
                      fontSize: 11,
                      marginTop: 4,
                      marginLeft: 6,
                    }}
                  >
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              !commentsLoading ? (
                <Text
                  style={{ color: c.mutedForeground, textAlign: "center", marginTop: 24 }}
                >
                  No comments yet. Be the first!
                </Text>
              ) : null
            }
          />
        )}

        <View
          style={[
            styles.inputRow,
            { borderTopColor: c.border, backgroundColor: c.card, paddingBottom: insets.bottom + 8 },
          ]}
        >
          <Pressable onPress={() => setEmojiOpen(true)} hitSlop={8}>
            <Ionicons name="happy-outline" size={24} color={c.mutedForeground} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a comment..."
            placeholderTextColor={c.mutedForeground}
            style={[styles.input, { backgroundColor: c.secondary, color: c.foreground }]}
            multiline
          />
          <Pressable onPress={send} disabled={!text.trim()} hitSlop={8}>
            <Ionicons
              name="send"
              size={22}
              color={text.trim() ? c.primary : c.mutedForeground}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setText((t) => t + e)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 24 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 18 },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentsTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  commentRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 14 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
});
