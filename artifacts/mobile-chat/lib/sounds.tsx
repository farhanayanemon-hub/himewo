import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useRealtime, type RealtimeEvent } from "./realtime";
import { useAuth } from "./auth";

export type SoundName =
  | "notification"
  | "message"
  | "comment"
  | "reaction"
  | "call";

const SOURCES: Record<SoundName, number> = {
  notification: require("../assets/sounds/notification.wav"),
  message: require("../assets/sounds/message.wav"),
  comment: require("../assets/sounds/comment.wav"),
  reaction: require("../assets/sounds/reaction.wav"),
  call: require("../assets/sounds/call.wav"),
};

interface SoundContextValue {
  play: (name: SoundName) => void;
  startCallRing: () => void;
  stopCallRing: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function senderOf(msg: unknown): string | undefined {
  if (msg && typeof msg === "object") {
    const m = msg as Record<string, unknown>;
    const sender = m.sender as { id?: string } | undefined;
    return (sender?.id ?? (m.senderId as string | undefined)) || undefined;
  }
  return undefined;
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useRealtime();
  const { user } = useAuth();
  const playersRef = useRef<Partial<Record<SoundName, AudioPlayer>>>({});
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload all players once.
  useEffect(() => {
    let mounted = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    const players: Partial<Record<SoundName, AudioPlayer>> = {};
    (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
      try {
        const p = createAudioPlayer(SOURCES[name]);
        if (name === "call") p.loop = true;
        players[name] = p;
      } catch {
        /* ignore load failure */
      }
    });
    if (mounted) playersRef.current = players;
    return () => {
      mounted = false;
      Object.values(players).forEach((p) => {
        try {
          p?.remove();
        } catch {
          /* ignore */
        }
      });
      playersRef.current = {};
    };
  }, []);

  const play = (name: SoundName) => {
    const p = playersRef.current[name];
    if (!p) return;
    try {
      p.seekTo(0);
      p.play();
    } catch {
      /* autoplay / not ready — ignore */
    }
  };

  const startCallRing = () => {
    const p = playersRef.current.call;
    if (!p) return;
    try {
      p.loop = true;
      p.seekTo(0);
      p.play();
    } catch {
      /* ignore */
    }
  };

  const stopCallRing = () => {
    const p = playersRef.current.call;
    if (!p) return;
    try {
      p.pause();
      p.seekTo(0);
    } catch {
      /* ignore */
    }
  };

  // Global incoming-event sounds: new message (from others), notifications,
  // and an incoming-call ringtone.
  useEffect(() => {
    const unsub = subscribe((event: RealtimeEvent) => {
      if (event.type === "message") {
        const sender = senderOf((event as { message?: unknown }).message);
        if (sender && userIdRef.current && sender === userIdRef.current) return;
        play("message");
      } else if (event.type === "notification") {
        play("notification");
      } else if (event.type === "call:offer") {
        const to = (event as { to?: string }).to;
        if (to && userIdRef.current && to !== userIdRef.current) return;
        startCallRing();
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = setTimeout(() => stopCallRing(), 30000);
      } else if (
        event.type === "call:answer" ||
        event.type === "call:end" ||
        event.type === "call:reject"
      ) {
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        stopCallRing();
      }
    });
    return () => {
      unsub();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      stopCallRing();
    };
  }, [subscribe]);

  const value = useMemo<SoundContextValue>(
    () => ({ play, startCallRing, stopCallRing }),
    [],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSounds(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    // Safe no-op fallback so components never crash if provider is missing.
    return { play: () => {}, startCallRing: () => {}, stopCallRing: () => {} };
  }
  return ctx;
}
