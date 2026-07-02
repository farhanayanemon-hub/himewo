import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import {
  useListLiveStreams,
  getListLiveStreamsQueryKey,
  useStartLiveStream,
  useGetLiveStream,
  getGetLiveStreamQueryKey,
  useEndLiveStream,
  type LiveStream,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRealtime, type RealtimeEvent } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Radio,
  ArrowLeft,
  Eye,
  Send,
  VideoOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

interface ChatMessage {
  from: string;
  name: string;
  text: string;
  at: number;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      Live
    </span>
  );
}

function GoLiveDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const start = useStartLiveStream();

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    start.mutate(
      { data: { title: t } },
      {
        onSuccess: (stream) => {
          queryClient.invalidateQueries({
            queryKey: getListLiveStreamsQueryKey(),
          });
          onOpenChange(false);
          setTitle("");
          navigate(`/live/${stream.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Go live</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="What's your live about?"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Your camera and microphone will turn on after you start.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!title.trim() || start.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {start.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Radio className="w-4 h-4 mr-2" />
            )}
            Start live video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LivePage() {
  const { data: streams, isLoading } = useListLiveStreams();
  const [goLiveOpen, setGoLiveOpen] = useState(false);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-600" /> Live videos
          </h1>
          <Button
            onClick={() => setGoLiveOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Radio className="w-4 h-4 mr-2" /> Go live
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !streams || streams.length === 0 ? (
          <div className="bg-card border border-border rounded-xl shadow-sm p-10 text-center space-y-2">
            <Radio className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-semibold">Nobody is live right now</p>
            <p className="text-sm text-muted-foreground">
              Start a live video and your friends can watch and chat in real
              time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {streams.map((s) => (
              <Link key={s.id} href={`/live/${s.id}`}>
                <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <img
                    src={s.host.avatarUrl || ""}
                    className="w-12 h-12 rounded-full object-cover bg-muted"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <LiveBadge />
                      <span className="text-xs text-muted-foreground">
                        started{" "}
                        {formatDistanceToNow(new Date(s.startedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="font-semibold truncate mt-0.5">{s.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {s.host.displayName}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <GoLiveDialog open={goLiveOpen} onOpenChange={setGoLiveOpen} />
    </MainLayout>
  );
}

function LiveChat({
  streamId,
  messages,
}: {
  streamId: number;
  messages: ChatMessage[];
}) {
  const realtime = useRealtime();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    realtime.sendSignal({ type: "live:chat", streamId, text: t });
    setText("");
  };

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden h-72 lg:h-auto">
      <div className="px-3 py-2 border-b border-border font-semibold text-sm">
        Live chat
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Say hi — everyone watching can see the chat.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="text-sm break-words">
              <span className="font-semibold">{m.name}</span>{" "}
              <span>{m.text}</span>
            </div>
          ))
        )}
      </div>
      <div className="p-2 border-t border-border flex gap-2">
        <Input
          value={text}
          maxLength={500}
          placeholder="Write a comment…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <Button size="icon" variant="ghost" onClick={send} disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const streamId = Number(id);
  const { user } = useAuth();
  const userId = user?.id;
  const realtime = useRealtime();
  // subscribe / sendSignal are stable callbacks; depending on them (instead of
  // the whole `realtime` object, which changes identity on every presence
  // update) keeps the WebRTC effects from tearing down mid-stream.
  const { subscribe, sendSignal, connected } = realtime;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: stream, isLoading } = useGetLiveStream(streamId, {
    query: {
      enabled: Number.isFinite(streamId),
      queryKey: getGetLiveStreamQueryKey(streamId),
    },
  });
  const endStream = useEndLiveStream();

  const isHost = Boolean(stream && userId && stream.host.id === userId);
  const [ended, setEnded] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // Host: one peer connection per viewer. Viewer: single connection to host.
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const isLive = Boolean(stream && stream.isLive && !ended);

  const cleanupPeers = useCallback(() => {
    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ---- Host: broadcast camera to each viewer that joins ----
  useEffect(() => {
    if (!stream || !isHost || !stream.isLive || ended) return;
    let cancelled = false;

    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.muted = true;
        }
        sendSignal({ type: "live:start", streamId });
      } catch {
        setMediaError(
          "Camera/microphone access is needed to go live. Please allow it and reload.",
        );
      }
    })();

    const unsub = subscribe((ev: RealtimeEvent) => {
      const e = ev as RealtimeEvent & {
        streamId?: number;
        from?: string;
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
        count?: number;
      };
      if (e.streamId !== streamId) return;
      if (e.type === "live:join" && e.from) {
        const viewerId = e.from;
        peersRef.current.get(viewerId)?.close();
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current.set(viewerId, pc);
        const media = localStreamRef.current;
        if (media) {
          for (const track of media.getTracks()) pc.addTrack(track, media);
        }
        pc.onicecandidate = (ice) => {
          if (ice.candidate) {
            sendSignal({
              type: "live:ice",
              streamId,
              to: viewerId,
              candidate: ice.candidate.toJSON(),
            });
          }
        };
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({
            type: "live:offer",
            streamId,
            to: viewerId,
            sdp: offer,
          });
        })();
      } else if (e.type === "live:answer" && e.from && e.sdp) {
        const pc = peersRef.current.get(e.from);
        if (pc) void pc.setRemoteDescription(e.sdp);
      } else if (e.type === "live:ice" && e.from && e.candidate) {
        const pc = peersRef.current.get(e.from);
        if (pc) void pc.addIceCandidate(e.candidate).catch(() => {});
      } else if (e.type === "live:leave" && e.from) {
        peersRef.current.get(e.from)?.close();
        peersRef.current.delete(e.from);
      } else if (e.type === "live:viewers") {
        setViewerCount(e.count ?? 0);
      } else if (e.type === "live:chat") {
        const m = e as unknown as ChatMessage & { type: string };
        setMessages((prev) => [...prev.slice(-199), m]);
      }
    });

    return () => {
      cancelled = true;
      unsub();
      cleanupPeers();
    };
  }, [stream, isHost, ended, streamId, subscribe, sendSignal, cleanupPeers]);

  // ---- Viewer: join the room and receive the host's stream ----
  useEffect(() => {
    if (!stream || isHost || !stream.isLive || ended) return;

    const unsub = subscribe((ev: RealtimeEvent) => {
      const e = ev as RealtimeEvent & {
        streamId?: number;
        from?: string;
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
        count?: number;
      };
      if (e.streamId !== streamId) return;
      if (e.type === "live:offer" && e.from && e.sdp) {
        const hostId = e.from;
        peersRef.current.get(hostId)?.close();
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current.set(hostId, pc);
        pc.ontrack = (t) => {
          if (videoRef.current) videoRef.current.srcObject = t.streams[0];
        };
        pc.onicecandidate = (ice) => {
          if (ice.candidate) {
            sendSignal({
              type: "live:ice",
              streamId,
              to: hostId,
              candidate: ice.candidate.toJSON(),
            });
          }
        };
        void (async () => {
          await pc.setRemoteDescription(e.sdp!);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({
            type: "live:answer",
            streamId,
            to: hostId,
            sdp: answer,
          });
        })();
      } else if (e.type === "live:ice" && e.from && e.candidate) {
        const pc = peersRef.current.get(e.from);
        if (pc) void pc.addIceCandidate(e.candidate).catch(() => {});
      } else if (e.type === "live:viewers") {
        setViewerCount(e.count ?? 0);
      } else if (e.type === "live:chat") {
        const m = e as unknown as ChatMessage & { type: string };
        setMessages((prev) => [...prev.slice(-199), m]);
      } else if (e.type === "live:end") {
        setEnded(true);
        queryClient.invalidateQueries({
          queryKey: getGetLiveStreamQueryKey(streamId),
        });
      }
    });

    sendSignal({ type: "live:join", streamId });

    return () => {
      sendSignal({ type: "live:leave", streamId });
      unsub();
      cleanupPeers();
    };
    // realtime.connected: re-join after a websocket reconnect.
  }, [
    stream,
    isHost,
    ended,
    streamId,
    subscribe,
    sendSignal,
    connected,
    cleanupPeers,
    queryClient,
  ]);

  const finish = () => {
    endStream.mutate(
      { streamId },
      {
        onSuccess: () => {
          setEnded(true);
          cleanupPeers();
          queryClient.invalidateQueries({
            queryKey: getListLiveStreamsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetLiveStreamQueryKey(streamId),
          });
          navigate("/live");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!stream) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
          <p className="font-semibold">Live video not found</p>
          <Link href="/live">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Live
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/live">
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" /> Live videos
          </Button>
        </Link>
        <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
          <div className="space-y-3">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              {isLive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <LiveBadge />
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                      <Eye className="w-3.5 h-3.5" /> {viewerCount}
                    </span>
                  </div>
                  {mediaError && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white text-sm bg-black/80">
                      {mediaError}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white">
                  <VideoOff className="w-10 h-10 opacity-70" />
                  <p className="font-semibold">This live video has ended</p>
                </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex items-center gap-3">
              <Link href={`/profile/${stream.host.id}`}>
                <img
                  src={stream.host.avatarUrl || ""}
                  className="w-11 h-11 rounded-full object-cover bg-muted cursor-pointer"
                  alt=""
                />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{stream.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {stream.host.displayName} · started{" "}
                  {formatDistanceToNow(new Date(stream.startedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {isHost && isLive && (
                <Button
                  variant="destructive"
                  onClick={finish}
                  disabled={endStream.isPending}
                >
                  {endStream.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  End live
                </Button>
              )}
            </div>
          </div>
          {isLive && <LiveChat streamId={streamId} messages={messages} />}
        </div>
      </div>
    </MainLayout>
  );
}
