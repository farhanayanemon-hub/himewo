import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  ReactionType,
  useSetPostReaction,
  useRemovePostReaction,
  useSaveItem,
  useUnsaveItem,
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

export function PostCard({ post, onComment, onShare }: PostCardProps) {
  const c = useColors();
  const qc = useQueryClient();
  const [summary, setSummary] = useState<ReactionSummary>(post.reactions);
  const [saved, setSaved] = useState<boolean>(post.viewerHasSaved ?? false);
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();

  const viewerReaction = summary.viewerReaction ?? null;

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
      // toggle off
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

      {post.media.length > 0 && (
        <Pressable onPress={() => router.push(`/post/${post.id}`)}>
          <MediaGrid media={post.media} />
        </Pressable>
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
        <Pressable style={styles.actionItem} onPress={onShare} hitSlop={6}>
          <Ionicons name="arrow-redo-outline" size={18} color={c.mutedForeground} />
          <Text style={[styles.actionLabel, { color: c.mutedForeground }]}>Share</Text>
        </Pressable>
      </View>
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
});
