import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSharePost,
  useListConversations,
  useListFriends,
  useSendMessage,
  useCreateConversation,
  getGetFeedQueryKey,
  getGetPostQueryKey,
  getListConversationsQueryKey,
  MessageInputType,
  ConversationInputType,
  type Conversation,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

interface ShareSheetProps {
  postId: number | null;
  visible: boolean;
  onClose: () => void;
  onShared?: () => void;
}

interface QuickTarget {
  key: string;
  name: string;
  avatarUrl?: string | null;
  conversationId?: number;
  userId?: string;
}

export function ShareSheet({ postId, visible, onClose, onShared }: ShareSheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [caption, setCaption] = useState("");
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sharePost = useSharePost();
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  const { data: convData } = useListConversations({
    query: { enabled: visible, queryKey: getListConversationsQueryKey() },
  });
  const { data: friendsData } = useListFriends({
    query: { enabled: visible, queryKey: ["/api/friends"] },
  });

  const targets = useMemo<QuickTarget[]>(() => {
    const list: QuickTarget[] = [];
    const seenUserIds = new Set<string>();
    const convs = ((convData ?? []) as Conversation[]).slice(0, 12);

    for (const conv of convs) {
      if (conv.type === "group") {
        list.push({
          key: `conv-${conv.id}`,
          name: conv.title || "Group",
          avatarUrl: conv.avatarUrl,
          conversationId: conv.id,
        });
      } else {
        const peer = conv.members.find((m) => m.user.id !== user?.id)?.user;
        if (peer && !seenUserIds.has(peer.id)) {
          seenUserIds.add(peer.id);
          list.push({
            key: `user-${peer.id}`,
            name: peer.displayName,
            avatarUrl: peer.avatarUrl,
            conversationId: conv.id,
            userId: peer.id,
          });
        }
      }
    }

    const friends = (friendsData ?? []) as Profile[];
    for (const f of friends) {
      if (!seenUserIds.has(f.id) && list.length < 15) {
        seenUserIds.add(f.id);
        list.push({
          key: `user-${f.id}`,
          name: f.displayName,
          avatarUrl: f.avatarUrl,
          userId: f.id,
        });
      }
    }
    return list;
  }, [convData, friendsData, user?.id]);

  const postUrl = postId != null ? `https://app.himewo.com/post/${postId}` : "https://app.himewo.com";

  const close = () => {
    setCaption("");
    setSentIds({});
    setSendingKey(null);
    setCopied(false);
    onClose();
  };

  const submitTimelineShare = () => {
    if (postId == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const text = caption.trim();
    sharePost.mutate(
      { id: postId, data: { caption: text || undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          qc.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
          onShared?.();
          close();
          Alert.alert("Shared!", "This post has been shared to your timeline.");
        },
        onError: () => Alert.alert("Error", "Could not share this post."),
      },
    );
  };

  const handleSendToTarget = async (target: QuickTarget) => {
    if (postId == null || sentIds[target.key] || sendingKey === target.key) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSendingKey(target.key);
    try {
      let convId = target.conversationId;
      if (!convId && target.userId) {
        const created = await createConversation.mutateAsync({
          data: { type: ConversationInputType.direct, memberIds: [target.userId] },
        });
        convId = created.id;
      }
      if (!convId) return;
      const msgContent = caption.trim()
        ? `${caption.trim()}\n${postUrl}`
        : `Check out this post on Himewo: ${postUrl}`;
      await sendMessage.mutateAsync({
        id: convId,
        data: { content: msgContent, type: MessageInputType.text },
      });
      setSentIds((prev) => ({ ...prev, [target.key]: true }));
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    } catch {
      Alert.alert("Error", `Could not send post to ${target.name}`);
    } finally {
      setSendingKey(null);
    }
  };

  const handleExternalShare = async (platform: "whatsapp" | "facebook" | "messenger" | "instagram" | "copy") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const shareText = caption.trim() ? `${caption.trim()} ${postUrl}` : postUrl;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);

    try {
      if (platform === "copy") {
        if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(postUrl);
        } else {
          await Share.share({ message: postUrl, url: postUrl });
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        return;
      }

      if (platform === "whatsapp") {
        const waUrl = `whatsapp://send?text=${encodedText}`;
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) {
          await Linking.openURL(waUrl);
        } else {
          await Linking.openURL(`https://wa.me/?text=${encodedText}`);
        }
        return;
      }

      if (platform === "facebook") {
        await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
        return;
      }

      if (platform === "messenger") {
        const msgUrl = `fb-messenger://share/?link=${encodedUrl}`;
        const canOpen = await Linking.canOpenURL(msgUrl);
        if (canOpen) {
          await Linking.openURL(msgUrl);
        } else {
          await Share.share({ message: shareText, url: postUrl });
        }
        return;
      }

      if (platform === "instagram") {
        await Share.share({ message: shareText, url: postUrl });
      }
    } catch {
      await Share.share({ message: shareText, url: postUrl }).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                paddingBottom: Math.max(insets.bottom, 18),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: c.foreground }]}>Share Post</Text>
              <Pressable onPress={close} hitSlop={8} style={[styles.closeBtn, { backgroundColor: c.secondary }]}>
                <Ionicons name="close" size={18} color={c.mutedForeground} />
              </Pressable>
            </View>

            {/* Tier 1: Write Caption + Share Now to Feed */}
            <View style={[styles.captionCard, { backgroundColor: c.secondary, borderColor: c.border }]}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Write a caption for your post..."
                placeholderTextColor={c.mutedForeground}
                underlineColorAndroid="transparent"
                multiline
                style={[styles.input, { color: c.foreground }]}
              />
              <View style={styles.captionFooter}>
                <Text style={{ fontSize: 11, color: c.mutedForeground }}>
                  Shares directly to your profile feed
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.shareNowBtn,
                    {
                      backgroundColor: c.primary,
                      opacity: sharePost.isPending ? 0.6 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  onPress={submitTimelineShare}
                  disabled={sharePost.isPending}
                >
                  <Ionicons name="paper-plane" size={15} color={c.primaryForeground} />
                  <Text style={[styles.shareNowLabel, { color: c.primaryForeground }]}>
                    {sharePost.isPending ? "Posting..." : "Post Now"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Tier 2: Top Chat List Friends */}
            {targets.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
                  SEND IN CHAT
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsScroll}
                >
                  {targets.map((t) => {
                    const isSent = Boolean(sentIds[t.key]);
                    const isSending = sendingKey === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => handleSendToTarget(t)}
                        style={({ pressed }) => [
                          styles.friendItem,
                          { transform: [{ scale: pressed ? 0.94 : 1 }] },
                        ]}
                      >
                        <View style={styles.avatarWrap}>
                          <Avatar uri={t.avatarUrl} name={t.name} size={52} />
                          <View
                            style={[
                              styles.sendBadge,
                              {
                                backgroundColor: isSent ? "#22c55e" : c.primary,
                                borderColor: c.card,
                              },
                            ]}
                          >
                            {isSending ? (
                              <ActivityIndicator size={10} color="#fff" />
                            ) : (
                              <Ionicons
                                name={isSent ? "checkmark" : "paper-plane"}
                                size={11}
                                color="#fff"
                              />
                            )}
                          </View>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[styles.friendName, { color: c.foreground }]}
                        >
                          {t.name.split(" ")[0]}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: "Inter_600SemiBold",
                            color: isSent ? "#22c55e" : c.primary,
                          }}
                        >
                          {isSent ? "Sent" : "Send"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Tier 3: Social Apps + Copy Link */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
                SHARE VIA APPS
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.socialRow}
              >
                <Pressable
                  onPress={() => handleExternalShare("copy")}
                  style={({ pressed }) => [
                    styles.socialItem,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                  ]}
                >
                  <View
                    style={[
                      styles.socialCircle,
                      { backgroundColor: copied ? "#22c55e" : c.secondary },
                    ]}
                  >
                    <Ionicons
                      name={copied ? "checkmark" : "link-outline"}
                      size={22}
                      color={copied ? "#fff" : c.foreground}
                    />
                  </View>
                  <Text style={[styles.socialLabel, { color: c.foreground }]}>
                    {copied ? "Copied!" : "Copy Link"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleExternalShare("whatsapp")}
                  style={({ pressed }) => [
                    styles.socialItem,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                  ]}
                >
                  <View style={[styles.socialCircle, { backgroundColor: "#25D366" }]}>
                    <Ionicons name="logo-whatsapp" size={23} color="#fff" />
                  </View>
                  <Text style={[styles.socialLabel, { color: c.foreground }]}>WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleExternalShare("messenger")}
                  style={({ pressed }) => [
                    styles.socialItem,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                  ]}
                >
                  <View style={[styles.socialCircle, { backgroundColor: "#0084FF" }]}>
                    <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                  </View>
                  <Text style={[styles.socialLabel, { color: c.foreground }]}>Messenger</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleExternalShare("facebook")}
                  style={({ pressed }) => [
                    styles.socialItem,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                  ]}
                >
                  <View style={[styles.socialCircle, { backgroundColor: "#1877F2" }]}>
                    <Ionicons name="logo-facebook" size={23} color="#fff" />
                  </View>
                  <Text style={[styles.socialLabel, { color: c.foreground }]}>Facebook</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleExternalShare("instagram")}
                  style={({ pressed }) => [
                    styles.socialItem,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                  ]}
                >
                  <View style={[styles.socialCircle, { backgroundColor: "#E1306C" }]}>
                    <Ionicons name="logo-instagram" size={23} color="#fff" />
                  </View>
                  <Text style={[styles.socialLabel, { color: c.foreground }]}>Instagram</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  captionCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  input: {
    minHeight: 58,
    maxHeight: 110,
    fontSize: 15,
    textAlignVertical: "top",
  },
  captionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
  },
  shareNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  shareNowLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  friendsScroll: {
    gap: 14,
    paddingRight: 8,
  },
  friendItem: {
    width: 64,
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 5,
  },
  sendBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  friendName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
  },
  socialRow: {
    gap: 16,
    paddingRight: 8,
  },
  socialItem: {
    alignItems: "center",
    width: 64,
    gap: 6,
  },
  socialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
});
