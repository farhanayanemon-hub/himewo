import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  db,
  conversationMembersTable,
  liveStreamsTable,
  profilesTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveUserId } from "../lib/auth";
import { setPresence } from "../lib/presence";
import { logger } from "../lib/logger";

type Client = WebSocket & {
  userId?: string;
  isAlive?: boolean;
  invisible?: boolean;
};

const userSockets = new Map<string, Set<Client>>();

function addSocket(userId: string, ws: Client) {
  const set = userSockets.get(userId) ?? new Set<Client>();
  set.add(ws);
  userSockets.set(userId, set);
}

function removeSocket(userId: string, ws: Client) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) userSockets.delete(userId);
}

function sendTo(userId: string, payload: unknown) {
  const set = userSockets.get(userId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

async function conversationMemberIds(conversationId: number): Promise<string[]> {
  const rows = await db
    .select({ userId: conversationMembersTable.userId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.conversationId, conversationId));
  return rows.map((r) => r.userId);
}

async function isConversationMember(
  conversationId: number,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: conversationMembersTable.userId })
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        eq(conversationMembersTable.userId, userId),
      ),
    );
  return Boolean(row);
}

// ---- Live stream rooms (host broadcast + viewers + live chat) ----
interface LiveRoom {
  hostId: string;
  viewers: Set<string>;
}

const liveRooms = new Map<number, LiveRoom>();
const chatNameCache = new Map<string, string>();

function broadcastToRoom(room: LiveRoom, payload: unknown) {
  sendTo(room.hostId, payload);
  for (const id of room.viewers) sendTo(id, payload);
}

function broadcastViewerCount(streamId: number, room: LiveRoom) {
  broadcastToRoom(room, {
    type: "live:viewers",
    streamId,
    count: room.viewers.size,
  });
}

async function loadActiveStream(streamId: number) {
  const [row] = await db
    .select({
      id: liveStreamsTable.id,
      hostId: liveStreamsTable.hostId,
      endedAt: liveStreamsTable.endedAt,
    })
    .from(liveStreamsTable)
    .where(eq(liveStreamsTable.id, streamId));
  if (!row || row.endedAt !== null) return null;
  return row;
}

async function chatDisplayName(userId: string): Promise<string> {
  const cached = chatNameCache.get(userId);
  if (cached) return cached;
  const [row] = await db
    .select({ displayName: profilesTable.displayName })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  const name = row?.displayName ?? "Someone";
  chatNameCache.set(userId, name);
  if (chatNameCache.size > 2000) {
    const first = chatNameCache.keys().next().value;
    if (first) chatNameCache.delete(first);
  }
  return name;
}

/** Broadcast live:end to everyone in the room and tear it down. */
export function endLiveRoom(streamId: number): void {
  const room = liveRooms.get(streamId);
  if (!room) return;
  broadcastToRoom(room, { type: "live:end", streamId });
  liveRooms.delete(streamId);
}

export const realtime = {
  toUsers(userIds: string[], payload: unknown) {
    for (const id of new Set(userIds)) sendTo(id, payload);
  },
  toUser(userId: string, payload: unknown) {
    sendTo(userId, payload);
  },
  async toConversation(
    conversationId: number,
    payload: unknown,
    exceptUserId?: string,
  ) {
    const ids = await conversationMemberIds(conversationId);
    for (const id of ids) {
      if (id !== exceptUserId) sendTo(id, payload);
    }
  },
  isOnline(userId: string) {
    return userSockets.has(userId);
  },
};

