import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DeviceEventEmitter,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGetUser, type Message, type Profile } from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { useChatPreferences } from "@/lib/chatPreferences";

type CallState =
  | { phase: "idle" }
  | { phase: "outgoing"; peerId: string; video: boolean }
  | { phase: "incoming"; peerId: string; video: boolean }
  | { phase: "active"; peerId: string; video: boolean };

interface InAppMsgBanner {
  id: number;
  conversationId: number;
  senderName: string;
  senderAvatar?: string | null;
  preview: string;
}

interface CallContextValue {
  startCall: (peer: Profile | string, withVideo: boolean) => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe, sendSignal } = useRealtime();
  const { lockedChatIds, mutedChatIds, deletedChatIds } = useChatPreferences();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const c = useColors();

  const [call, setCall] = useState<CallState>({ phase: "idle" });
  const [msgBanner, setMsgBanner] = useState<InAppMsgBanner | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const peerId = "peerId" in call ? call.peerId : undefined;

  // Vibrate phone continuously while an incoming call is ringing
  useEffect(() => {
    if (call.phase === "incoming") {
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 600, 400, 600], true);
      }
      return () => {
        if (Platform.OS !== "web") {
          Vibration.cancel();
        }
      };
    } else {
      if (Platform.OS !== "web") {
        Vibration.cancel();
      }
    }
  }, [call.phase]);

  const endCall = useCallback(() => {
    if (peerId && user) {
      if (call.phase === "incoming") {
        sendSignal({ type: "call:reject", from: user.id, to: peerId });
      } else {
        sendSignal({ type: "call:end", from: user.id, to: peerId });
      }
    }
    setCall({ phase: "idle" });
  }, [peerId, user, call.phase, sendSignal]);

  const startCall = useCallback(
    (peer: Profile | string, withVideo: boolean) => {
      if (!user) return;
      const id = typeof peer === "string" ? peer : peer.id;
      setCall({ phase: "outgoing", peerId: id, video: withVideo });
      sendSignal({ type: "call:offer", from: user.id, to: id, video: withVideo });
    },
    [user, sendSignal],
  );

  const accept = useCallback(() => {
    if (call.phase !== "incoming" || !user) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sendSignal({ type: "call:answer", from: user.id, to: call.peerId });
    setCall({ phase: "active", peerId: call.peerId, video: call.video });
  }, [call, user, sendSignal]);

  useEffect(() => {
    const unsub = subscribe((event: RealtimeEvent) => {
      if (!user) return;

      // 1. Incoming/active Call signals ALWAYS come through directly, even for locked chats!
      const e = event as {
        type: string;
        from?: string;
        to?: string;
        video?: boolean;
        conversationId?: number;
        message?: Message;
      };

      if (
        e.type === "call:offer" ||
        e.type === "call:answer" ||
        e.type === "call:end" ||
        e.type === "call:reject"
      ) {
        if (e.to && e.to !== user.id) return;
        switch (e.type) {
          case "call:offer":
            if (e.from) {
              // Dismiss any blocking secondary modals so the incoming call screen shows directly
              DeviceEventEmitter.emit("himewo:incoming-call");
              setMsgBanner(null);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setCall({ phase: "incoming", peerId: e.from, video: Boolean(e.video) });
            }
            break;
          case "call:answer":
            setCall((prev) =>
              prev.phase === "outgoing"
                ? { phase: "active", peerId: prev.peerId, video: prev.video }
                : prev,
            );
            break;
          case "call:end":
          case "call:reject":
            setCall({ phase: "idle" });
            break;
        }
        return;
      }

      // 2. Incoming Message notifications: NEVER show for locked or muted chats!
      if (e.type === "message" && e.message && typeof e.conversationId === "number") {
        if (e.message.sender?.id === user.id) return;
        const convId = e.conversationId;
        if (
          lockedChatIds.includes(convId) ||
          mutedChatIds.includes(convId) ||
          deletedChatIds.includes(convId)
        ) {
          return;
        }
        // Don't show banner if user is already inside this conversation screen
        if (pathname === `/messages/${convId}`) {
          return;
        }
        const preview =
          e.message.type === "text"
            ? e.message.content || "Sent a message"
            : e.message.type === "image"
              ? "📷 Sent a photo"
              : e.message.type === "video"
                ? "🎥 Sent a video"
                : e.message.type === "audio"
                  ? "🎤 Voice message"
                  : "Sent an attachment";

        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        setMsgBanner({
          id: e.message.id || Date.now(),
          conversationId: convId,
          senderName: e.message.sender?.displayName || "New Message",
          senderAvatar: e.message.sender?.avatarUrl,
          preview,
        });
        bannerTimerRef.current = setTimeout(() => {
          setMsgBanner(null);
        }, 4000);
      }
    });
    return unsub;
  }, [subscribe, user, lockedChatIds, mutedChatIds, deletedChatIds, pathname]);

  const value = useMemo(() => ({ startCall, endCall }), [startCall, endCall]);

  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Top In-App Message Notification Banner (only for unlocked & unmuted chats) */}
      {msgBanner && call.phase === "idle" && (
        <View
          pointerEvents="box-none"
          style={[
            styles.bannerContainer,
            { top: Math.max(insets.top + 8, 16) },
          ]}
        >
          <Pressable
            onPress={() => {
              const targetId = msgBanner.conversationId;
              setMsgBanner(null);
              router.push(`/messages/${targetId}`);
            }}
            style={[
              styles.bannerCard,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <Avatar uri={msgBanner.senderAvatar} name={msgBanner.senderName} size={42} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: c.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                }}
              >
                {msgBanner.senderName}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: c.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginTop: 1,
                }}
              >
                {msgBanner.preview}
              </Text>
            </View>
            <Pressable
              onPress={(ev) => {
                ev.stopPropagation();
                setMsgBanner(null);
              }}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={18} color={c.mutedForeground} />
            </Pressable>
          </Pressable>
        </View>
      )}

      {/* Full-Screen Call Overlay (always enters directly even for locked chats) */}
      {call.phase !== "idle" && peerId && (
        <CallOverlay
          state={call}
          peerId={peerId}
          onAccept={accept}
          onEnd={endCall}
        />
      )}
    </CallContext.Provider>
  );
}

