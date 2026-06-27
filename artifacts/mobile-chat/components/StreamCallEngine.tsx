import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert, Modal, StyleSheet, View } from "react-native";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  RingingCallContent,
  useCalls,
} from "@stream-io/video-react-native-sdk";
import { useAuth } from "@/lib/auth";
import { fetchStreamCredentials, CallsUnavailableError } from "@/lib/calls";
import { CallContext, type CallContextValue } from "./callContext";

/**
 * Native (dev build) engine: connects to Stream Video and places/receives real
 * WebRTC voice & video calls with ringing. Requires a native build — it cannot
 * run in Expo Go or on web (those use the `CallEngine.tsx` fallback).
 */
export default function CallEngine({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [client, setClient] = useState<StreamVideoClient | null>(null);

  useEffect(() => {
    if (!user) {
      setClient(null);
      return;
    }
    let active = true;
    let created: StreamVideoClient | null = null;

    (async () => {
      try {
        const creds = await fetchStreamCredentials();
        if (!active) return;
        created = StreamVideoClient.getOrCreateInstance({
          apiKey: creds.apiKey,
          user: {
            id: creds.userId,
            name: user.displayName,
            image: user.avatarUrl ?? undefined,
          },
          token: creds.token,
        });
        setClient(created);
      } catch (err) {
        if (!(err instanceof CallsUnavailableError)) {
          console.warn("Could not connect to call service", err);
        }
      }
    })();

    return () => {
      active = false;
      created?.disconnectUser().catch(() => {});
      setClient(null);
    };
  }, [user]);

  const startCall = useCallback<CallContextValue["startCall"]>(
    (peer, withVideo) => {
      const peerId = typeof peer === "string" ? peer : peer.id;
      if (!client || !user) {
        Alert.alert(
          "Calls unavailable",
          "Could not connect to the call service. Please try again in a moment.",
        );
        return;
      }
      void (async () => {
        try {
          const callId = `${[user.id, peerId].sort().join("-")}-${Date.now()}`;
          const call = client.call("default", callId);
          await call.getOrCreate({
            ring: true,
            data: {
              members: [{ user_id: user.id }, { user_id: peerId }],
            },
          });
          if (!withVideo) {
            await call.camera.disable();
          }
        } catch {
          Alert.alert("Call failed", "Could not start the call. Please try again.");
        }
      })();
    },
    [client, user],
  );

  const endCall = useCallback(() => {
    const active = client?.state.calls.find(() => true);
    active?.leave().catch(() => {});
  }, [client]);

  const value = useMemo<CallContextValue>(
    () => ({ startCall, endCall }),
    [startCall, endCall],
  );

  if (!client) {
    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
  }

  return (
    <CallContext.Provider value={value}>
      <StreamVideo client={client}>
        {children}
        <CallOverlay />
      </StreamVideo>
    </CallContext.Provider>
  );
}

function CallOverlay() {
  const calls = useCalls();
  const call = calls[0];
  if (!call) return null;

  return (
    <Modal visible animationType="slide">
      <View style={styles.fill}>
        <StreamCall call={call}>
          <RingingCallContent />
        </StreamCall>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
});
