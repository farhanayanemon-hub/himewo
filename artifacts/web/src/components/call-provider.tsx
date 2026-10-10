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
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  RingingCall,
  SpeakerLayout,
  CallControls,
  CallingState,
  useCalls,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { toast } from "sonner";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useGetUser, type Message, type Profile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";
import { useChatPreferences } from "@/lib/chat-preferences";
import { avatarSrc } from "@/lib/avatar";
import { fetchStreamCredentials, prepareCall, CallsUnavailableError } from "@/lib/calls";

export interface CallPeer {
  id: string;
  name?: string;
  avatarUrl?: string;
}

type SignalCallState =
  | { phase: "idle" }
  | { phase: "outgoing"; peerId: string; peerName?: string; peerAvatar?: string; video: boolean }
  | { phase: "incoming"; peerId: string; video: boolean }
  | { phase: "active"; peerId: string; video: boolean };

interface CallContextValue {
  startCall: (peer: CallPeer, withVideo: boolean) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

function playWebBeep(freq1: number, freq2: number, durationMs = 240) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc.frequency.setValueAtTime(freq2, ctx.currentTime + durationMs / 2000);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, durationMs + 100);
  } catch {
    // Ignore browser autoplay restrictions
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe, sendSignal } = useRealtime();
  const { lockedChatIds, mutedChatIds, deletedChatIds } = useChatPreferences();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [signalCall, setSignalCall] = useState<SignalCallState>({ phase: "idle" });
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ringing tone loop for incoming calls (always active even for locked chats)
  useEffect(() => {
    if (signalCall.phase === "incoming") {
      playWebBeep(587.33, 880, 420);
      ringIntervalRef.current = setInterval(() => {
        playWebBeep(587.33, 880, 420);
      }, 1600);
      return () => {
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
        }
      };
    }
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    return undefined;
  }, [signalCall.phase]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Listen to WebSocket call:offer / call:answer / call:end / call:reject and message events
  useEffect(() => {
    const unsub = subscribe((event: RealtimeEvent) => {
      if (!user) return;
      const e = event as {
        type: string;
        from?: string;
        to?: string;
        video?: boolean;
        conversationId?: number;
        message?: Message;
      };

      // 1. Incoming/active Calls ALWAYS come through directly even for locked chats
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
              setSignalCall({
                phase: "incoming",
                peerId: e.from,
                video: Boolean(e.video),
              });
            }
            break;
          case "call:answer":
            setSignalCall((prev) =>
              prev.phase === "outgoing"
                ? { phase: "active", peerId: prev.peerId, video: prev.video }
                : prev,
            );
            break;
          case "call:end":
          case "call:reject":
            setSignalCall({ phase: "idle" });
            break;
        }
        return;
      }

      // 2. Incoming Messages: suppress notification sound & toast if chat is locked or muted
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
        // Only play sound/toast if not currently viewing this conversation
        if (!window.location.pathname.endsWith(`/messages/${convId}`)) {
          playWebBeep(660, 880, 180);
          const senderName = e.message.sender?.displayName || "New message";
          const preview =
            e.message.type === "text"
              ? e.message.content || "Sent a message"
              : "Sent an attachment";
          toast(senderName, {
            description: preview,
          });
        }
      }
    });
    return unsub;
  }, [subscribe, user, lockedChatIds, mutedChatIds, deletedChatIds]);

  const startCall = useCallback(
    (peer: CallPeer, withVideo: boolean) => {
      if (!user) return;

      // Always send realtime WebSocket call:offer so mobile & web peers ring immediately
      setSignalCall({
        phase: "outgoing",
        peerId: peer.id,
        peerName: peer.name,
        peerAvatar: peer.avatarUrl,
        video: withVideo,
      });
      sendSignal({ type: "call:offer", from: user.id, to: peer.id, video: withVideo });

      if (client) {
        void (async () => {
          try {
            await prepareCall(peer.id);
            const cleanU1 = user.id.replace(/-/g, "").slice(0, 12);
            const cleanU2 = peer.id.replace(/-/g, "").slice(0, 12);
            const pair = [cleanU1, cleanU2].sort().join("_");
            const callId = `c_${pair}_${Date.now()}`;

            const call = client.call("default", callId);
            await call.getOrCreate({
              ring: true,
              data: {
                members: [{ user_id: user.id }, { user_id: peer.id }],
              },
            });
            if (!withVideo) {
              await call.camera.disable();
            }
          } catch {
            // Realtime WebSocket call overlay remains active as fallback
          }
        })();
      }
    },
    [client, user, sendSignal],
  );

  const acceptSignalCall = useCallback(() => {
    if (signalCall.phase !== "incoming" || !user) return;
    sendSignal({ type: "call:answer", from: user.id, to: signalCall.peerId });
    setSignalCall({
      phase: "active",
      peerId: signalCall.peerId,
      video: signalCall.video,
    });
  }, [signalCall, user, sendSignal]);

  const endSignalCall = useCallback(() => {
    const peerId = "peerId" in signalCall ? signalCall.peerId : undefined;
    if (peerId && user) {
      if (signalCall.phase === "incoming") {
        sendSignal({ type: "call:reject", from: user.id, to: peerId });
      } else {
        sendSignal({ type: "call:end", from: user.id, to: peerId });
      }
    }
    setSignalCall({ phase: "idle" });
  }, [signalCall, user, sendSignal]);

  const value = useMemo<CallContextValue>(() => ({ startCall }), [startCall]);

  return (
    <CallContext.Provider value={value}>
      {client ? (
        <StreamVideo client={client}>
          {children}
          <CallOverlay />
        </StreamVideo>
      ) : (
        children
      )}
      {signalCall.phase !== "idle" && (
        <SignalCallOverlay
          state={signalCall}
          onAccept={acceptSignalCall}
          onEnd={endSignalCall}
        />
      )}
    </CallContext.Provider>
  );
}

