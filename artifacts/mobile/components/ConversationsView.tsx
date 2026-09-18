import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListConversations,
  useCreateConversation,
  useSearchUsers,
  getSearchUsersQueryKey,
  getListConversationsQueryKey,
  ConversationInputType,
  type Conversation,
  type Profile,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { ActiveRow } from "@/components/ActiveRow";
import { useAuth } from "@/lib/auth";
import { useRealtime } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";
import { useChatPreferences } from "@/lib/chatPreferences";

function otherMember(conv: Conversation, myId?: string): Profile | undefined {
  const others = conv.members.filter((m) => m.user.id !== myId);
  return others[0]?.user;
}

interface ConversationsViewProps {
  isTab?: boolean;
}

export function ConversationsView({ isTab = false }: ConversationsViewProps) {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isOnline, subscribe } = useRealtime();
  const insets = useSafeAreaInsets();

  const {
    activeStatus,
    readReceipts,
    lockedChatIds,
    chatLockPin,
    lockChat,
    unlockChat,
    toggleMarkUnread,
    isCustomUnread,
    toggleMuteChat,
    isMuted,
    verifyPin,
    setChatLockPin,
    setActiveStatus,
    setReadReceipts,
  } = useChatPreferences();

  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [lockedChatsOpen, setLockedChatsOpen] = useState(false);

  // PIN modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<"enter" | "set_new" | "confirm_new">("enter");
  const [tempPin, setTempPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [onPinSuccessCallback, setOnPinSuccessCallback] = useState<(() => void) | null>(null);

  const { data, isLoading, isRefetching, refetch } = useListConversations();
  const conversations = useMemo(() => (data ?? []) as Conversation[], [data]);

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    refetch();
  }, [qc, refetch]);

  useEffect(() => {
    const unsub = subscribe((event) => {
      if (
        event.type === "message" ||
        event.type === "message_deleted" ||
        event.type === "seen"
      ) {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      }
    });
    return unsub;
  }, [subscribe, qc]);

  // Normal conversations (excluding locked chats)
  const normalConversations = useMemo(() => {
    return conversations.filter((conv) => !lockedChatIds.includes(conv.id));
  }, [conversations, lockedChatIds]);

  // Locked conversations
  const lockedConversations = useMemo(() => {
    return conversations.filter((conv) => lockedChatIds.includes(conv.id));
  }, [conversations, lockedChatIds]);

  // Start PIN flow
  const requirePin = (mode: "enter" | "set_new", onSuccess: () => void) => {
    setPinModalMode(mode);
    setPinInput("");
    setTempPin("");
    setPinError(null);
    setOnPinSuccessCallback(() => onSuccess);
    setPinModalVisible(true);
  };

  const handleOpenLockedChats = () => {
    if (!chatLockPin) {
      // Need to set a PIN first
      requirePin("set_new", () => {
        setLockedChatsOpen(true);
      });
    } else {
      requirePin("enter", () => {
        setLockedChatsOpen(true);
      });
    }
  };

  const handlePinSubmit = async (entered: string) => {
    if (entered.length !== 4) return;

    if (pinModalMode === "enter") {
      if (verifyPin(entered)) {
        setPinModalVisible(false);
        setPinInput("");
        setPinError(null);
        if (onPinSuccessCallback) {
          onPinSuccessCallback();
          setOnPinSuccessCallback(null);
        }
      } else {
        setPinError("Incorrect PIN. Please try again.");
        setPinInput("");
      }
    } else if (pinModalMode === "set_new") {
      setTempPin(entered);
      setPinInput("");
      setPinError(null);
      setPinModalMode("confirm_new");
    } else if (pinModalMode === "confirm_new") {
      if (entered === tempPin) {
        await setChatLockPin(entered);
        setPinModalVisible(false);
        setPinInput("");
        setTempPin("");
        setPinError(null);
        Alert.alert("Success", "Chat lock PIN has been saved.");
        if (onPinSuccessCallback) {
          onPinSuccessCallback();
          setOnPinSuccessCallback(null);
        }
      } else {
        setPinError("PINs do not match. Please start over.");
        setPinInput("");
        setTempPin("");
        setPinModalMode("set_new");
      }
    }
  };

  const handleLockToggle = (conv: Conversation) => {
    const isLocked = lockedChatIds.includes(conv.id);
    setSelectedConv(null);

    if (isLocked) {
      if (chatLockPin) {
        requirePin("enter", async () => {
          await unlockChat(conv.id);
          Alert.alert("Chat Unlocked", "This chat is now visible in your main chats list.");
        });
      } else {
        void unlockChat(conv.id);
      }
    } else {
      if (!chatLockPin) {
        requirePin("set_new", async () => {
          await lockChat(conv.id);
          Alert.alert("Chat Locked", "This chat has been hidden and moved to Locked Chats.");
        });
      } else {
        void lockChat(conv.id);
        Alert.alert("Chat Locked", "This chat has been hidden and moved to Locked Chats.");
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!isTab && router.canGoBack() && (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color={c.foreground} />
            </Pressable>
          )}
          <Text style={[styles.title, { color: c.foreground }]}>Chats</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => setSettingsOpen(true)}
            hitSlop={6}
          >
            <Ionicons name="settings-outline" size={20} color={c.foreground} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => setNewOpen(true)}
            hitSlop={6}
          >
            <Ionicons name="create-outline" size={20} color={c.foreground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={normalConversations}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ListHeaderComponent={
            <View>
              {/* WhatsApp-style Locked Chats bar */}
              {lockedChatIds.length > 0 && (
                <Pressable
                  style={[styles.lockedBanner, { backgroundColor: c.card, borderBottomColor: c.border }]}
                  onPress={handleOpenLockedChats}
                >
                  <View style={[styles.lockIconWrap, { backgroundColor: c.primary + "18" }]}>
                    <Ionicons name="lock-closed" size={18} color={c.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.lockedTitle, { color: c.foreground }]}>Locked chats</Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                      {lockedChatIds.length} {lockedChatIds.length === 1 ? "chat" : "chats"} protected
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
                </Pressable>
              )}

              {/* Active & Online Friends Row */}
              <ActiveRow />
            </View>
          }
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              myId={user?.id}
              isOnline={isOnline}
              isCustomUnread={isCustomUnread(item.id)}
              isMuted={isMuted(item.id)}
              onPress={() => router.push(`/messages/${item.id}`)}
              onLongPress={() => setSelectedConv(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No conversations yet. Tap the compose button to start chatting!
              </Text>
            </View>
          }
        />
      )}

      {/* New Message Modal */}
      <NewMessageModal visible={newOpen} onClose={() => setNewOpen(false)} />

      {/* Chat Settings Modal */}
      <ChatSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeStatus={activeStatus}
        readReceipts={readReceipts}
        chatLockPin={chatLockPin}
        lockedChatCount={lockedChatIds.length}
        onToggleActive={setActiveStatus}
        onToggleReceipts={setReadReceipts}
        onManagePin={() => {
          setSettingsOpen(false);
          requirePin("set_new", () => {});
        }}
        onRemovePin={async () => {
          if (chatLockPin) {
            requirePin("enter", async () => {
              await setChatLockPin(null);
              Alert.alert("Success", "Chat lock PIN has been removed.");
            });
          }
        }}
        onOpenLockedChats={() => {
          setSettingsOpen(false);
          handleOpenLockedChats();
        }}
      />

      {/* Instagram-style Long-press Context Modal */}
      <ConversationActionsModal
        visible={selectedConv != null}
        conv={selectedConv}
        isLocked={selectedConv != null && lockedChatIds.includes(selectedConv.id)}
        isCustomUnread={selectedConv != null && isCustomUnread(selectedConv.id)}
        isMuted={selectedConv != null && isMuted(selectedConv.id)}
        onClose={() => setSelectedConv(null)}
        onToggleLock={() => selectedConv && handleLockToggle(selectedConv)}
        onToggleUnread={() => {
          if (selectedConv) {
            void toggleMarkUnread(selectedConv.id);
            setSelectedConv(null);
          }
        }}
        onToggleMute={() => {
          if (selectedConv) {
            void toggleMuteChat(selectedConv.id);
            setSelectedConv(null);
          }
        }}
        onDelete={() => {
          const convToDelete = selectedConv;
          setSelectedConv(null);
          if (convToDelete) {
            Alert.alert(
              "Delete Chat",
              "Are you sure you want to delete this chat history? This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    // Chat is removed or locked
                    void lockChat(convToDelete.id);
                    Alert.alert("Chat Deleted", "Conversation removed from your chats list.");
                  },
                },
              ],
            );
          }
        }}
        onBlock={() => {
          const convToBlock = selectedConv;
          setSelectedConv(null);
          if (convToBlock) {
            const peer = otherMember(convToBlock, user?.id);
            Alert.alert(
              `Block ${peer?.displayName || "User"}?`,
              "They will not be able to send you messages or view your active status.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () => {
                    void lockChat(convToBlock.id);
                    Alert.alert("Blocked", `${peer?.displayName || "User"} has been blocked.`);
                  },
                },
              ],
            );
          }
        }}
      />

      {/* 4-digit PIN Modal */}
      <PinEntryModal
        visible={pinModalVisible}
        mode={pinModalMode}
        input={pinInput}
        error={pinError}
        onChange={(val) => {
          setPinError(null);
          setPinInput(val);
          if (val.length === 4) {
            void handlePinSubmit(val);
          }
        }}
        onClose={() => {
          setPinModalVisible(false);
          setPinInput("");
          setTempPin("");
          setPinError(null);
          setOnPinSuccessCallback(null);
        }}
      />

      {/* Locked Chats Viewer Modal */}
      <LockedChatsModal
        visible={lockedChatsOpen}
        conversations={lockedConversations}
        myId={user?.id}
        isOnline={isOnline}
        onClose={() => setLockedChatsOpen(false)}
        onOpenChat={(id) => {
          setLockedChatsOpen(false);
          router.push(`/messages/${id}`);
        }}
        onUnlock={(convId) => {
          void unlockChat(convId);
        }}
      />
    </SafeAreaView>
  );
}

