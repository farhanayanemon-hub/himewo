import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  type ViewToken,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReels,
  useSetReelReaction,
  useRemoveReelReaction,
  useSaveItem,
  useUnsaveItem,
  useListReelComments,
  useCreateReelComment,
  getListReelCommentsQueryKey,
  getListSavedItemsQueryKey,
  ReactionType,
  type Reel,
  type ReelComment,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/Avatar";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { reactionConfig, reactionOrder } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { formatCount, timeAgo } from "@/lib/format";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

interface ReelItemProps {
  reel: Reel;
  height: number;
  active: boolean;
  onComment: (reel: Reel) => void;
}

function ReelItem({ reel, height, active, onComment }: ReelItemProps) {
  const c = useColors();
  const qc = useQueryClient();
  const [reaction, setReactionState] = useState<ReactionType | null>(
    reel.viewerReaction ?? (reel.viewerHasLiked ? ReactionType.like : null),
  );
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [saved, setSaved] = useState(reel.viewerHasSaved);
  const [pickerOpen, setPickerOpen] = useState(false);

  const setReelReaction = useSetReelReaction();
  const removeReelReaction = useRemoveReelReaction();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();

  const player = useVideoPlayer(reel.videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  const syncFromServer = (updated: Reel) => {
    setReactionState(updated.viewerReaction ?? null);
    setLikeCount(updated.likeCount);
  };

  const toggleLike = () => {
    const prev = { reaction, likeCount };
    const rollback = () => {
      setReactionState(prev.reaction);
      setLikeCount(prev.likeCount);
    };
    if (reaction) {
      setReactionState(null);
      setLikeCount((n) => Math.max(0, n - 1));
      removeReelReaction.mutate(
        { id: reel.id },
        { onSuccess: (d) => syncFromServer(d as Reel), onError: rollback },
      );
    } else {
      setReactionState(ReactionType.like);
      setLikeCount((n) => n + 1);
      setReelReaction.mutate(
        { id: reel.id, data: { type: ReactionType.like } },
        { onSuccess: (d) => syncFromServer(d as Reel), onError: rollback },
      );
    }
  };

  const openPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPickerOpen(true);
  };

  const pickReaction = (t: ReactionType) => {
    setPickerOpen(false);
    Haptics.selectionAsync();
    const prev = { reaction, likeCount };
    const rollback = () => {
      setReactionState(prev.reaction);
      setLikeCount(prev.likeCount);
    };
    if (!reaction) setLikeCount((n) => n + 1);
    setReactionState(t);
    setReelReaction.mutate(
      { id: reel.id, data: { type: t } },
      { onSuccess: (d) => syncFromServer(d as Reel), onError: rollback },
    );
  };

  const toggleSave = () => {
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
    if (saved) {
      setSaved(false);
      unsaveItem.mutate(
        { entityType: "reel", entityId: reel.id },
        { onSuccess: invalidate },
      );
    } else {
      setSaved(true);
      saveItem.mutate(
        { data: { entityType: "reel", entityId: reel.id } },
        { onSuccess: invalidate },
      );
    }
  };

  return (
    <View style={{ height, width: SCREEN_WIDTH, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.bottomInfo} pointerEvents="box-none">
          <Pressable
            style={styles.authorRow}
            onPress={() => router.push(`/profile/${reel.author.id}`)}
          >
            <Avatar
              uri={reel.author.avatarUrl}
              name={reel.author.displayName}
              size={40}
              ring
            />
            <Text style={styles.authorName}>{reel.author.displayName}</Text>
          </Pressable>
          {!!reel.caption && (
            <Text style={styles.caption} numberOfLines={3}>
              {reel.caption}
            </Text>
          )}
        </View>

        <View style={styles.actionBar} pointerEvents="box-none">
          <Pressable
            style={styles.action}
            onPress={toggleLike}
            onLongPress={openPicker}
            delayLongPress={220}
          >
            {reaction && reaction !== ReactionType.like ? (
              <Text style={{ fontSize: 30 }}>{reactionConfig[reaction].emoji}</Text>
            ) : (
              <Ionicons
                name={reaction ? "heart" : "heart-outline"}
                size={34}
                color={reaction ? c.primary : "#fff"}
              />
            )}
            <Text style={styles.actionLabel}>{formatCount(likeCount)}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => onComment(reel)}>
            <Ionicons name="chatbubble-outline" size={32} color="#fff" />
            <Text style={styles.actionLabel}>
              {formatCount(reel.commentCount)}
            </Text>
          </Pressable>
          <Pressable style={styles.action} onPress={toggleSave}>
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={30}
              color={saved ? c.primary : "#fff"}
            />
            <Text style={styles.actionLabel}>{saved ? "Saved" : "Save"}</Text>
          </Pressable>
          <Pressable style={styles.action}>
            <Ionicons name="arrow-redo-outline" size={32} color="#fff" />
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setPickerOpen(false)}
        >
          <View style={[styles.reactionPicker, { backgroundColor: c.surface, borderColor: c.border }]}>
            {reactionOrder.map((t) => (
              <Pressable
                key={t}
                onPress={() => pickReaction(t)}
                style={{ paddingHorizontal: 3 }}
                hitSlop={4}
              >
                <Text style={{ fontSize: 32 }}>{reactionConfig[t].emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function ReelsScreen() {
  const c = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT);
  const [commentReel, setCommentReel] = useState<Reel | null>(null);

  const { data, isLoading } = useListReels();
  const reels = (data ?? []) as Reel[];

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Reel; index: number }) => (
      <ReelItem
        reel={item}
        height={listHeight}
        active={index === activeIndex}
        onComment={setCommentReel}
      />
    ),
    [listHeight, activeIndex],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
      <View style={styles.header} pointerEvents="box-none">
        <Text style={styles.headerTitle}>Reels</Text>
        <Pressable hitSlop={10} onPress={() => router.push("/create-reel")}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : reels.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="film-outline" size={48} color="#fff" />
          <Text style={styles.emptyText}>No reels yet.</Text>
        </View>
      ) : (
        <View
          style={{ flex: 1 }}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        >
          <FlatList
            data={reels}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={listHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            viewabilityConfig={viewabilityConfig.current}
            onViewableItemsChanged={onViewableItemsChanged.current}
            getItemLayout={(_, index) => ({
              length: listHeight,
              offset: listHeight * index,
              index,
            })}
          />
        </View>
      )}

      <ReelCommentsSheet
        reel={commentReel}
        visible={commentReel != null}
        onClose={() => setCommentReel(null)}
      />
    </SafeAreaView>
  );
}

