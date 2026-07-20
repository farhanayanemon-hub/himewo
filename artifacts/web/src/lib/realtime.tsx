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
  supabase,
  isSupabaseConfigured,
  DEV_USER_STORAGE_KEY,
} from "./supabase";
import { useAuth } from "./auth";

export type RealtimeEvent =
  | { type: "connected"; userId: string }
  | { type: "presence"; userId: string; status: "online" | "offline" }
  | { type: "message"; conversationId: number; message: unknown }
  | { type: "message_deleted"; conversationId: number; messageId: number }
  | { type: "seen"; conversationId: number; messageId: number; userId: string }
  | { type: "typing"; conversationId: number; userId: string }
  | { type: "stop_typing"; conversationId: number; userId: string }
  | { type: "call:offer"; from: string; to: string; [k: string]: unknown }
  | { type: "call:answer"; from: string; to: string; [k: string]: unknown }
  | { type: "call:ice"; from: string; to: string; [k: string]: unknown }
  | { type: "call:end"; from: string; to: string; [k: string]: unknown }
  | { type: "call:reject"; from: string; to: string; [k: string]: unknown }
  | { type: string; [k: string]: unknown };

type Handler = (event: RealtimeEvent) => void;

async function getToken(): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    if (!import.meta.env.DEV) return null;
    // Dev-only: fall through to the dev bypass token below.
  }
  const devId = localStorage.getItem(DEV_USER_STORAGE_KEY);
  return devId ? `dev:${devId}` : null;
}

function buildWsUrl(token: string): string {
  const rawApiBaseUrl = import.meta.env.DEV ? undefined : (import.meta.env.VITE_API_URL as string | undefined);
  const apiBaseUrl = rawApiBaseUrl
    ? /^https?:\/\//.test(rawApiBaseUrl)
      ? rawApiBaseUrl
      : `https://${rawApiBaseUrl}`
    : undefined;
  let origin: string;
  if (apiBaseUrl) {
    origin = apiBaseUrl.replace(/^http/, "ws").replace(/\/+$/, "");
  } else {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    origin = `${proto}://${window.location.host}`;
  }
  return `${origin}/api/ws?token=${encodeURIComponent(token)}`;
}

interface RealtimeContextValue {
  connected: boolean;
  onlineUserIds: Set<string>;
  isOnline: (userId: string) => boolean;
  subscribe: (handler: Handler) => () => void;
  send: (payload: Record<string, unknown>) => void;
  sendTyping: (conversationId: number, isTyping: boolean) => void;
  sendSeen: (conversationId: number, messageId: number) => void;
  sendSignal: (payload: Record<string, unknown>) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<Handler>>(new Set());
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  const subscribe = useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const sendTyping = useCallback(
    (conversationId: number, isTyping: boolean) => {
      send({
        type: isTyping ? "typing" : "stop_typing",
        conversationId,
      });
    },
    [send],
  );

  const sendSeen = useCallback(
    (conversationId: number, messageId: number) => {
      send({ type: "seen", conversationId, messageId });
    },
    [send],
  );

  const sendSignal = useCallback(
    (payload: Record<string, unknown>) => {
      send(payload);
    },
    [send],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      closedRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      setOnlineUserIds(new Set());
      return;
    }

    closedRef.current = false;

    async function connect() {
      const token = await getToken();
      if (!token || closedRef.current) return;

      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        let data: RealtimeEvent;
        try {
          data = JSON.parse(ev.data) as RealtimeEvent;
        } catch {
          return;
        }
        if (data.type === "presence") {
          const userId = String((data as { userId: string }).userId);
          const status = (data as { status: string }).status;
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            if (status === "online") next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
        for (const handler of handlersRef.current) handler(data);
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!closedRef.current) {
          reconnectRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    void connect();

    return () => {
      closedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connected,
      onlineUserIds,
      isOnline: (userId: string) => onlineUserIds.has(userId),
      subscribe,
      send,
      sendTyping,
      sendSeen,
      sendSignal,
    }),
    [connected, onlineUserIds, subscribe, send, sendTyping, sendSeen, sendSignal],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return ctx;
}