export function initRealtime(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (!url.pathname.endsWith("/ws")) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: Client, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const userId = token ? await resolveUserId(token) : null;
    if (!userId) {
      ws.close(4001, "Unauthorized");
      return;
    }
    ws.userId = userId;
    ws.isAlive = true;
    ws.invisible = true;
    addSocket(userId, ws);
    // Presence is published only after the client sends `presence:set`, so a
    // user with "Active status" turned off never broadcasts as online.
    ws.send(JSON.stringify({ type: "connected", userId }));

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (raw) => {
      let msg: { type?: string; [k: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const from = ws.userId!;
      switch (msg.type) {
        case "presence:set": {
          const visible = msg.visible !== false;
          ws.invisible = !visible;
          if (visible) {
            await setPresence(from, "online");
            realtime.toUsers([...userSockets.keys()], {
              type: "presence",
              userId: from,
              status: "online",
            });
          } else {
            await setPresence(from, "offline");
            realtime.toUsers([...userSockets.keys()], {
              type: "presence",
              userId: from,
              status: "offline",
            });
          }
          return;
        }
        case "typing":
        case "stop_typing": {
          const conversationId = Number(msg.conversationId);
          if (!conversationId) return;
          if (!(await isConversationMember(conversationId, from))) return;
          await realtime.toConversation(
            conversationId,
            { type: msg.type, conversationId, userId: from },
            from,
          );
          return;
        }
        case "seen": {
          const conversationId = Number(msg.conversationId);
          const messageId = Number(msg.messageId);
          if (!conversationId) return;
          if (!(await isConversationMember(conversationId, from))) return;
          await realtime.toConversation(
            conversationId,
            { type: "seen", conversationId, messageId, userId: from },
            from,
          );
          return;
        }
        // ---- WebRTC call signaling: relay to a target user ----
        case "call:offer":
        case "call:answer":
        case "call:ice":
        case "call:end":
        case "call:reject": {
          const to = typeof msg.to === "string" ? msg.to : null;
          if (!to) return;
          sendTo(to, { ...msg, from });
          return;
        }
        // ---- Live stream rooms ----
        case "live:start": {
          const streamId = Number(msg.streamId);
          if (!streamId) return;
          const stream = await loadActiveStream(streamId);
          if (!stream || stream.hostId !== from) return;
          const existing = liveRooms.get(streamId);
          if (existing) {
            // Host reconnected: keep viewers, just confirm ownership.
            existing.hostId = stream.hostId;
          } else {
            liveRooms.set(streamId, {
              hostId: stream.hostId,
              viewers: new Set(),
            });
          }
          return;
        }
        case "live:join": {
          const streamId = Number(msg.streamId);
          if (!streamId) return;
          let room = liveRooms.get(streamId);
          if (!room) {
            const stream = await loadActiveStream(streamId);
            if (!stream) {
              sendTo(from, { type: "live:end", streamId });
              return;
            }
            room = { hostId: stream.hostId, viewers: new Set() };
            liveRooms.set(streamId, room);
          }
          if (from === room.hostId) return;
          room.viewers.add(from);
          sendTo(room.hostId, { type: "live:join", streamId, from });
          broadcastViewerCount(streamId, room);
          return;
        }
        case "live:leave": {
          const streamId = Number(msg.streamId);
          const room = streamId ? liveRooms.get(streamId) : undefined;
          if (!room || !room.viewers.has(from)) return;
          room.viewers.delete(from);
          sendTo(room.hostId, { type: "live:leave", streamId, from });
          broadcastViewerCount(streamId, room);
          return;
        }
        // WebRTC signaling between live host and a viewer (point-to-point).
        case "live:offer":
        case "live:answer":
        case "live:ice": {
          const streamId = Number(msg.streamId);
          const to = typeof msg.to === "string" ? msg.to : null;
          const room = streamId ? liveRooms.get(streamId) : undefined;
          if (!to || !room) return;
          // Only relay within the room: host <-> registered viewer.
          const isHostToViewer = from === room.hostId && room.viewers.has(to);
          const isViewerToHost = room.viewers.has(from) && to === room.hostId;
          if (!isHostToViewer && !isViewerToHost) return;
          sendTo(to, { ...msg, from });
          return;
        }
        case "live:chat": {
          const streamId = Number(msg.streamId);
          const room = streamId ? liveRooms.get(streamId) : undefined;
          if (!room) return;
          if (from !== room.hostId && !room.viewers.has(from)) return;
          const text =
            typeof msg.text === "string" ? msg.text.trim().slice(0, 500) : "";
          if (!text) return;
          const name = await chatDisplayName(from);
          broadcastToRoom(room, {
            type: "live:chat",
            streamId,
            from,
            name,
            text,
            at: Date.now(),
          });
          return;
        }
        default:
          return;
      }
    });

    ws.on("close", async () => {
      removeSocket(userId, ws);
      if (!userSockets.has(userId)) {
        // Fully offline: tear down any live rooms this user was part of.
        for (const [streamId, room] of liveRooms) {
          if (room.hostId === userId) {
            // Host dropped: end the stream in the DB and notify viewers.
            await db
              .update(liveStreamsTable)
              .set({ endedAt: new Date() })
              .where(
                and(
                  eq(liveStreamsTable.id, streamId),
                  eq(liveStreamsTable.hostId, userId),
                ),
              );
            endLiveRoom(streamId);
          } else if (room.viewers.has(userId)) {
            room.viewers.delete(userId);
            sendTo(room.hostId, { type: "live:leave", streamId, from: userId });
            broadcastViewerCount(streamId, room);
          }
        }
        await setPresence(userId, "offline");
        realtime.toUsers([...userSockets.keys()], {
          type: "presence",
          userId,
          status: "offline",
        });
      }
    });
  });

  const interval = setInterval(() => {
    for (const set of userSockets.values()) {
      for (const ws of set) {
        if (ws.isAlive === false) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, 30000);

  wss.on("close", () => clearInterval(interval));
  logger.info("Realtime websocket server initialized");
}