function ReelCommentsSheet({
  reel,
  visible,
  onClose,
}: {
  reel: Reel | null;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const reelId = reel?.id ?? 0;

  const { data, isLoading } = useListReelComments(reelId, {
    query: {
      enabled: visible && reel != null,
      queryKey: getListReelCommentsQueryKey(reelId),
    },
  });
  const comments = (data ?? []) as ReelComment[];
  const createComment = useCreateReelComment();

  const send = () => {
    const content = text.trim();
    if (!content || reel == null) return;
    setText("");
    createComment.mutate(
      { id: reel.id, data: { content } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListReelCommentsQueryKey(reel.id) });
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.foreground }]}>Comments</Text>

          {isLoading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 14, gap: 14 }}
              ListEmptyComponent={
                <Text style={{ color: c.mutedForeground, textAlign: "center", marginTop: 30 }}>
                  No comments yet. Be the first!
                </Text>
              }
              renderItem={({ item }) => (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Avatar uri={item.author.avatarUrl} name={item.author.displayName} size={34} />
                  <View style={{ flex: 1 }}>
                    <View style={[styles.bubble, { backgroundColor: c.secondary }]}>
                      <Text
                        style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}
                      >
                        {item.author.displayName}
                      </Text>
                      <Text style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}>
                        {item.content}
                      </Text>
                    </View>
                    <Text
                      style={{ color: c.mutedForeground, fontSize: 11, marginTop: 4, marginLeft: 6 }}
                    >
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={10}
          >
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
        </View>
      </View>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setText((t) => t + e)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#fff",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  bottomInfo: {
    position: "absolute",
    left: 16,
    right: 80,
    bottom: 32,
    gap: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorName: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  caption: {
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 19,
  },
  actionBar: {
    position: "absolute",
    right: 12,
    bottom: 40,
    alignItems: "center",
    gap: 22,
  },
  action: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "#0004",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionPicker: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "#0006" },
  sheet: { height: "82%", borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  sheetTitle: {
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    paddingVertical: 10,
  },
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
    minWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
});