function CallOverlay({
  state,
  peerId,
  onAccept,
  onEnd,
}: {
  state: CallState;
  peerId: string;
  onAccept: () => void;
  onEnd: () => void;
}) {
  const c = useColors();
  const { data: peer } = useGetUser(peerId);
  const profile = peer as Profile | undefined;
  const video = "video" in state ? state.video : false;

  const statusText =
    state.phase === "outgoing"
      ? "Calling..."
      : state.phase === "incoming"
        ? `Incoming ${video ? "video " : "voice "}call...`
        : "Connected";

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={{ alignItems: "center", gap: 14, marginTop: 90 }}>
          <View style={styles.avatarRingWrap}>
            <Avatar uri={profile?.avatarUrl} name={profile?.displayName} size={124} ring />
          </View>
          <Text style={styles.name}>{profile?.displayName ?? "Incoming Call"}</Text>
          <View style={styles.statusPill}>
            <Ionicons
              name={video ? "videocam" : "call"}
              size={15}
              color="#34d399"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.status}>{statusText}</Text>
          </View>
          {state.phase === "active" && (
            <Text style={styles.note}>
              {video ? "Video" : "Voice"} call connected
            </Text>
          )}
        </View>

        <View style={styles.controls}>
          {state.phase === "incoming" ? (
            <>
              <CallButton color={c.destructive} icon="call" rotate onPress={onEnd} label="Decline" />
              <CallButton
                color="#10b981"
                icon={video ? "videocam" : "call"}
                onPress={onAccept}
                label="Accept"
              />
            </>
          ) : (
            <CallButton color={c.destructive} icon="call" rotate onPress={onEnd} label="End Call" />
          )}
        </View>
      </View>
    </Modal>
  );
}

function CallButton({
  color,
  icon,
  onPress,
  label,
  rotate,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  rotate?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Pressable style={[styles.callBtn, { backgroundColor: color }]} onPress={onPress}>
        <Ionicons
          name={icon}
          size={30}
          color="#fff"
          style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined}
        />
      </Pressable>
      <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </View>
  );
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0f172af5",
    justifyContent: "space-between",
    paddingBottom: 76,
  },
  avatarRingWrap: {
    padding: 8,
    borderRadius: 80,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  name: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  status: { color: "#e5e7eb", fontSize: 15, fontFamily: "Inter_500Medium" },
  note: { color: "#9ca3af", fontSize: 13, marginTop: 8, paddingHorizontal: 40, textAlign: "center" },
  controls: { flexDirection: "row", justifyContent: "center", gap: 64 },
  callBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  bannerContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 999,
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