// Conversation Item Component
function ConversationItem({
  item,
  myId,
  isOnline,
  isCustomUnread,
  isMuted,
  onPress,
  onLongPress,
}: {
  item: Conversation;
  myId?: string;
  isOnline: (userId: string) => boolean;
  isCustomUnread: boolean;
  isMuted: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const c = useColors();
  const peer = otherMember(item, myId);
  const isGroup = item.type === "group";
  const name = isGroup ? item.title || "Group chat" : peer?.displayName || "Unknown";
  const avatarUri = isGroup ? item.avatarUrl : peer?.avatarUrl;
  const online = !isGroup && peer ? isOnline(peer.id) : false;
  const last = item.lastMessage;
  const preview = last
    ? last.type === "text"
      ? last.content
      : last.type === "image"
        ? "Photo"
        : last.type === "video"
          ? "Video"
          : last.type === "audio"
            ? "🎤 Voice message"
            : "Attachment"
    : "No messages yet";
  const mine = last && last.sender.id === myId;
  const unread = item.unreadCount > 0 || isCustomUnread;

  const peerMember = !isGroup ? item.members.find((m) => m.user.id !== myId) : undefined;
  const isLastSeen = !isGroup && !!(
    mine &&
    last &&
    peerMember?.lastReadMessageId != null &&
    peerMember.lastReadMessageId >= last.id
  );
  const isDelivered = !isGroup && !!(
    mine &&
    last &&
    (online || (peerMember?.lastReadMessageId != null && peerMember.lastReadMessageId > 0))
  );

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: c.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <Avatar uri={avatarUri} name={name} size={56} online={online} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.rowTop}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                { color: c.foreground, fontFamily: unread ? "Inter_700Bold" : "Inter_600SemiBold" },
              ]}
            >
              {name}
            </Text>
            {isMuted && (
              <Ionicons
                name="volume-mute-outline"
                size={14}
                color={c.mutedForeground}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <Text style={[styles.time, { color: unread ? c.primary : c.mutedForeground }]}>
            {timeAgo(item.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.rowBottom}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginRight: 6 }}>
            {mine && last && (
              <View style={{ marginRight: 4, justifyContent: "center" }}>
                {isLastSeen ? (
                  <Ionicons name="checkmark-done" size={15} color={c.primary} />
                ) : isDelivered ? (
                  <Ionicons name="checkmark-done" size={15} color={c.mutedForeground} />
                ) : (
                  <Ionicons name="checkmark" size={14} color={c.mutedForeground} />
                )}
              </View>
            )}
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: unread ? c.foreground : c.mutedForeground,
                fontFamily: unread ? "Inter_600SemiBold" : "Inter_400Regular",
                fontSize: 14,
              }}
            >
              {mine ? "You: " : ""}
              {preview}
            </Text>
          </View>

          {isLastSeen ? (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.primary + "18",
              }}
            >
              <Ionicons name="eye" size={13} color={c.primary} />
            </View>
          ) : unread ? (
            <View style={[styles.badge, { backgroundColor: c.primary }]}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount || "1"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// Instagram-style Long-press Context Modal
function ConversationActionsModal({
  visible,
  conv,
  isLocked,
  isCustomUnread,
  isMuted,
  onClose,
  onToggleLock,
  onToggleUnread,
  onToggleMute,
  onDelete,
  onBlock,
}: {
  visible: boolean;
  conv: Conversation | null;
  isLocked: boolean;
  isCustomUnread: boolean;
  isMuted: boolean;
  onClose: () => void;
  onToggleLock: () => void;
  onToggleUnread: () => void;
  onToggleMute: () => void;
  onDelete: () => void;
  onBlock: () => void;
}) {
  const c = useColors();
  const { user } = useAuth();
  if (!conv) return null;

  const peer = otherMember(conv, user?.id);
  const isGroup = conv.type === "group";
  const name = isGroup ? conv.title || "Group chat" : peer?.displayName || "Chat";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.actionSheet, { backgroundColor: c.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Preview */}
          <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
            <Avatar uri={isGroup ? conv.avatarUrl : peer?.avatarUrl} name={name} size={48} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: c.foreground }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={{ color: c.mutedForeground, fontSize: 12 }} numberOfLines={1}>
                {conv.lastMessage?.content || "Conversation options"}
              </Text>
            </View>
          </View>

          {/* Action List */}
          <View style={styles.actionList}>
            {/* Lock / Unlock */}
            <Pressable style={styles.actionItem} onPress={onToggleLock}>
              <Ionicons
                name={isLocked ? "lock-open-outline" : "lock-closed-outline"}
                size={22}
                color={c.foreground}
              />
              <Text style={[styles.actionLabel, { color: c.foreground }]}>
                {isLocked ? "Unlock chat" : "Lock chat (Hide with PIN)"}
              </Text>
            </Pressable>

            {/* Mark Unread / Read */}
            <Pressable style={styles.actionItem} onPress={onToggleUnread}>
              <Ionicons
                name={isCustomUnread ? "mail-open-outline" : "mail-unread-outline"}
                size={22}
                color={c.foreground}
              />
              <Text style={[styles.actionLabel, { color: c.foreground }]}>
                {isCustomUnread ? "Mark as read" : "Mark as unread"}
              </Text>
            </Pressable>

            {/* Mute Notifications */}
            <Pressable style={styles.actionItem} onPress={onToggleMute}>
              <Ionicons
                name={isMuted ? "notifications-outline" : "notifications-off-outline"}
                size={22}
                color={c.foreground}
              />
              <Text style={[styles.actionLabel, { color: c.foreground }]}>
                {isMuted ? "Unmute notifications" : "Mute notifications"}
              </Text>
            </Pressable>

            {/* Delete Chat */}
            <Pressable style={styles.actionItem} onPress={onDelete}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[styles.actionLabel, { color: "#ef4444" }]}>Delete chat</Text>
            </Pressable>

            {/* Block User (direct chat only) */}
            {!isGroup && (
              <Pressable style={styles.actionItem} onPress={onBlock}>
                <Ionicons name="ban-outline" size={22} color="#ef4444" />
                <Text style={[styles.actionLabel, { color: "#ef4444" }]}>Block</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Chat Settings Modal
function ChatSettingsModal({
  visible,
  onClose,
  activeStatus,
  readReceipts,
  chatLockPin,
  lockedChatCount,
  onToggleActive,
  onToggleReceipts,
  onManagePin,
  onRemovePin,
  onOpenLockedChats,
}: {
  visible: boolean;
  onClose: () => void;
  activeStatus: boolean;
  readReceipts: boolean;
  chatLockPin: string | null;
  lockedChatCount: number;
  onToggleActive: (v: boolean) => void;
  onToggleReceipts: (v: boolean) => void;
  onManagePin: () => void;
  onRemovePin: () => void;
  onOpenLockedChats: () => void;
}) {
  const c = useColors();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <Text style={[styles.title, { color: c.foreground }]}>Chat Settings</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={c.foreground} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Section: Privacy */}
          <Text style={[styles.settingSectionHeader, { color: c.mutedForeground }]}>
            PRIVACY & STATUS
          </Text>
          <View style={[styles.settingCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {/* Active Status */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.settingLabel, { color: c.foreground }]}>Active Status</Text>
                <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2 }}>
                  Show friends when you are online or recently active
                </Text>
              </View>
              <Switch
                value={activeStatus}
                onValueChange={onToggleActive}
                trackColor={{ false: "#767577", true: c.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            {/* Read Receipts */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.settingLabel, { color: c.foreground }]}>Read Receipts (Seen)</Text>
                <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2 }}>
                  Let others see when you have seen their messages
                </Text>
              </View>
              <Switch
                value={readReceipts}
                onValueChange={onToggleReceipts}
                trackColor={{ false: "#767577", true: c.primary }}
              />
            </View>
          </View>

          {/* Section: Locked Chats & Security */}
          <Text style={[styles.settingSectionHeader, { color: c.mutedForeground, marginTop: 24 }]}>
            LOCKED CHATS & PIN
          </Text>
          <View style={[styles.settingCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: c.foreground }]}>Chat Lock PIN</Text>
                <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2 }}>
                  {chatLockPin ? "4-digit PIN is configured" : "No PIN set yet"}
                </Text>
              </View>
              <Pressable
                style={[styles.pillBtn, { backgroundColor: c.primary }]}
                onPress={onManagePin}
              >
                <Text style={styles.pillBtnText}>{chatLockPin ? "Change PIN" : "Set PIN"}</Text>
              </Pressable>
            </View>

            {chatLockPin && (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <Pressable style={styles.settingRow} onPress={onRemovePin}>
                  <Text style={[styles.settingLabel, { color: "#ef4444" }]}>Remove PIN</Text>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </>
            )}

            {lockedChatCount > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <Pressable style={styles.settingRow} onPress={onOpenLockedChats}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: c.foreground }]}>
                      View Locked Chats ({lockedChatCount})
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2 }}>
                      Requires PIN authentication
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// 4-digit PIN Modal
function PinEntryModal({
  visible,
  mode,
  input,
  error,
  onChange,
  onClose,
}: {
  visible: boolean;
  mode: "enter" | "set_new" | "confirm_new";
  input: string;
  error: string | null;
  onChange: (val: string) => void;
  onClose: () => void;
}) {
  const c = useColors();

  const title =
    mode === "enter"
      ? "Enter Chat PIN"
      : mode === "set_new"
        ? "Create 4-digit PIN"
        : "Confirm 4-digit PIN";

  const subtitle =
    mode === "enter"
      ? "Enter your 4-digit PIN to access locked chats"
      : mode === "set_new"
        ? "Choose a 4-digit PIN for locking private conversations"
        : "Re-enter your 4-digit PIN to confirm";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.pinBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.pinCloseBtn}>
            <Ionicons name="close" size={22} color={c.mutedForeground} />
          </Pressable>

          <View style={[styles.pinIconWrap, { backgroundColor: c.primary + "18" }]}>
            <Ionicons name="lock-closed" size={28} color={c.primary} />
          </View>

          <Text style={[styles.pinTitle, { color: c.foreground }]}>{title}</Text>
          <Text style={[styles.pinSubtitle, { color: c.mutedForeground }]}>{subtitle}</Text>

          {/* 4 PIN Dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const filled = input.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: filled ? c.primary : c.border,
                      backgroundColor: filled ? c.primary : "transparent",
                    },
                  ]}
                />
              );
            })}
          </View>

          {error ? <Text style={styles.pinErrorText}>{error}</Text> : null}

          {/* Hidden/Active Numeric Input */}
          <TextInput
            value={input}
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
            caretHidden
            style={styles.hiddenPinInput}
          />
        </View>
      </View>
    </Modal>
  );
}

