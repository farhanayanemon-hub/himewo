import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";

/**
 * Messenger-style in-app chat heads.
 *
 * While the app is open, an incoming message for a conversation you are NOT
 * currently viewing shows:
 *   1. a top banner (sender + preview, auto-hides), and
 *   2. a draggable floating chat-head bubble with an unread count.
 * Tapping the head (or banner) opens that conversation; drag the head to the
 * bottom "X" zone to dismiss it.
 *
 * True OS-level chat heads (outside the app) need a native Android build with
 * the overlay permission — not possible in the web/Expo Go preview.
 */

interface HeadState {
  conversationId: number;
  senderName: string;
  avatarUrl: string | null;
  unread: number;
  preview: string;
}

interface IncomingMessage {
  id?: number;
  senderId?: string;
  content?: string;
  mediaType?: string | null;
  sender?: { id?: string; displayName?: string; avatarUrl?: string | null };
}

const HEAD_SIZE = 56;
const BANNER_HIDE_MS = 4000;

function previewText(m: IncomingMessage): string {
  const t = (m.content ?? "").trim();
  if (t) return t.length > 60 ? `${t.slice(0, 60)}…` : t;
  if (m.mediaType === "image") return "📷 Photo";
  if (m.mediaType === "video") return "🎬 Video";
  if (m.mediaType === "audio") return "🎤 Voice message";
  return "Sent you a message";
}

export function ChatHeads() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const pathname = usePathname();

  const [head, setHead] = useState<HeadState | null>(null);
  const [banner, setBanner] = useState<HeadState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [overClose, setOverClose] = useState(false);

  // Route awareness must be fresh inside the ws handler.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const userIdRef = useRef<string | null>(user?.id ?? null);
  userIdRef.current = user?.id ?? null;

  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerY = useRef(new Animated.Value(-120)).current;

  const win = Dimensions.get("window");
  const pan = useRef(
    new Animated.ValueXY({
      x: win.width - HEAD_SIZE - 12,
      y: win.height * 0.55,
    }),
  ).current;
  const panPos = useRef({ x: win.width - HEAD_SIZE - 12, y: win.height * 0.55 });
  useEffect(() => {
    const id = pan.addListener((v) => {
      panPos.current = v;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const hideBanner = useCallback(() => {
    Animated.timing(bannerY, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setBanner(null));
  }, [bannerY]);

  const showBanner = useCallback(
    (h: HeadState) => {
      setBanner(h);
      Animated.spring(bannerY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(hideBanner, BANNER_HIDE_MS);
    },
    [bannerY, hideBanner],
  );

  useEffect(() => {
    const unsub = subscribe((ev: RealtimeEvent) => {
      if (ev.type !== "message") return;
      const conversationId = (ev as { conversationId: number }).conversationId;
      const msg = ((ev as { message?: unknown }).message ?? {}) as IncomingMessage;
      const senderId = msg.senderId ?? msg.sender?.id;
      if (!senderId || senderId === userIdRef.current) return;
      // Already looking at this conversation — the thread screen handles it.
      if (pathRef.current === `/messages/${conversationId}`) return;

      const next: HeadState = {
        conversationId,
        senderName: msg.sender?.displayName ?? "New message",
        avatarUrl: msg.sender?.avatarUrl ?? null,
        unread: 1,
        preview: previewText(msg),
      };
      setHead((prev) =>
        prev && prev.conversationId === conversationId
          ? { ...next, unread: prev.unread + 1 }
          : next,
      );
      showBanner(next);
    });
    return unsub;
  }, [subscribe, showBanner]);

  // Leaving into the conversation clears its head.
  useEffect(() => {
    if (head && pathname === `/messages/${head.conversationId}`) setHead(null);
    if (banner && pathname === `/messages/${banner.conversationId}`) {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      setBanner(null);
      bannerY.setValue(-120);
    }
  }, [pathname, head, banner, bannerY]);

  const openConversation = useCallback((conversationId: number) => {
    setHead(null);
    setBanner(null);
    router.push(`/messages/${conversationId}`);
  }, []);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        setDragging(true);
        pan.setOffset({ x: panPos.current.x, y: panPos.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (e, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        const { width, height } = Dimensions.get("window");
        const cx = e.nativeEvent.pageX;
        const cy = e.nativeEvent.pageY;
        setOverClose(
          cy > height - 140 && cx > width / 2 - 70 && cx < width / 2 + 70,
        );
      },
      onPanResponderRelease: (e) => {
        pan.flattenOffset();
        setDragging(false);
        const { width, height } = Dimensions.get("window");
        const cx = e.nativeEvent.pageX;
        const cy = e.nativeEvent.pageY;
        if (cy > height - 140 && cx > width / 2 - 70 && cx < width / 2 + 70) {
          setOverClose(false);
          setHead(null);
          return;
        }
        setOverClose(false);
        // Snap to nearest horizontal edge, clamp vertically.
        const targetX =
          panPos.current.x + HEAD_SIZE / 2 < width / 2
            ? 12
            : width - HEAD_SIZE - 12;
        const targetY = Math.min(
          Math.max(panPos.current.y, 80),
          height - HEAD_SIZE - 120,
        );
        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    }),
  ).current;

  if (!head && !banner) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {banner ? (
        <Animated.View
          style={[
            styles.banner,
            {
              top: insets.top + 8,
              backgroundColor: c.card,
              borderColor: c.cardBorder,
              transform: [{ translateY: bannerY }],
            },
          ]}
        >
          <Pressable
            style={styles.bannerInner}
            onPress={() => openConversation(banner.conversationId)}
          >
            <Avatar uri={banner.avatarUrl} name={banner.senderName} size={40} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.bannerName, { color: c.text }]} numberOfLines={1}>
                {banner.senderName}
              </Text>
              <Text
                style={[styles.bannerPreview, { color: c.mutedForeground }]}
                numberOfLines={1}
              >
                {banner.preview}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={hideBanner}>
              <Ionicons name="close" size={18} color={c.mutedForeground} />
            </Pressable>
          </Pressable>
        </Animated.View>
      ) : null}

      {head && dragging ? (
        <View
          pointerEvents="none"
          style={[
            styles.closeZone,
            { bottom: insets.bottom + 40 },
            overClose && styles.closeZoneActive,
          ]}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </View>
      ) : null}

      {head ? (
        <Animated.View
          {...responder.panHandlers}
          style={[
            styles.head,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
          ]}
        >
          <Pressable
            onPress={() => openConversation(head.conversationId)}
            hitSlop={8}
          >
            <View style={[styles.headBubble, { borderColor: c.card }]}>
              <Avatar uri={head.avatarUrl} name={head.senderName} size={HEAD_SIZE} />
            </View>
            {head.unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {head.unread > 9 ? "9+" : head.unread}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 40,
  },
  bannerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bannerPreview: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  head: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 50,
  },
  headBubble: {
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f02849",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  closeZone: {
    position: "absolute",
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 45,
  },
  closeZoneActive: { backgroundColor: "#f02849", transform: [{ scale: 1.15 }] },
});
