import { useMemo, useState } from "react";
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
  useUpdateComment,
  useDeleteComment,
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
import { CommentActionsSheet } from "@/components/CommentActions";
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
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
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
  const [actionsFor, setActionsFor] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    () => new Set(),
  );
  const { user } = useAuth();
  const { actingPage } = useActingPage();

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
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const setCommentReaction = useSetCommentReaction();
  const removeCommentReaction = useRemoveCommentReaction();

  const invalidateComments = () => {
    qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
    qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
  };

  const startEdit = (item: Comment) => {
    setReplyTo(null);
    setEditing(item);
    setText(item.content);
  };

  const confirmDelete = (item: Comment) => {
    Alert.alert("Delete comment?", "This comment will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteComment.mutate(
            { id: item.id },
            { onSuccess: invalidateComments },
          ),
      },
    ]);
  };

  const openProfile = (author: Profile) => {
    router.push(`/profile/${author.id}`);
  };

  const openCommentAuthor = (comment: Comment) => {
    if (comment.authorPage) {
      router.push(`/pages/${comment.authorPage.id}`);
    } else {
      openProfile(comment.author);
    }
  };

  const toggleReplies = (parentId: number) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const reactToComment = (item: Comment, type: ReactionType) => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
    };
    if (item.viewerReaction === type) {
      removeCommentReaction.mutate({ id: item.id }, { onSuccess: invalidate });
    } else {
      setCommentReaction.mutate(
        { id: item.id, data: { type, pageId: actingPage?.id } },
        { onSuccess: invalidate },
      );
    }
  };

  const onShare = () => {
    if (!Number.isFinite(postId)) return;
    setShareOpen(true);
  };

  const startReply = (item: Comment) => {
    const wasEditing = editing != null;
    setEditing(null);
    setReplyTo({ parentId: item.parentId ?? item.id, author: item.author });
    setText((prev) =>
      wasEditing || prev.trim().length === 0
        ? `${mentionToken(item.author)} `
        : prev,
    );
  };

  const send = () => {
    const content = text.trim();
    if (!content || !Number.isFinite(postId)) return;
    if (editing) {
      const id = editing.id;
      setText("");
      setEditing(null);
      updateComment.mutate(
        { id, data: { content } },
        { onSuccess: invalidateComments },
      );
      return;
    }
    const parentId = replyTo?.parentId;
    setText("");
    setReplyTo(null);
    createComment.mutate(
      {
        id: postId,
        data: {
          content,
          ...(parentId != null ? { parentId } : {}),
          ...(actingPage ? { pageId: actingPage.id } : {}),
        },
      },
      { onSuccess: invalidateComments },
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
            renderItem={({ item }) => {
              const replies = repliesByParent.get(item.id) ?? [];
              const expanded = expandedReplies.has(item.id);
              return (
                <View style={styles.commentRow}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable onPress={() => openCommentAuthor(item)} hitSlop={4}>
                      <Avatar uri={item.authorPage ? item.authorPage.avatarUrl : item.author.avatarUrl} name={item.authorPage ? item.authorPage.name : item.author.displayName} size={34} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Pressable
                        onLongPress={() => setActionsFor(item)}
                        delayLongPress={300}
                        style={[styles.bubble, { backgroundColor: c.secondary }]}
                      >
                        <Text
                          onPress={() => openCommentAuthor(item)}
                          style={{
                            color: c.foreground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 13,
                          }}
                        >
                          {item.authorPage ? item.authorPage.name : item.author.displayName}
                        </Text>
                        <MentionText
                          content={item.content}
                          style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}
                        />
                      </Pressable>
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
                      {replies.length > 0 && !expanded && (
                        <Pressable
                          onPress={() => toggleReplies(item.id)}
                          hitSlop={6}
                          style={{ marginTop: 8, marginLeft: 6 }}
                        >
                          <Text
                            style={{
                              color: c.mutedForeground,
                              fontSize: 12,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            View {replies.length}{" "}
                            {replies.length === 1 ? "reply" : "replies"}
                          </Text>
                        </Pressable>
                      )}
                      {replies.length > 0 && expanded && (
                        <View style={[styles.replies, { borderLeftColor: c.border }]}>
                          {replies.map((r) => (
                            <View key={r.id} style={{ flexDirection: "row", gap: 8 }}>
                              <Pressable onPress={() => openCommentAuthor(r)} hitSlop={4}>
                                <Avatar
                                  uri={r.authorPage ? r.authorPage.avatarUrl : r.author.avatarUrl}
                                  name={r.authorPage ? r.authorPage.name : r.author.displayName}
                                  size={28}
                                />
                              </Pressable>
                              <View style={{ flex: 1 }}>
                                <Pressable
                                  onLongPress={() => setActionsFor(r)}
                                  delayLongPress={300}
                                  style={[styles.bubble, { backgroundColor: c.secondary }]}
                                >
                                  <Text
                                    onPress={() => openCommentAuthor(r)}
                                    style={{
                                      color: c.foreground,
                                      fontFamily: "Inter_600SemiBold",
                                      fontSize: 13,
                                    }}
                                  >
                                    {r.authorPage ? r.authorPage.name : r.author.displayName}
                                  </Text>
                                  <MentionText
                                    content={r.content}
                                    style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}
                                  />
                                </Pressable>
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
                          <Pressable
                            onPress={() => toggleReplies(item.id)}
                            hitSlop={6}
                          >
                            <Text
                              style={{
                                color: c.mutedForeground,
                                fontSize: 12,
                                fontFamily: "Inter_600SemiBold",
                              }}
                            >
                              Hide replies
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
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
            {editing && (
              <View style={styles.replyBanner}>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  Editing comment
                </Text>
                <Pressable
                  onPress={() => {
                    setEditing(null);
                    setText("");
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={c.mutedForeground} />
                </Pressable>
              </View>
            )}
            {!editing && replyTo && (
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

      <CommentActionsSheet
        comment={actionsFor}
        visible={actionsFor != null}
        canModify={!!user && actionsFor?.author.id === user.id}
        onClose={() => setActionsFor(null)}
        onReply={startReply}
        onEdit={startEdit}
        onDelete={confirmDelete}
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
