import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  ReactionType,
  useSetPostReaction,
  useRemovePostReaction,
  useSaveItem,
  useUnsaveItem,
  useUpdatePost,
  useDeletePost,
  getGetFeedQueryKey,
  getGetPostQueryKey,
  getGetUserPostsQueryKey,
  getListSavedItemsQueryKey,
  type Post,
  type ReactionSummary,
  type PostUpdatePrivacy,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { MediaGrid } from "@/components/MediaGrid";
import { BoostSheet } from "@/components/BoostSheet";
import { ReactionBar } from "@/components/ReactionBar";
import { reactionConfig } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { timeAgo, formatCount } from "@/lib/format";

interface PostCardProps {
  post: Post;
  onComment?: () => void;
  onShare?: () => void;
}

function privacyIcon(privacy: string): keyof typeof Ionicons.glyphMap {
  if (privacy === "friends") return "people";
  if (privacy === "private") return "lock-closed";
  return "earth";
}

const privacyOptions: {
  value: PostUpdatePrivacy;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "public", label: "Public", icon: "earth" },
  { value: "friends", label: "Friends", icon: "people" },
  { value: "private", label: "Only me", icon: "lock-closed" },
];

export function PostCard({ post, onComment, onShare }: PostCardProps) {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReactionSummary>(post.reactions);
  const [saved, setSaved] = useState<boolean>(post.viewerHasSaved ?? false);
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(post.commentsEnabled);
  const [reactionsEnabled, setReactionsEnabled] = useState<boolean>(post.reactionsEnabled);
  const [privacy, setPrivacy] = useState<string>(post.privacy);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [draft, setDraft] = useState(post.content);

  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const isOwner = !!user && user.id === post.author.id;
  const canBoost = isOwner && privacy === "public";
  const viewerReaction = summary.viewerReaction ?? null;

  const syncServer = () => {
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
    qc.invalidateQueries({ queryKey: getGetUserPostsQueryKey(post.author.id) });
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    const onSettled = () => {
      syncServer();
      qc.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
    };
    if (next) {
      saveItem.mutate(
        { data: { entityType: "post", entityId: post.id } },
        { onSettled },
      );
    } else {
      unsaveItem.mutate({ entityType: "post", entityId: post.id }, { onSettled });
    }
  };

  const applyReaction = (type: ReactionType) => {
    const prev = viewerReaction;
    if (prev === type) {
      setSummary((s) => ({
        ...s,
        total: Math.max(0, s.total - 1),
        viewerReaction: null,
        byType: { ...s.byType, [type]: Math.max(0, (s.byType[type] ?? 1) - 1) },
      }));
      removeReaction.mutate({ id: post.id }, { onSettled: syncServer });
      return;
    }
    setSummary((s) => {
      const byType = { ...s.byType };
      if (prev) byType[prev] = Math.max(0, (byType[prev] ?? 1) - 1);
      byType[type] = (byType[type] ?? 0) + 1;
      return {
        ...s,
        total: prev ? s.total : s.total + 1,
        viewerReaction: type,
        byType,
      };
    });
    setReaction.mutate({ id: post.id, data: { type } }, { onSettled: syncServer });
  };

  const saveCaption = () => {
    updatePost.mutate(
      { id: post.id, data: { content: draft } },
      {
        onSettled: syncServer,
      },
    );
    setEditOpen(false);
  };

  const toggleComments = () => {
    const next = !commentsEnabled;
    setCommentsEnabled(next);
    setMenuOpen(false);
    updatePost.mutate(
      { id: post.id, data: { commentsEnabled: next } },
      { onSettled: syncServer },
    );
  };

  const toggleReactions = () => {
    const next = !reactionsEnabled;
    setReactionsEnabled(next);
    setMenuOpen(false);
    updatePost.mutate(
      { id: post.id, data: { reactionsEnabled: next } },
      { onSettled: syncServer },
    );
  };

  const changePrivacy = (value: PostUpdatePrivacy) => {
    setPrivacy(value);
    updatePost.mutate(
      { id: post.id, data: { privacy: value } },
      { onSettled: syncServer },
    );
  };

  const confirmDelete = () => {
    setMenuOpen(false);
    Alert.alert("Delete post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deletePost.mutate({ id: post.id }, { onSettled: syncServer }),
      },
    ]);
  };

  const topReactions = Object.entries(summary.byType)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => reactionConfig[t as ReactionType]?.emoji)
    .filter(Boolean);

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable
        style={styles.header}
        onPress={() => router.push(`/profile/${post.author.id}`)}
      >
        <Avatar uri={post.author.avatarUrl} name={post.author.displayName} size={42} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text
              style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}
            >
              {post.author.displayName}
            </Text>
            {post.author.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={c.primary} />
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              {timeAgo(post.createdAt)}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>·</Text>
            <Ionicons name={privacyIcon(privacy)} size={11} color={c.mutedForeground} />
          </View>
        </View>
        <Pressable hitSlop={8} onPress={toggleSave} style={{ marginRight: isOwner ? 4 : 0 }}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={saved ? c.primary : c.mutedForeground}
          />
        </Pressable>
        {isOwner && (
          <Pressable hitSlop={8} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color={c.mutedForeground} />
          </Pressable>
        )}
      </Pressable>

      {post.content.length > 0 && (
        <Pressable onPress={() => router.push(`/post/${post.id}`)}>
          <Text style={[styles.content, { color: c.foreground }]}>{post.content}</Text>
        </Pressable>
      )}

      {post.media.length > 0 && (
        <Pressable onPress={() => router.push(`/post/${post.id}`)}>
          <MediaGrid media={post.media} />
        </Pressable>
      )}

      {((reactionsEnabled && summary.total > 0) ||
        (commentsEnabled && post.commentCount > 0) ||
        post.shareCount > 0) && (
        <View style={styles.statsRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {reactionsEnabled && topReactions.length > 0 && (
              <Text style={{ fontSize: 13 }}>{topReactions.join("")}</Text>
            )}
            {reactionsEnabled && summary.total > 0 && (
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                {formatCount(summary.total)}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {commentsEnabled && post.commentCount > 0 && (
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                {formatCount(post.commentCount)} comments
              </Text>
            )}
            {post.shareCount > 0 && (
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                {formatCount(post.shareCount)} shares
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <View style={styles.actions}>
        {reactionsEnabled && (
          <View style={styles.actionItem}>
            <ReactionBar viewerReaction={viewerReaction} onReact={applyReaction} />
          </View>
        )}
        {commentsEnabled && (
          <Pressable style={styles.actionItem} onPress={onComment} hitSlop={6}>
            <Ionicons name="chatbubble-outline" size={18} color={c.mutedForeground} />
            <Text style={[styles.actionLabel, { color: c.mutedForeground }]}>Comment</Text>
          </Pressable>
        )}
        <Pressable style={styles.actionItem} onPress={onShare} hitSlop={6}>
          <Ionicons name="arrow-redo-outline" size={18} color={c.mutedForeground} />
          <Text style={[styles.actionLabel, { color: c.mutedForeground }]}>Share</Text>
        </Pressable>
      </View>

      {/* Owner menu bottom sheet */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: c.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            <Pressable
              style={styles.row}
              onPress={() => {
                setDraft(post.content);
                setMenuOpen(false);
                setEditOpen(true);
              }}
            >
              <Ionicons name="create-outline" size={22} color={c.foreground} />
              <Text style={[styles.rowLabel, { color: c.foreground }]}>Edit caption</Text>
            </Pressable>

            <Pressable style={styles.row} onPress={toggleComments}>
              <Ionicons
                name={commentsEnabled ? "chatbubble-outline" : "chatbubbles"}
                size={22}
                color={c.foreground}
              />
              <Text style={[styles.rowLabel, { color: c.foreground }]}>
                {commentsEnabled ? "Turn off comments" : "Turn on comments"}
              </Text>
            </Pressable>

            <Pressable style={styles.row} onPress={toggleReactions}>
              <Ionicons
                name={reactionsEnabled ? "heart-outline" : "heart"}
                size={22}
                color={c.foreground}
              />
              <Text style={[styles.rowLabel, { color: c.foreground }]}>
                {reactionsEnabled ? "Turn off likes" : "Turn on likes"}
              </Text>
            </Pressable>

            {canBoost && (
              <Pressable
                style={styles.row}
                onPress={() => {
                  setMenuOpen(false);
                  setBoostOpen(true);
                }}
              >
                <Ionicons name="rocket-outline" size={22} color={c.foreground} />
                <Text style={[styles.rowLabel, { color: c.foreground }]}>Boost post</Text>
              </Pressable>
            )}

            <View style={[styles.sheetDivider, { backgroundColor: c.border }]} />
            <Text style={[styles.sheetLabel, { color: c.mutedForeground }]}>Who can see this</Text>
            {privacyOptions.map((opt) => {
              const active = privacy === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={styles.row}
                  onPress={() => changePrivacy(opt.value)}
                >
                  <Ionicons name={opt.icon} size={22} color={c.foreground} />
                  <Text style={[styles.rowLabel, { color: c.foreground }]}>{opt.label}</Text>
                  {active && (
                    <Ionicons name="checkmark" size={20} color={c.primary} />
                  )}
                </Pressable>
              );
            })}

            <View style={[styles.sheetDivider, { backgroundColor: c.border }]} />
            <Pressable style={styles.row} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={22} color={c.destructive} />
              <Text style={[styles.rowLabel, { color: c.destructive }]}>Delete post</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit caption modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={styles.editBackdrop} onPress={() => setEditOpen(false)}>
          <Pressable
            style={[styles.editCard, { backgroundColor: c.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.editTitle, { color: c.foreground }]}>Edit caption</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder="What's on your mind?"
              placeholderTextColor={c.mutedForeground}
              style={[
                styles.editInput,
                { color: c.foreground, backgroundColor: c.secondary },
              ]}
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editBtn} onPress={() => setEditOpen(false)}>
                <Text style={{ color: c.mutedForeground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.editBtn, styles.editSave, { backgroundColor: c.primary }]}
                onPress={saveCaption}
              >
                <Text style={{ color: c.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {canBoost && (
        <BoostSheet
          type="post"
          id={post.id}
          visible={boostOpen}
          onClose={() => setBoostOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  content: { paddingHorizontal: 14, fontSize: 15, lineHeight: 21, marginBottom: 10 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  actions: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8 },
  actionItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  actionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0006" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowLabel: { fontSize: 16, fontFamily: "Inter_500Medium", flex: 1 },
  sheetDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4, marginHorizontal: 12 },
  sheetLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
    textTransform: "uppercase",
  },
  editBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0008",
    paddingHorizontal: 24,
  },
  editCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
  },
  editTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  editInput: {
    minHeight: 96,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  editSave: {},
});
