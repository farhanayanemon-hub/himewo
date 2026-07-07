import { avatarSrc } from "@/lib/avatar";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

type CallStatus = "idle" | "calling" | "ringing" | "connected";

export interface CallPeer {
  id: string;
  name?: string;
  avatarUrl?: string;
}

interface CallContextValue {
  startCall: (peer: CallPeer, withVideo: boolean) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const realtime = useRealtime();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [withVideo, setWithVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const peerRef = useRef<CallPeer | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    peerRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatus("idle");
    setPeer(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const createPeerConnection = useCallback(
    (targetId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          realtime.sendSignal({
            type: "call:ice",
            to: targetId,
            candidate: e.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          // leave it to explicit hangup / end events; only clean on failure
          if (pc.connectionState === "failed") cleanup();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [realtime, cleanup],
  );

  const getLocalStream = useCallback(async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const startCall = useCallback(
    async (target: CallPeer, video: boolean) => {
      if (status !== "idle") return;
      setPeer(target);
      peerRef.current = target;
      setWithVideo(video);
      setStatus("calling");
      try {
        const pc = createPeerConnection(target.id);
        const stream = await getLocalStream(video);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        realtime.sendSignal({
          type: "call:offer",
          to: target.id,
          sdp: offer,
          video,
        });
      } catch {
        cleanup();
      }
    },
    [status, createPeerConnection, getLocalStream, realtime, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const offer = incomingOfferRef.current;
    const target = peerRef.current;
    if (!offer || !target) return;
    try {
      const pc = createPeerConnection(target.id);
      const stream = await getLocalStream(withVideo);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      realtime.sendSignal({ type: "call:answer", to: target.id, sdp: answer });
      setStatus("connected");
    } catch {
      cleanup();
    }
  }, [createPeerConnection, getLocalStream, withVideo, realtime, cleanup]);

  const rejectCall = useCallback(() => {
    const target = peerRef.current;
    if (target) realtime.sendSignal({ type: "call:reject", to: target.id });
    cleanup();
  }, [realtime, cleanup]);

  const hangUp = useCallback(() => {
    const target = peerRef.current;
    if (target) realtime.sendSignal({ type: "call:end", to: target.id });
    cleanup();
  }, [realtime, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    setMuted(enabled);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const off = !cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !off));
    setCameraOff(off);
  }, [cameraOff]);

  // Signaling event handling
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event: RealtimeEvent) => {
      const from = (event as { from?: string }).from;
      switch (event.type) {
        case "call:offer": {
          if (status !== "idle") {
            // busy — auto reject
            if (from) realtime.sendSignal({ type: "call:reject", to: from });
            return;
          }
          if (!from) return;
          incomingOfferRef.current = (event as unknown as { sdp: RTCSessionDescriptionInit }).sdp;
          const video = Boolean((event as { video?: boolean }).video);
          const incomingPeer: CallPeer = {
            id: from,
            name: (event as { name?: string }).name,
          };
          peerRef.current = incomingPeer;
          setPeer(incomingPeer);
          setWithVideo(video);
          setStatus("ringing");
          break;
        }
        case "call:answer": {
          const pc = pcRef.current;
          if (pc) {
            void pc.setRemoteDescription(
              new RTCSessionDescription((event as unknown as { sdp: RTCSessionDescriptionInit }).sdp),
            );
            setStatus("connected");
          }
          break;
        }
        case "call:ice": {
          const candidate = (event as { candidate?: RTCIceCandidateInit }).candidate;
          if (!candidate) return;
          const pc = pcRef.current;
          if (pc && pc.remoteDescription) {
            void pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
          break;
        }
        case "call:end":
        case "call:reject": {
          cleanup();
          break;
        }
        default:
          break;
      }
    });
    return unsubscribe;
  }, [realtime, status, cleanup]);

  // Attach remote stream when refs mount
  useEffect(() => {
    if (status === "connected" && remoteVideoRef.current && pcRef.current) {
      const receivers = pcRef.current.getReceivers();
      const stream = new MediaStream();
      receivers.forEach((r) => r.track && stream.addTrack(r.track));
      if (stream.getTracks().length) remoteVideoRef.current.srcObject = stream;
    }
  }, [status]);

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}
      {status !== "idle" && peer && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] m-4 rounded-2xl overflow-hidden bg-neutral-900 flex flex-col items-center justify-center">
            {/* Remote video / avatar */}
            {withVideo && status === "connected" ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover bg-neutral-800"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-white">
                {peer.avatarUrl ? (
                  <img src={avatarSrc(peer.avatarUrl)} className="w-28 h-28 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary/30 flex items-center justify-center text-4xl font-bold">
                    {(peer.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-2xl font-semibold">{peer.name || "Unknown"}</div>
                <div className="text-white/70">
                  {status === "calling" && "Calling..."}
                  {status === "ringing" && `Incoming ${withVideo ? "video" : "voice"} call`}
                  {status === "connected" && "Connected"}
                </div>
              </div>
            )}

            {/* Local preview */}
            {withVideo && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-24 right-4 w-32 h-44 object-cover rounded-xl border-2 border-white/30 bg-neutral-800 z-10"
              />
            )}

            {/* Controls */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-20">
              {status === "ringing" ? (
                <>
                  <Button
                    onClick={acceptCall}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Phone className="w-6 h-6" />
                  </Button>
                  <Button
                    onClick={rejectCall}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={toggleMute}
                    size="icon"
                    variant="secondary"
                    className="w-12 h-12 rounded-full"
                  >
                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  {withVideo && (
                    <Button
                      onClick={toggleCamera}
                      size="icon"
                      variant="secondary"
                      className="w-12 h-12 rounded-full"
                    >
                      {cameraOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                    </Button>
                  )}
                  <Button
                    onClick={hangUp}
                    size="icon"
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
}
