import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  useSetCommentReaction,
  useRemoveCommentReaction,
  getGetPostQueryKey,
  getGetFeedQueryKey,
  getListCommentsQueryKey,
  type Comment,
  type Profile,
  type ReactionType,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { ShareSheet } from "@/components/ShareSheet";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { ReactionBar } from "@/components/ReactionBar";
import {
  MentionText,
  MentionSuggestions,
  activeMentionQuery,
  insertMention,
  mentionToken,
} from "@/components/Mention";
import { reactionConfig } from "@/constants/reactions";
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
  const [shareOpen, setShareOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    parentId: number;
    author: Profile;
  } | null>(null);

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

  const mentionQuery = activeMentionQuery(text);

  const { topLevel, repliesByParent } = useMemo(() => {
    const topLevel: Comment[] = [];
    const repliesByParent = new Map<number, Comment[]>();
    for (const item of comments) {
      if (item.parentId == null) {
        topLevel.push(item);
      } else {
        const list = repliesByParent.get(item.parentId) ?? [];
        list.push(item);
        repliesByParent.set(item.parentId, list);
      }
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  const createComment = useCreateComment();
  const setCommentReaction = useSetCommentReaction();
  const removeCommentReaction = useRemoveCommentReaction();

  const reactToComment = (item: Comment, type: ReactionType) => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
    };
    if (item.viewerReaction === type) {
      removeCommentReaction.mutate({ id: item.id }, { onSuccess: invalidate });
    } else {
      setCommentReaction.mutate(
        { id: item.id, data: { type } },
        { onSuccess: invalidate },
      );
    }
  };

  const onShare = () => {
    if (!Number.isFinite(postId)) return;
    setShareOpen(true);
  };

  const startReply = (item: Comment) => {
    setReplyTo({ parentId: item.parentId ?? item.id, author: item.author });
    setText((prev) =>
      prev.trim().length === 0 ? `${mentionToken(item.author)} ` : prev,
    );
  };

  const send = () => {
    const content = text.trim();
    if (!content || !Number.isFinite(postId)) return;
    const parentId = replyTo?.parentId;
    setText("");
    setReplyTo(null);
    createComment.mutate(
      {
        id: postId,
        data: { content, ...(parentId != null ? { parentId } : {}) },
      },
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
        ) : post.commentsEnabled === false ? (
          <FlatList
            data={[]}
            keyExtractor={() => "none"}
            renderItem={null}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListHeaderComponent={
              <View>
                <PostCard post={post} onShare={onShare} />
                <View style={[styles.commentsHeader, { borderTopColor: c.border }]}>
                  <Text style={[styles.commentsTitle, { color: c.foreground }]}>Comments</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 6 }}>
                    Comments are turned off for this post.
                  </Text>
                </View>
              </View>
            }
          />
        ) : (
          <FlatList
            data={topLevel}
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
                <View style={{ flexDirection: "row", gap: 8 }}>
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
                      <MentionText
                        content={item.content}
                        style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}
                      />
                    </View>
                    <View style={styles.commentFooter}>
                      <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                        {timeAgo(item.createdAt)}
                      </Text>
                      <ReactionBar
                        size="sm"
                        viewerReaction={item.viewerReaction ?? null}
                        onReact={(t) => reactToComment(item, t)}
                      />
                      <Pressable onPress={() => startReply(item)} hitSlop={6}>
                        <Text
                          style={{
                            color: c.mutedForeground,
                            fontSize: 11,
                            fontFamily: "Inter_600SemiBold",
                          }}
                        >
                          Reply
                        </Text>
                      </Pressable>
                      {item.reactionCount > 0 && (
                        <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                          {item.viewerReaction
                            ? reactionConfig[item.viewerReaction].emoji
                            : "👍"}{" "}
                          {item.reactionCount}
                        </Text>
                      )}
                    </View>
                    {(repliesByParent.get(item.id) ?? []).length > 0 && (
                      <View style={[styles.replies, { borderLeftColor: c.border }]}>
                        {(repliesByParent.get(item.id) ?? []).map((r) => (
                          <View key={r.id} style={{ flexDirection: "row", gap: 8 }}>
                            <Avatar
                              uri={r.author.avatarUrl}
                              name={r.author.displayName}
                              size={28}
                            />
                            <View style={{ flex: 1 }}>
                              <View style={[styles.bubble, { backgroundColor: c.secondary }]}>
                                <Text
                                  style={{
                                    color: c.foreground,
                                    fontFamily: "Inter_600SemiBold",
                                    fontSize: 13,
                                  }}
                                >
                                  {r.author.displayName}
                                </Text>
                                <MentionText
                                  content={r.content}
                                  style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}
                                />
                              </View>
                              <View style={styles.commentFooter}>
                                <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                                  {timeAgo(r.createdAt)}
                                </Text>
                                <ReactionBar
                                  size="sm"
                                  viewerReaction={r.viewerReaction ?? null}
                                  onReact={(t) => reactToComment(r, t)}
                                />
                                <Pressable onPress={() => startReply(r)} hitSlop={6}>
                                  <Text
                                    style={{
                                      color: c.mutedForeground,
                                      fontSize: 11,
                                      fontFamily: "Inter_600SemiBold",
                                    }}
                                  >
                                    Reply
                                  </Text>
                                </Pressable>
                                {r.reactionCount > 0 && (
                                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                                    {r.viewerReaction
                                      ? reactionConfig[r.viewerReaction].emoji
                                      : "👍"}{" "}
                                    {r.reactionCount}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
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

        {post?.commentsEnabled === false ? (
          <View
            style={[
              styles.disabledRow,
              { borderTopColor: c.border, backgroundColor: c.card, paddingBottom: insets.bottom + 8 },
            ]}
          >
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              Comments are turned off for this post.
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: c.card }}>
            {mentionQuery && (
              <MentionSuggestions
                query={mentionQuery}
                onSelect={(p) => setText((prev) => insertMention(prev, p))}
              />
            )}
            {replyTo && (
              <View style={styles.replyBanner}>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  Replying to{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: c.foreground }}>
                    {replyTo.author.displayName}
                  </Text>
                </Text>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={c.mutedForeground} />
                </Pressable>
              </View>
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
                placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
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
          </View>
        )}
      </KeyboardAvoidingView>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setText((t) => t + e)}
      />

      <ShareSheet
        postId={Number.isFinite(postId) ? postId : null}
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
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
  commentRow: { paddingHorizontal: 14, marginBottom: 14 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  replies: {
    marginTop: 10,
    gap: 10,
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginLeft: 6,
  },
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
    minWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  disabledRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
