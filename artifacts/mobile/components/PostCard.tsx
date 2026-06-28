import { useState } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Modal,
  Share,
  TextInput,
  Alert,
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
  useSharePost,
  getGetFeedQueryKey,
  getGetPostQueryKey,
  getListSavedItemsQueryKey,
  type Post,
  type ReactionSummary,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { MediaGrid } from "@/components/MediaGrid";
import { ReactionBar } from "@/components/ReactionBar";
import { reactionConfig } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { timeAgo, formatCount } from "@/lib/format";

type SharedPost = NonNullable<Post["sharedPost"]>;

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

function SharedPostEmbed({ shared }: { shared: SharedPost }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push(`/post/${shared.id}`)}
      style={[styles.embed, { borderColor: c.border }]}
    >
      {shared.media.length > 0 && <MediaGrid media={shared.media} />}
      <View style={styles.embedBody}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Avatar uri={shared.author.avatarUrl} name={shared.author.displayName} size={28} />
          <View>
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {shared.author.displayName}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{timeAgo(shared.createdAt)}</Text>
          </View>
        </View>
        {shared.content.length > 0 && (
          <Text numberOfLines={4} style={{ color: c.foreground, fontSize: 14, lineHeight: 19 }}>
            {shared.content}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function PostCard({ post, onComment }: PostCardProps) {
  const c = useColors();
  const qc = useQueryClient();
  const [summary, setSummary] = useState<ReactionSummary>(post.reactions);
  const [saved, setSaved] = useState<boolean>(post.viewerHasSaved ?? false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const sharePost = useSharePost();

  const viewerReaction = summary.viewerReaction ?? null;
  const targetId = post.sharedPost?.id ?? post.id;
  const postUrl = `https://himewo.com/post/${targetId}`;

  const syncServer = () => {
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
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

  const shareToFeed = () => {
    sharePost.mutate(
      { id: post.id, data: { caption: shareCaption.trim() || undefined } },
      {
        onSuccess: () => {
          setShareOpen(false);
          setShareCaption("");
          syncServer();
          Alert.alert("Shared", "This post is now on your timeline.");
        },
        onError: () => Alert.alert("Error", "Could not share this post."),
      },
    );
  };

  const sendToFriends = async () => {
    setShareOpen(false);
    try {
      await Share.share({
        message: `${post.content || "Check this out on HiMewo"}\n${postUrl}`,
        url: postUrl,
      });
    } catch {
      /* cancelled */
    }
  };

  const topReactions = Object.entries(summary.byType)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => reactionConfig[t as ReactionType]?.emoji)
    .filter(Boolean);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
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
            {post.sharedPost && (
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>shared a post</Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
              {timeAgo(post.createdAt)}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>·</Text>
            <Ionicons name={privacyIcon(post.privacy)} size={11} color={c.mutedForeground} />
          </View>
        </View>
        <Pressable hitSlop={8} onPress={toggleSave}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={saved ? c.primary : c.mutedForeground}
          />
        </Pressable>
      </Pressable>

      {post.content.length > 0 && (
        <Pressable onPress={() => router.push(`/post/${post.id}`)}>
          <Text style={[styles.content, { color: c.foreground }]}>{post.content}</Text>
        </Pressable>
      )}

      {post.sharedPost ? (
        <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
          <SharedPostEmbed shared={post.sharedPost} />
        </View>
      ) : (
        post.media.length > 0 && (
          <Pressable onPress={() => router.push(`/post/${post.id}`)}>
            <MediaGrid media={post.media} />
          </Pressable>
        )
      )}

      {(summary.total > 0 || post.commentCount > 0 || post.shareCount > 0) && (
        <View style={styles.statsRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {topReactions.length > 0 && (
              <Text style={{ fontSize: 13 }}>{topReactions.join("")}</Text>
            )}
            {summary.total > 0 && (
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                {formatCount(summary.total)}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {post.commentCount > 0 && (
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
        <View style={styles.actionItem}>
          <ReactionBar viewerReaction={viewerReaction} onReact={applyReaction} />
        </View>
        <Pressable style={styles.actionItem} onPress={onComment} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={18} color={c.mutedForeground} />
          <Text style={[styles.actionLabel, { color: c.mutedForeground }]}>Comment</Text>
        </Pressable>
        <Pressable style={styles.actionItem} onPress={() => setShareOpen(true)} hitSlop={6}>
          <Ionicons name="arrow-redo-outline" size={18} color={c.mutedForeground} />
          <Text style={[styles.actionLabel, { color: c.mutedForeground }]}>Share</Text>
        </Pressable>
      </View>

      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setShareOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
            <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
              Share this post
            </Text>
            <TextInput
              value={shareCaption}
              onChangeText={setShareCaption}
              placeholder="Say something about this..."
              placeholderTextColor={c.mutedForeground}
              multiline
              style={[styles.sheetInput, { color: c.foreground, backgroundColor: c.secondary }]}
            />
            <Pressable
              style={[styles.sheetPrimary, { backgroundColor: c.primary }]}
              onPress={shareToFeed}
              disabled={sharePost.isPending}
            >
              <Ionicons name="repeat" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {sharePost.isPending ? "Sharing..." : "Share to your feed"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sheetSecondary, { borderColor: c.border }]}
              onPress={sendToFriends}
            >
              <Ionicons name="paper-plane-outline" size={18} color={c.foreground} />
              <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                Send to friends & other apps
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, paddingTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  content: { paddingHorizontal: 14, fontSize: 15, lineHeight: 21, marginBottom: 10 },
  embed: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  embedBody: { padding: 10 },
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
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  sheetPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 10,
  },
  sheetSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
});
