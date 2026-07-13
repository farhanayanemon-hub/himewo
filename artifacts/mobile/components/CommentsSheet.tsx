import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useSetCommentReaction,
  useRemoveCommentReaction,
  getListCommentsQueryKey,
  getGetFeedQueryKey,
  getGetPostQueryKey,
  type Comment,
  type Profile,
  type ReactionType,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { CommentActionsSheet } from "@/components/CommentActions";
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

interface CommentsSheetProps {
  postId: number | null;
  visible: boolean;
  onClose: () => void;
}

interface ReplyTarget {
  parentId: number;
  author: Profile;
}

export function CommentsSheet({ postId, visible, onClose }: CommentsSheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [actionsFor, setActionsFor] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    () => new Set(),
  );
  const { user } = useAuth();
  const { actingPage } = useActingPage();

  const { data, isLoading } = useListComments(postId ?? 0, undefined, {
    query: {
      enabled: visible && postId != null,
      queryKey: getListCommentsQueryKey(postId ?? 0),
    },
  });
  const comments = (data ?? []) as Comment[];
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const setReaction = useSetCommentReaction();
  const removeReaction = useRemoveCommentReaction();

  const invalidateComments = () => {
    if (postId != null) {
      qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
      qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    }
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

  const openProfile = (authorId: string) => {
    onClose();
    router.push(`/profile/${authorId}`);
  };

  const openCommentAuthor = (comment: Comment) => {
    if (comment.authorPage) {
      onClose();
      router.push(`/pages/${comment.authorPage.id}`);
    } else {
      openProfile(comment.author.id);
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

  const reactToComment = (item: Comment, type: ReactionType) => {
    const invalidate = () => {
      if (postId != null) {
        qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
      }
    };
    if (item.viewerReaction === type) {
      removeReaction.mutate({ id: item.id }, { onSuccess: invalidate });
    } else {
      setReaction.mutate({ id: item.id, data: { type, pageId: actingPage?.id } }, { onSuccess: invalidate });
    }
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
    if (!content || postId == null) return;
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
      { id: postId, data: { content, ...(parentId != null ? { parentId } : {}), ...(actingPage ? { pageId: actingPage.id } : {}) } },
      { onSuccess: invalidateComments },
    );
  };

  const renderComment = (item: Comment, isReply: boolean) => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Pressable onPress={() => openCommentAuthor(item)} hitSlop={4}>
        <Avatar
          uri={item.authorPage ? item.authorPage.avatarUrl : item.author.avatarUrl}
          name={item.authorPage ? item.authorPage.name : item.author.displayName}
          size={isReply ? 28 : 34}
        />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Pressable
          onLongPress={() => setActionsFor(item)}
          delayLongPress={300}
          style={[styles.bubble, { backgroundColor: c.secondary }]}
        >
          <Text
            onPress={() => openCommentAuthor(item)}
            style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}
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
              style={{ color: c.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}
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
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Text style={[styles.title, { color: c.foreground }]}>Comments</Text>

          {isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={topLevel}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 14, gap: 14 }}
              ListEmptyComponent={
                <Text style={{ color: c.mutedForeground, textAlign: "center", marginTop: 30 }}>
                  No comments yet. Be the first!
                </Text>
              }
              renderItem={({ item }) => {
                const replies = repliesByParent.get(item.id) ?? [];
                const expanded = expandedReplies.has(item.id);
                return (
                  <View>
                    {renderComment(item, false)}
                    {replies.length > 0 && !expanded && (
                      <Pressable
                        onPress={() => toggleReplies(item.id)}
                        hitSlop={6}
                        style={{ marginTop: 8, marginLeft: 48 }}
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
                      <View
                        style={[styles.replies, { borderLeftColor: c.border }]}
                      >
                        {replies.map((r) => (
                          <View key={r.id}>{renderComment(r, true)}</View>
                        ))}
                        <Pressable onPress={() => toggleReplies(item.id)} hitSlop={6}>
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
                );
              }}
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={10}
          >
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
                { borderTopColor: c.border, paddingBottom: insets.bottom + 8 },
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
                underlineColorAndroid="transparent"
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
        </View>
      </View>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setText((t) => t + e)}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0006" },
  sheet: { height: "82%", borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  title: { textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16, paddingVertical: 10 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  commentFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginLeft: 6,
  },
  replies: {
    marginTop: 10,
    marginLeft: 42,
    gap: 10,
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 4,
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
    fontSize: 16,
  },
});
