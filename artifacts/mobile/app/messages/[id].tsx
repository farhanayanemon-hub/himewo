import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConversation,
  useListMessages,
  useSendMessage,
  useMarkConversationRead,
  useClearConversation,
  useBlockUser,
  getListMessagesQueryKey,
  getListConversationsQueryKey,
  MessageInputType,
  AttachmentInputType,
  type Conversation,
  type Message,
  type Profile,
  type AttachmentInput,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { EmojiPickerSheet } from "@/components/EmojiPickerSheet";
import { useAuth } from "@/lib/auth";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";
import { useCall } from "@/components/CallProvider";
import { useColors } from "@/hooks/useColors";
import { formatClock } from "@/lib/format";
import { uploadMedia, UploadUnavailableError, type PickedAsset } from "@/lib/upload";
import { useChatPreferences } from "@/lib/chatPreferences";

function peerOf(conv: Conversation | undefined, myId?: string): Profile | undefined {
  if (!conv) return undefined;
  return conv.members.find((m) => m.user.id !== myId)?.user;
}

export default function ChatThreadScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = Number(id);
  const insets = useSafeAreaInsets();
  const {
    readReceipts,
    isMuted,
    toggleMuteChat,
    lockedChatIds,
    lockChat,
    unlockChat,
    deleteChat,
  } = useChatPreferences();
  const { isOnline, subscribe, sendTyping, sendSeen } = useRealtime();
  const { startCall } = useCall();

  const { data: convData } = useGetConversation(convId);
  const conversation = convData as Conversation | undefined;
  const isGroup = conversation?.type === "group";
  const peer = peerOf(conversation, user?.id);
  const headerName = isGroup
    ? conversation?.title || "Group chat"
    : peer?.displayName || "Chat";
  const headerAvatar = isGroup ? conversation?.avatarUrl : peer?.avatarUrl;
  const online = !isGroup && peer ? isOnline(peer.id) : false;

  const { data: msgData, isLoading } = useListMessages(convId);
  const messages = useMemo(() => {
    const list = (msgData ?? []) as Message[];
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [msgData]);

  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const clearConversation = useClearConversation();
  const blockUser = useBlockUser();

  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const markConversationRead = useCallback(() => {
    const latest = messages[0];
    if (!latest) return;
    markRead.mutate(
      { id: convId, data: { messageId: latest.id } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
      },
    );
    if (readReceipts) {
      sendSeen(convId, latest.id);
    }
  }, [convId, messages, markRead, qc, sendSeen, readReceipts]);

  useFocusEffect(
    useCallback(() => {
      markConversationRead();
      return () => {};
    }, [markConversationRead]),
  );

  useEffect(() => {
    const unsub = subscribe((event: RealtimeEvent) => {
      if (event.type === "message") {
        const e = event as { conversationId: number };
        if (e.conversationId === convId) {
          qc.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      } else if (event.type === "typing") {
        const e = event as { conversationId: number; userId: string };
        if (e.conversationId === convId && e.userId !== user?.id) {
          setPeerTyping(true);
          if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current);
          peerTypingTimeout.current = setTimeout(() => setPeerTyping(false), 4000);
        }
      } else if (event.type === "stop_typing") {
        const e = event as { conversationId: number; userId: string };
        if (e.conversationId === convId && e.userId !== user?.id) {
          setPeerTyping(false);
        }
      }
    });
    return () => {
      unsub();
      if (peerTypingTimeout.current) clearTimeout(peerTypingTimeout.current);
    };
  }, [subscribe, convId, qc, user?.id]);

  const onChangeText = useCallback(
    (value: string) => {
      setText(value);
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTyping(convId, true);
      }
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        isTypingRef.current = false;
        sendTyping(convId, false);
      }, 2000);
    },
    [convId, sendTyping],
  );

  const stopTyping = useCallback(() => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(convId, false);
    }
  }, [convId, sendTyping]);

  const afterSend = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  }, [qc, convId]);

  const sendText = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    stopTyping();
    setSending(true);
    try {
      await sendMessage.mutateAsync({
        id: convId,
        data: { content, type: MessageInputType.text },
      });
      afterSend();
    } catch {
      setText(content);
      Alert.alert("Error", "Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (res.canceled || res.assets.length === 0) return;
    const asset = res.assets[0] as PickedAsset;
    setSending(true);
    try {
      const uploaded = await uploadMedia(asset);
      const attachment: AttachmentInput = {
        url: uploaded.url,
        type:
          uploaded.type === "video"
            ? AttachmentInputType.video
            : AttachmentInputType.image,
        width: uploaded.width,
        height: uploaded.height,
      };
      await sendMessage.mutateAsync({
        id: convId,
        data: {
          content: "",
          type:
            uploaded.type === "video"
              ? MessageInputType.video
              : MessageInputType.image,
          attachments: [attachment],
        },
      });
      afterSend();
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        Alert.alert(
          "Media upload unavailable",
          "Storage isn't configured in this environment.",
        );
      } else {
        Alert.alert("Error", "Could not send the attachment. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const canSend = text.trim().length > 0 && !sending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Pressable
          style={styles.headerInfo}
          onPress={() => peer && router.push(`/profile/${peer.id}`)}
          disabled={isGroup}
        >
          <Avatar uri={headerAvatar} name={headerName} size={38} online={online} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text numberOfLines={1} style={[styles.headerName, { color: c.foreground }]}>
              {headerName}
            </Text>
            <Text style={{ color: online ? "#31a24c" : c.mutedForeground, fontSize: 12 }}>
              {peerTyping ? "typing..." : online ? "Active now" : "Offline"}
            </Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {!isGroup && peer && (
            <>
              <Pressable
                style={styles.callBtn}
                onPress={() => startCall(peer.id, false)}
                hitSlop={6}
              >
                <Ionicons name="call" size={22} color={c.primary} />
              </Pressable>
              <Pressable
                style={styles.callBtn}
                onPress={() => startCall(peer.id, true)}
                hitSlop={6}
              >
                <Ionicons name="videocam" size={24} color={c.primary} />
              </Pressable>
            </>
          )}
          <Pressable
            style={styles.callBtn}
            onPress={() => setInfoOpen(true)}
            hitSlop={6}
          >
            <Ionicons name="information-circle-outline" size={24} color={c.primary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1, justifyContent: isLoading ? "center" : undefined }}>
          {isLoading ? (
            <ActivityIndicator color={c.primary} size="large" />
          ) : (
            <FlatList
              data={messages}
              inverted
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <MessageBubble message={item} mine={item.sender.id === user?.id} showAvatar={isGroup} />
              )}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 60, transform: [{ scaleY: -1 }] }}>
                  <Text style={{ color: c.mutedForeground }}>
                    No messages yet. Say hello!
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: c.card,
              borderTopColor: c.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <Pressable onPress={attach} hitSlop={6} style={styles.composerBtn}>
            <Ionicons name="image" size={24} color={c.primary} />
          </Pressable>
          <View style={[styles.inputWrap, { backgroundColor: c.secondary }]}>
            <TextInput
              value={text}
              onChangeText={onChangeText}
              placeholder="Message"
              placeholderTextColor={c.mutedForeground}
              underlineColorAndroid="transparent"
              multiline
              style={{ flex: 1, color: c.foreground, fontSize: 16, maxHeight: 100, paddingVertical: 0 }}
            />
            <Pressable onPress={() => setEmojiOpen(true)} hitSlop={6}>
              <Ionicons name="happy-outline" size={22} color={c.mutedForeground} />
            </Pressable>
          </View>
          <Pressable
            onPress={sendText}
            disabled={!canSend}
            style={styles.composerBtn}
            hitSlop={6}
          >
            {sending ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <Ionicons name="send" size={22} color={canSend ? c.primary : c.mutedForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <EmojiPickerSheet
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={(e) => setText((t) => t + e)}
      />

      {/* Conversation Info Sheet ((i) button) */}
      <Modal
        visible={infoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => setInfoOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: c.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingHorizontal: 20,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.border,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <View style={{ alignItems: "center", paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
              <Avatar uri={headerAvatar} name={headerName} size={76} online={online} />
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 19, color: c.foreground, marginTop: 10 }}>
                {headerName}
              </Text>
              {peer?.username && (
                <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2 }}>
                  @{peer.username}
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 14, marginTop: 16 }}>
                {!isGroup && peer && (
                  <>
                    <Pressable
                      onPress={() => {
                        setInfoOpen(false);
                        router.push(`/profile/${peer.id}`);
                      }}
                      style={{
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: 16,
                        backgroundColor: c.secondary,
                        gap: 4,
                      }}
                    >
                      <Ionicons name="person-outline" size={20} color={c.primary} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground }}>Profile</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setInfoOpen(false);
                        startCall(peer.id, false);
                      }}
                      style={{
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: 16,
                        backgroundColor: c.secondary,
                        gap: 4,
                      }}
                    >
                      <Ionicons name="call-outline" size={20} color={c.primary} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground }}>Audio</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setInfoOpen(false);
                        startCall(peer.id, true);
                      }}
                      style={{
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: 16,
                        backgroundColor: c.secondary,
                        gap: 4,
                      }}
                    >
                      <Ionicons name="videocam-outline" size={20} color={c.primary} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground }}>Video</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            <View style={{ marginTop: 14, gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: c.secondary,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Ionicons
                    name={isMuted(convId) ? "volume-mute-outline" : "volume-high-outline"}
                    size={22}
                    color={c.primary}
                  />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: c.foreground }}>
                    Mute Notifications
                  </Text>
                </View>
                <Switch
                  value={isMuted(convId)}
                  onValueChange={() => toggleMuteChat(convId)}
                  trackColor={{ false: c.border, true: c.primary }}
                />
              </View>

              <Pressable
                onPress={() => {
                  if (lockedChatIds.includes(convId)) {
                    unlockChat(convId);
                  } else {
                    lockChat(convId);
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: c.secondary,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Ionicons
                    name={lockedChatIds.includes(convId) ? "lock-open-outline" : "lock-closed-outline"}
                    size={22}
                    color={c.primary}
                  />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: c.foreground }}>
                    {lockedChatIds.includes(convId) ? "Unlock Chat" : "Lock Chat"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert("Delete Chat", "Are you sure you want to delete this conversation?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        setInfoOpen(false);
                        deleteChat(convId);
                        clearConversation.mutate(
                          { id: convId },
                          {
                            onSettled: () => {
                              qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                              router.back();
                            },
                          },
                        );
                      },
                    },
                  ]);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: c.secondary,
                }}
              >
                <Ionicons name="trash-outline" size={22} color={c.destructive} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: c.destructive }}>
                  Delete Conversation
                </Text>
              </Pressable>

              {!isGroup && peer && (
                <Pressable
                  onPress={() => {
                    Alert.alert(`Block ${peer.displayName}?`, "They won't be able to message or call you.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Block",
                        style: "destructive",
                        onPress: () => {
                          setInfoOpen(false);
                          blockUser.mutate({ id: peer.id });
                          deleteChat(convId);
                          clearConversation.mutate(
                            { id: convId },
                            {
                              onSettled: () => {
                                qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
                                router.back();
                              },
                            },
                          );
                        },
                      },
                    ]);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    backgroundColor: c.secondary,
                  }}
                >
                  <Ionicons name="ban-outline" size={22} color={c.destructive} />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: c.destructive }}>
                    Block {peer.displayName}
                  </Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  mine,
  showAvatar,
}: {
  message: Message;
  mine: boolean;
  showAvatar: boolean;
}) {
  const c = useColors();
  const hasAttachments = message.attachments.length > 0;

  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: mine ? "flex-end" : "flex-start" },
      ]}
    >
      {!mine && showAvatar && (
        <Avatar uri={message.sender.avatarUrl} name={message.sender.displayName} size={28} />
      )}
      <View style={{ maxWidth: "78%", marginLeft: !mine && showAvatar ? 8 : 0 }}>
        {!mine && showAvatar && (
          <Text style={{ color: c.mutedForeground, fontSize: 11, marginBottom: 2, marginLeft: 4 }}>
            {message.sender.displayName}
          </Text>
        )}
        {hasAttachments &&
          message.attachments.map((att) => (
            <Pressable key={att.id} style={styles.attachment}>
              <Image
                source={{ uri: att.thumbnailUrl || att.url }}
                style={styles.attachmentImg}
                contentFit="cover"
                transition={150}
              />
              {att.type === "video" && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={44} color="#fff" />
                </View>
              )}
            </Pressable>
          ))}
        {message.content.length > 0 && (
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: c.primary, borderBottomRightRadius: 4 }
                : { backgroundColor: c.secondary, borderBottomLeftRadius: 4 },
            ]}
          >
            <Text style={{ color: mine ? "#fff" : c.foreground, fontSize: 15, lineHeight: 20 }}>
              {message.content}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.time,
            { color: c.mutedForeground, textAlign: mine ? "right" : "left" },
          ]}
        >
          {formatClock(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  callBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 3 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  attachment: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 2,
  },
  attachmentImg: { width: "100%", height: "100%" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0003",
  },
  time: { fontSize: 10, marginTop: 2, marginHorizontal: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
