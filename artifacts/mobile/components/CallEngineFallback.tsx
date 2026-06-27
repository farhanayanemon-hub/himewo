import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetUser, type Profile } from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";
import { useColors } from "@/hooks/useColors";
import { CallContext, type CallContextValue } from "./callContext";

type CallState =
  | { phase: "idle" }
  | { phase: "outgoing"; peerId: string; video: boolean }
  | { phase: "incoming"; peerId: string; video: boolean }
  | { phase: "active"; peerId: string; video: boolean };

/**
 * Web / Expo Go fallback: signals call intent over the realtime socket and
 * shows a calling overlay, but cannot stream live audio/video (that needs the
 * native build with WebRTC). Also the module tsc resolves for `./CallEngine`.
 */
export default function CallEngine({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe, sendSignal } = useRealtime();
  const [call, setCall] = useState<CallState>({ phase: "idle" });

  const peerId = "peerId" in call ? call.peerId : undefined;

  const endCall = useCallback(() => {
    if (peerId && user) {
      sendSignal({ type: "call:end", from: user.id, to: peerId });
    }
    setCall({ phase: "idle" });
  }, [peerId, user, sendSignal]);

  const startCall = useCallback<CallContextValue["startCall"]>(
    (peer, withVideo) => {
      if (!user) return;
      const id = typeof peer === "string" ? peer : peer.id;
      setCall({ phase: "outgoing", peerId: id, video: withVideo });
      sendSignal({ type: "call:offer", from: user.id, to: id, video: withVideo });
    },
    [user, sendSignal],
  );

  const accept = useCallback(() => {
    if (call.phase !== "incoming" || !user) return;
    sendSignal({ type: "call:answer", from: user.id, to: call.peerId });
    setCall({ phase: "active", peerId: call.peerId, video: call.video });
  }, [call, user, sendSignal]);

  useEffect(() => {
    const unsub = subscribe((event: RealtimeEvent) => {
      if (!user) return;
      const e = event as { type: string; from?: string; to?: string; video?: boolean };
      if (e.to && e.to !== user.id) return;
      switch (e.type) {
        case "call:offer":
          if (e.from) {
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
    });
    return unsub;
  }, [subscribe, user]);

  const value = useMemo<CallContextValue>(
    () => ({ startCall, endCall }),
    [startCall, endCall],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {call.phase !== "idle" && peerId && (
        <CallOverlay state={call} peerId={peerId} onAccept={accept} onEnd={endCall} />
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
        ? `Incoming ${video ? "video " : ""}call`
        : "Connected";

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={{ alignItems: "center", gap: 14, marginTop: 80 }}>
          <Avatar uri={profile?.avatarUrl} name={profile?.displayName} size={120} ring />
          <Text style={styles.name}>{profile?.displayName ?? "Connecting"}</Text>
          <Text style={styles.status}>{statusText}</Text>
          {state.phase === "active" && (
            <Text style={styles.note}>
              Live {video ? "video" : "audio"} streaming requires the installed app
              (native build).
            </Text>
          )}
        </View>

        <View style={styles.controls}>
          {state.phase === "incoming" ? (
            <>
              <CallButton color={c.destructive} icon="call" rotate onPress={onEnd} label="Decline" />
              <CallButton color="#31a24c" icon="call" onPress={onAccept} label="Accept" />
            </>
          ) : (
            <CallButton color={c.destructive} icon="call" rotate onPress={onEnd} label="End" />
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
    <View style={{ alignItems: "center", gap: 6 }}>
      <Touchable style={[styles.callBtn, { backgroundColor: color }]} onPress={onPress}>
        <Ionicons
          name={icon}
          size={30}
          color="#fff"
          style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined}
        />
      </Touchable>
      <Text style={{ color: "#fff", fontSize: fs(13) }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#111827f2",
    justifyContent: "space-between",
    paddingBottom: 70,
  },
  name: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: fs(26) },
  status: { color: "#d1d5db", fontSize: fs(15) },
  note: { color: "#9ca3af", fontSize: fs(12), marginTop: 8, paddingHorizontal: 40, textAlign: "center" },
  controls: { flexDirection: "row", justifyContent: "center", gap: 50 },
  callBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
  },
});
