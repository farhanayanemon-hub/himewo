import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { useAuth } from "@/lib/auth";
import { fetchStreamCredentials, CallsUnavailableError } from "@/lib/calls";

export interface CallPeer {
  id: string;
  name?: string;
  avatarUrl?: string;
}

interface CallContextValue {
  startCall: (peer: CallPeer, withVideo: boolean) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

/**
 * Web calling, powered by Stream Video — the SAME service the mobile chat app
 * uses. Both platforms connect to one Stream app (credentials minted by the API
 * server's `/api/calls/token`), so a call started on web rings on mobile and
 * vice-versa. Stream also handles TURN relays and ringing, which the old
 * hand-rolled WebRTC path could not do reliably across networks.
 */
export function CallProvider({ children }: { children: ReactNode }) {
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
    // Only re-create the Stream client when the *identity* changes, not on every
    // profile refresh — otherwise a display-name/avatar update would tear down an
    // in-progress or ringing call. Name/avatar are captured at connect time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const startCall = useCallback(
    (peer: CallPeer, withVideo: boolean) => {
      if (!client || !user) {
        toast.error("Calls unavailable", {
          description: "Could not connect to the call service. Please try again in a moment.",
        });
        return;
      }
      void (async () => {
        try {
          const callId = `${[user.id, peer.id].sort().join("-")}-${Date.now()}`;
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
          toast.error("Call failed", {
            description: "Could not start the call. Please try again.",
          });
        }
      })();
    },
    [client, user],
  );

  const value = useMemo<CallContextValue>(() => ({ startCall }), [startCall]);

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

/**
 * Renders the active/ringing call over the whole app. Stream's `useCalls`
 * surfaces both incoming (ringing) and outgoing calls; we show the first one.
 */
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

  // Ringing (incoming or outgoing) shows the accept/reject screen; once joined
  // we show the live video/audio grid with call controls.
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