function SignalCallOverlay({
  state,
  onAccept,
  onEnd,
}: {
  state: Exclude<SignalCallState, { phase: "idle" }>;
  onAccept: () => void;
  onEnd: () => void;
}) {
  const { data: peer } = useGetUser(state.peerId);
  const profile = peer as Profile | undefined;
  const displayName =
    ("peerName" in state && state.peerName) || profile?.displayName || "Incoming Call";
  const avatar =
    ("peerAvatar" in state && state.peerAvatar) || profile?.avatarUrl || undefined;

  const statusText =
    state.phase === "outgoing"
      ? "Calling..."
      : state.phase === "incoming"
        ? `Incoming ${state.video ? "video " : "voice "}call...`
        : "Connected";

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between py-20 px-6 text-white animate-in fade-in">
      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="relative p-2 rounded-full bg-emerald-500/20 animate-pulse">
          <img
            src={avatarSrc(avatar)}
            alt={displayName}
            className="w-28 h-28 rounded-full object-cover border-2 border-emerald-400 shadow-xl"
          />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mt-2">{displayName}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-sm font-medium text-slate-200">
          {state.video ? (
            <Video className="w-4 h-4 text-emerald-400" />
          ) : (
            <Phone className="w-4 h-4 text-emerald-400" />
          )}
          <span>{statusText}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-12 mb-6">
        {state.phase === "incoming" ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs font-semibold text-slate-300">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                {state.video ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </button>
              <span className="text-xs font-semibold text-slate-300">Accept</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <span className="text-xs font-semibold text-slate-300">End Call</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CallOverlay() {
  const calls = useCalls();
  const call = calls.find((c) => c.ringing) ?? calls[0];
  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm">
      <StreamTheme className="w-full h-full">
        <StreamCall call={call}>
          <CallStage />
        </StreamCall>
      </StreamTheme>
    </div>
  );
}

function CallStage() {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState === CallingState.RINGING) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <RingingCall />
      </div>
    );
  }

  if (callingState === CallingState.JOINED) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <SpeakerLayout />
        </div>
        <div className="p-4 flex justify-center">
          <CallControls />
        </div>
      </div>
    );
  }

  return null;
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}
