import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
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
  useCreateStory,
  useListConversations,
  useCreateConversation,
  useSendMessage,
  useListFriends,
  useListGroups,
  useCreatePost,
  PostInputPrivacy,
  getListReelCommentsQueryKey,
  getListSavedItemsQueryKey,
  useFollowUser,
  useUnfollowUser,
  ReactionType,
  type Reel,
  type ReelComment,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/Avatar";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { MentionText } from "@/components/Mention";
import { reactionConfig, reactionOrder } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { formatCount, timeAgo } from "@/lib/format";
import { parseReelOverlays } from "../create-reel";

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
  const { user } = useAuth();
  const isOwn = user?.id === reel.author.id;
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const [following, setFollowing] = useState(Boolean(reel.author.viewerFollows));

  useEffect(() => {
    setFollowing(Boolean(reel.author.viewerFollows));
  }, [reel.author.viewerFollows]);

  const handleToggleFollow = () => {
    if (!user || isOwn) return;
    if (following) {
      setFollowing(false);
      unfollowUser.mutate({ userId: reel.author.id }, { onError: () => setFollowing(true) });
    } else {
      setFollowing(true);
      followUser.mutate({ userId: reel.author.id }, { onError: () => setFollowing(false) });
    }
  };

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

  const [shareOpen, setShareOpen] = useState(false);
  const handleShare = () => setShareOpen(true);

  const { cleanCaption, overlays } = parseReelOverlays(reel.caption);

  return (
    <View style={{ height, width: SCREEN_WIDTH, backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* On-Screen Text & Emoji Overlays */}
      {overlays.map((ov) => {
        const bgStyle = ov.bgStyle ?? "pill";
        return (
          <View
            key={ov.id}
            pointerEvents="none"
            style={[
              styles.viewerOverlayContainer,
              { left: `${ov.x}%`, top: `${ov.y}%` },
            ]}
          >
            {ov.type === "emoji" ? (
              <Text style={{ fontSize: ov.fontSize ?? 44 }}>{ov.content}</Text>
            ) : (
              <View
                style={[
                  styles.textBadgeCommon,
                  bgStyle === "pill" && styles.textBadgePill,
                  bgStyle === "glass" && styles.textBadgeGlass,
                  bgStyle === "neon" && styles.textBadgeNeon,
                ]}
              >
                <Text
                  style={[
                    styles.textBadgeContent,
                    {
                      color: ov.color || "#ffffff",
                      fontSize: ov.fontSize ?? 18,
                    },
                  ]}
                >
                  {ov.content}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.bottomInfo} pointerEvents="box-none">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
            {!isOwn && user && (
              <Pressable
                onPress={handleToggleFollow}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 14,
                  backgroundColor: following ? "rgba(255,255,255,0.25)" : "#9333ea",
                  marginLeft: 8,
                }}
              >
                <Ionicons
                  name={following ? "checkmark" : "add"}
                  size={12}
                  color={following ? "#e9d5ff" : "#fff"}
                />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {following ? "Following" : "Follow"}
                </Text>
              </Pressable>
            )}
          </View>
          {!!cleanCaption && (
            <MentionText
              content={cleanCaption}
              style={styles.caption}
            />
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
              color={saved ? "#facc15" : "#fff"}
            />
            <Text style={[styles.actionLabel, saved ? { color: "#facc15", fontWeight: "700" } : null]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </Pressable>
          <Pressable style={styles.action} onPress={handleShare}>
            <Ionicons name="paper-plane-outline" size={28} color="#fff" />
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

      <ReelShareSheet
        reel={reel}
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
      />
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
                      <MentionText
                        content={item.content}
                        style={{ color: c.foreground, fontSize: 14, marginTop: 2 }}
                      />
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
                placeholder="Write a comment... (#hashtags)"
                placeholderTextColor={c.mutedForeground}
                underlineColorAndroid="transparent"
                style={[styles.input, { backgroundColor: c.secondary, color: c.foreground }]}
                multiline
              />
              <Pressable onPress={send} disabled={!text.trim()} hitSlop={8}>
                <Ionicons
                  name="send"
                  size={22}
                  color={text.trim() ? "#a855f7" : c.mutedForeground}
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

function ReelShareSheet({
  reel,
  visible,
  onClose,
}: {
  reel: Reel;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [sharingToStory, setSharingToStory] = useState(false);
  const [sentUsers, setSentUsers] = useState<Set<string>>(new Set());
  const [sendingUser, setSendingUser] = useState<string | null>(null);
  const [sharedCircles, setSharedCircles] = useState<Set<number>>(new Set());
  const [sharingCircleId, setSharingCircleId] = useState<number | null>(null);

  const createStory = useCreateStory();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const createPost = useCreatePost();

  const { data: convsData = [] } = useListConversations({
    query: { enabled: visible && reel != null },
  } as any);

  const { data: friendsData = [] } = useListFriends({
    query: { enabled: visible && reel != null },
  } as any);

  const { data: groupsData = [] } = useListGroups({
    query: { enabled: visible && reel != null },
  } as any);

  const joinedCircles = (groupsData as any[]).filter((g) => Boolean(g.viewerIsMember));

  const shareUrl = `https://himewo.com/reels?id=${reel?.id ?? ""}`;
  const shareText = `Check out this reel by ${reel?.author.displayName ?? "someone"} on HiMewo!`;

  // Build list of chat friends (recent chat friends first)
  const chatFriends: { user: any; conversationId?: number }[] = [];
  const seenIds = new Set<string>();

  for (const conv of convsData as any[]) {
    if (conv.type === "direct" && Array.isArray(conv.members)) {
      const other = conv.members.find((m: any) => m.user?.id !== user?.id)?.user;
      if (other && !seenIds.has(other.id)) {
        seenIds.add(other.id);
        chatFriends.push({ user: other, conversationId: conv.id });
      }
    }
  }

  for (const f of friendsData as any[]) {
    const friendUser = f.friend || f;
    if (friendUser?.id && friendUser.id !== user?.id && !seenIds.has(friendUser.id)) {
      seenIds.add(friendUser.id);
      chatFriends.push({ user: friendUser });
      if (chatFriends.length >= 18) break;
    }
  }

  const handleShareStory = async () => {
    if (!reel) return;
    setSharingToStory(true);
    try {
      await createStory.mutateAsync({
        data: {
          storyType: "media",
          mediaUrl: reel.videoUrl,
          mediaType: "video",
          caption: reel.caption || `Reel by ${reel.author.displayName}`,
          expiresInHours: 24,
        },
      });
      Alert.alert("Added to Story", "Your reel has been shared to your story for 24 hours!");
      onClose();
    } catch {
      Alert.alert("Failed", "Could not add reel to story.");
    } finally {
      setSharingToStory(false);
    }
  };

  const handleShareToCircle = async (circle: any) => {
    if (!reel || sharedCircles.has(circle.id) || sharingCircleId) return;
    setSharingCircleId(circle.id);
    try {
      await createPost.mutateAsync({
        data: {
          content: `${shareText}\n${shareUrl}`,
          privacy: PostInputPrivacy.public,
          groupId: circle.id,
        },
      });
      setSharedCircles((prev) => new Set(prev).add(circle.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Shared to Circle", `Reel posted to ${circle.name}!`);
    } catch {
      Alert.alert("Error", `Could not share to ${circle.name}.`);
    } finally {
      setSharingCircleId(null);
    }
  };

  const handleSendToFriend = async (item: { user: any; conversationId?: number }) => {
    const friendId = item.user.id;
    if (sentUsers.has(friendId) || sendingUser) return;
    setSendingUser(friendId);

    try {
      let convId = item.conversationId;
      if (!convId) {
        const res = await createConversation.mutateAsync({
          data: { memberIds: [friendId], type: "direct" },
        });
        convId = (res as any)?.id;
      }
      if (convId) {
        await sendMessage.mutateAsync({
          id: convId,
          data: {
            content: `Check out this reel by @${reel.author.username || reel.author.displayName} on HiMewo:\n${shareUrl}`,
          },
        });
        setSentUsers((prev) => new Set(prev).add(friendId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Could not send message.");
    } finally {
      setSendingUser(null);
    }
  };

  const openUrl = async (url: string, fallbackUrl?: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else if (fallbackUrl) {
        await Linking.openURL(fallbackUrl);
      } else {
        await Share.share({ message: shareText + "\n" + shareUrl, url: shareUrl });
      }
    } catch {
      if (fallbackUrl) {
        try {
          await Linking.openURL(fallbackUrl);
        } catch {
          await Share.share({ message: shareText + "\n" + shareUrl, url: shareUrl });
        }
      } else {
        await Share.share({ message: shareText + "\n" + shareUrl, url: shareUrl });
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.shareSheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.foreground }]}>Share Reel</Text>

          {/* 1. Send in HiMewo Chat: Recent chats first */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="chatbubbles-outline" size={14} color="#a855f7" />
            <Text style={[styles.shareSectionLabel, { color: c.mutedForeground, marginHorizontal: 0, marginVertical: 0 }]}>
              SEND IN HIMEWO CHAT
            </Text>
          </View>
          {chatFriends.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={chatFriends}
              keyExtractor={(item) => item.user.id}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingTop: 4, paddingBottom: 6 }}
              renderItem={({ item }) => {
                const isSent = sentUsers.has(item.user.id);
                const isSending = sendingUser === item.user.id;
                return (
                  <View style={styles.chatFriendItem}>
                    <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={50} />
                    <Text style={[styles.chatFriendName, { color: c.foreground }]} numberOfLines={1}>
                      {item.user.displayName}
                    </Text>
                    <Pressable
                      onPress={() => handleSendToFriend(item)}
                      disabled={isSent || isSending}
                      style={[
                        styles.sendBtn,
                        isSent ? { backgroundColor: c.secondary } : { backgroundColor: "#a855f7" },
                      ]}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.sendBtnText, isSent ? { color: c.mutedForeground } : { color: "#fff" }]}>
                          {isSent ? "Sent" : "Send"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          ) : (
            <Text style={[styles.emptyHintText, { color: c.mutedForeground }]}>
              No recent chats yet. Start chatting on HiMewo!
            </Text>
          )}

          {/* 2. Share to Circle (Groups) */}
          <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
            <Ionicons name="people-outline" size={14} color="#06b6d4" />
            <Text style={[styles.shareSectionLabel, { color: c.mutedForeground, marginHorizontal: 0, marginVertical: 0 }]}>
              SHARE TO CIRCLE (GROUPS)
            </Text>
          </View>
          {joinedCircles.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={joinedCircles}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingTop: 4, paddingBottom: 6 }}
              renderItem={({ item }) => {
                const isShared = sharedCircles.has(item.id);
                const isSharing = sharingCircleId === item.id;
                return (
                  <View style={styles.chatFriendItem}>
                    <View style={[styles.circleIconCircle, { backgroundColor: "#06b6d420", borderColor: "#06b6d4", borderWidth: 1 }]}>
                      {item.avatarUrl ? (
                        <Avatar uri={item.avatarUrl} name={item.name} size={48} />
                      ) : (
                        <Ionicons name="people" size={24} color="#06b6d4" />
                      )}
                    </View>
                    <Text style={[styles.chatFriendName, { color: c.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Pressable
                      onPress={() => handleShareToCircle(item)}
                      disabled={isShared || isSharing}
                      style={[
                        styles.sendBtn,
                        isShared ? { backgroundColor: c.secondary } : { backgroundColor: "#06b6d4" },
                      ]}
                    >
                      {isSharing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.sendBtnText, isShared ? { color: c.mutedForeground } : { color: "#fff" }]}>
                          {isShared ? "Shared ✓" : "Share"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          ) : (
            <Pressable
              onPress={() => {
                onClose();
                router.push("/groups");
              }}
              style={[styles.noCirclesBanner, { backgroundColor: c.secondary }]}
            >
              <Ionicons name="compass-outline" size={18} color="#06b6d4" />
              <Text style={[styles.noCirclesText, { color: c.mutedForeground }]}>
                Join Circles to share directly to community feeds. Tap to explore.
              </Text>
            </Pressable>
          )}

          {/* 3. Share to Story Button (24 hours) */}
          <Pressable
            onPress={handleShareStory}
            disabled={sharingToStory}
            style={[styles.storyShareBtn, { backgroundColor: c.secondary, marginTop: 10 }]}
          >
            <View style={styles.storyGradientRing}>
              <Ionicons name="sparkles" size={18} color="#a855f7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.storyBtnTitle, { color: c.foreground }]}>Add to Your Story</Text>
              <Text style={[styles.storyBtnSub, { color: c.mutedForeground }]}>
                Share this reel on your story (24 hours)
              </Text>
            </View>
            {sharingToStory ? (
              <ActivityIndicator size="small" color="#a855f7" />
            ) : (
              <View style={styles.shareBadge}>
                <Text style={styles.shareBadgeText}>Share</Text>
              </View>
            )}
          </Pressable>

          {/* 4. Social Apps Row */}
          <Text style={[styles.shareSectionLabel, { color: c.mutedForeground, marginTop: 10 }]}>
            SHARE TO APPS
          </Text>
          <View style={styles.socialRow}>
            {/* WhatsApp */}
            <Pressable
              style={styles.socialBtn}
              onPress={() =>
                openUrl(
                  `whatsapp://send?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
                  `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`
                )
              }
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#25D36622" }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <Text style={[styles.socialBtnText, { color: c.mutedForeground }]}>WhatsApp</Text>
            </Pressable>

            {/* Messenger */}
            <Pressable
              style={styles.socialBtn}
              onPress={() =>
                openUrl(
                  `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`,
                  `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}`
                )
              }
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#0084FF22" }]}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#0084FF" />
              </View>
              <Text style={[styles.socialBtnText, { color: c.mutedForeground }]}>Messenger</Text>
            </Pressable>

            {/* Telegram */}
            <Pressable
              style={styles.socialBtn}
              onPress={() =>
                openUrl(
                  `tg://msg?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
                  `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
                )
              }
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#229ED922" }]}>
                <Ionicons name="paper-plane" size={24} color="#229ED9" />
              </View>
              <Text style={[styles.socialBtnText, { color: c.mutedForeground }]}>Telegram</Text>
            </Pressable>

            {/* Instagram */}
            <Pressable
              style={styles.socialBtn}
              onPress={() => openUrl("instagram://", "https://instagram.com")}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#E1306C22" }]}>
                <Ionicons name="logo-instagram" size={24} color="#E1306C" />
              </View>
              <Text style={[styles.socialBtnText, { color: c.mutedForeground }]}>Instagram</Text>
            </Pressable>

            {/* More Native */}
            <Pressable
              style={styles.socialBtn}
              onPress={() =>
                Share.share({
                  message: `${shareText}\n${shareUrl}`,
                  url: shareUrl,
                })
              }
            >
              <View style={[styles.socialIconCircle, { backgroundColor: "#a855f722" }]}>
                <Ionicons name="share-social" size={24} color="#a855f7" />
              </View>
              <Text style={[styles.socialBtnText, { color: c.mutedForeground }]}>More</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
  viewerOverlayContainer: {
    position: "absolute",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 20,
    padding: 4,
  },
  textBadgeCommon: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  textBadgePill: {
    backgroundColor: "#000000cc",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ffffff33",
  },
  textBadgeGlass: {
    backgroundColor: "#ffffff33",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff66",
  },
  textBadgeNeon: {
    backgroundColor: "#000000ee",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a855f7",
  },
  textBadgeContent: {
    fontFamily: "Inter_700Bold",
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
  sheet: { height: "52%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  shareSheet: {
    height: "58%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  storyShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#a855f744",
  },
  storyGradientRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#a855f722",
    alignItems: "center",
    justifyContent: "center",
  },
  storyBtnTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  storyBtnSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  shareBadge: {
    backgroundColor: "#a855f722",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  shareBadgeText: {
    color: "#a855f7",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  shareSectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  circleIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  noCirclesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  noCirclesText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    flex: 1,
  },
  emptyHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chatFriendItem: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  chatFriendName: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
  sendBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 46,
    alignItems: "center",
  },
  sendBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  socialBtn: {
    alignItems: "center",
    gap: 6,
  },
  socialIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
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
    fontSize: 16,
  },
});