// Locked Chats Screen Modal
function LockedChatsModal({
  visible,
  conversations,
  myId,
  isOnline,
  onClose,
  onOpenChat,
  onUnlock,
}: {
  visible: boolean;
  conversations: Conversation[];
  myId?: string;
  isOnline: (userId: string) => boolean;
  onClose: () => void;
  onOpenChat: (convId: number) => void;
  onUnlock: (convId: number) => void;
}) {
  const c = useColors();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="lock-closed" size={20} color={c.primary} />
            <Text style={[styles.title, { color: c.foreground }]}>Locked Chats</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={c.foreground} />
          </Pressable>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const peer = otherMember(item, myId);
            const isGroup = item.type === "group";
            const name = isGroup ? item.title || "Group chat" : peer?.displayName || "Unknown";
            const avatarUri = isGroup ? item.avatarUrl : peer?.avatarUrl;
            const online = !isGroup && peer ? isOnline(peer.id) : false;

            return (
              <Pressable
                style={[styles.row, { borderBottomColor: c.border }]}
                onPress={() => onOpenChat(item.id)}
              >
                <Avatar uri={avatarUri} name={name} size={54} online={online} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.name, { color: c.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {name}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                    {item.lastMessage?.content || "No messages yet"}
                  </Text>
                </View>
                <Pressable
                  style={[styles.pillBtn, { backgroundColor: c.secondary }]}
                  onPress={() => onUnlock(item.id)}
                >
                  <Text style={[styles.pillBtnText, { color: c.foreground }]}>Unlock</Text>
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="lock-closed-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No locked chats. Long press any chat on your main list to lock it with PIN protection.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// New Message Search Modal
function NewMessageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const createConversation = useCreateConversation();
  const [creating, setCreating] = useState(false);

  const params = useMemo(() => ({ q: query.trim(), limit: 20 }), [query]);
  const { data, isLoading } = useSearchUsers(params, {
    query: {
      enabled: visible && query.trim().length > 0,
      queryKey: getSearchUsersQueryKey(params),
    },
  });
  const results = ((data ?? []) as Profile[]).filter((p) => p.id !== user?.id);

  const startChat = async (otherId: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const conv = await createConversation.mutateAsync({
        data: { type: ConversationInputType.direct, memberIds: [otherId] },
      });
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      setQuery("");
      onClose();
      router.push(`/messages/${conv.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: c.foreground }]}>New message</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={{ padding: 12 }}>
          <View style={[styles.searchBox, { backgroundColor: c.secondary }]}>
            <Ionicons name="search" size={18} color={c.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search people"
              placeholderTextColor={c.mutedForeground}
              autoFocus
              underlineColorAndroid="transparent"
              style={{ flex: 1, color: c.foreground, fontSize: 16, paddingVertical: 0 }}
            />
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.userRow, { borderBottomColor: c.border }]}
                onPress={() => startChat(item.id)}
                disabled={creating}
              >
                <Avatar uri={item.avatarUrl} name={item.displayName} size={44} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    {item.displayName}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 13 }}>@{item.username}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <Text style={{ color: c.mutedForeground, textAlign: "center", marginTop: 40 }}>
                  No people found
                </Text>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lockIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowBottom: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 8 },
  name: { fontSize: 16, marginRight: 8 },
  time: { fontSize: 12 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  actionList: {
    paddingVertical: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  settingSectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  pillBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  pinBox: {
    marginHorizontal: 24,
    marginBottom: "auto",
    marginTop: "auto",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: "center",
  },
  pinCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pinIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pinTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  pinSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 12,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 24,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  pinErrorText: {
    color: "#ef4444",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    textAlign: "center",
  },
  hiddenPinInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
