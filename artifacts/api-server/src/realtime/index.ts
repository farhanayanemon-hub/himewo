import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db, conversationMembersTable } from "@workspace/db";
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
    ws.invisible = false;
    addSocket(userId, ws);
    // Default to legacy auto-online on connect so existing clients (which do not
    // send `presence:set`) keep broadcasting as online. Clients that support the
    // "Active status" toggle can opt out by sending `presence:set { visible: false }`.
    await setPresence(userId, "online");
    realtime.toUsers([...userSockets.keys()], {
      type: "presence",
      userId,
      status: "online",
    });
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
        default:
          return;
      }
    });

    ws.on("close", async () => {
      removeSocket(userId, ws);
      if (!userSockets.has(userId)) {
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
