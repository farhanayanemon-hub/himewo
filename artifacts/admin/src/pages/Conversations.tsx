import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MessagesSquare,
  Users as UsersIcon,
  ChevronRight,
  ShieldCheck,
  Paperclip,
} from "lucide-react";
import { api } from "../lib/api";
import { fmtDate, fmtDateTime, fmtRelative } from "../lib/format";
import type {
  AdminProfile,
  ConversationRow,
  ConversationThread,
  Paged,
} from "../lib/types";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Modal,
  Pagination,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

function namesOf(people: AdminProfile[]): string {
  if (people.length === 0) return "Unknown";
  return people.map((p) => p.displayName || `@${p.username}`).join(", ");
}

function lastPreview(c: ConversationRow): string {
  const lm = c.lastMessage;
  if (!lm) return "No messages yet";
  if (lm.deleted) return "Deleted message";
  if (lm.type !== "text") return `[${lm.type}]`;
  return lm.content || `[${lm.type}]`;
}

export function Conversations() {
  const [q, setQ] = useState("");
  const [userOffset, setUserOffset] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null);
  const [convOffset, setConvOffset] = useState(0);
  const [openConv, setOpenConv] = useState<ConversationRow | null>(null);
  const userLimit = 10;
  const convLimit = 25;

  const usersQuery = useQuery({
    queryKey: ["conv-users", q, userOffset],
    queryFn: () =>
      api.get<Paged<AdminProfile>>("/admin/users", {
        q,
        limit: userLimit,
        offset: userOffset,
      }),
  });

  const convQuery = useQuery({
    queryKey: ["conv-list", selectedUser?.id, convOffset],
    enabled: !!selectedUser,
    queryFn: () =>
      api.get<Paged<ConversationRow>>(
        `/admin/users/${selectedUser!.id}/conversations`,
        { limit: convLimit, offset: convOffset },
      ),
  });

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Pick a user to review who they chat with and read full conversation threads."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
        {/* User picker */}
        <Card className="p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setUserOffset(0);
              }}
              placeholder="Search users…"
              className="pl-9"
            />
          </div>
          {usersQuery.isLoading && <Loading />}
          <ErrorNote error={usersQuery.error} />
          {usersQuery.data && usersQuery.data.items.length === 0 && (
            <EmptyState title="No users" description="Try another search." />
          )}
          <div className="space-y-1">
            {usersQuery.data?.items.map((u) => {
              const active = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setConvOffset(0);
                  }}
                  className={
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors " +
                    (active
                      ? "bg-brand-50 ring-1 ring-brand-200"
                      : "hover:bg-slate-50")
                  }
                >
                  <Avatar src={u.avatarUrl} name={u.displayName} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate text-sm font-medium text-slate-900">
                      {u.displayName}
                      {u.isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      @{u.username}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              );
            })}
          </div>
          {usersQuery.data && (
            <Pagination
              offset={userOffset}
              limit={userLimit}
              total={usersQuery.data.total}
              count={usersQuery.data.items.length}
              onChange={setUserOffset}
            />
          )}
        </Card>

        {/* Conversations of selected user */}
        <Card>
          {!selectedUser && (
            <EmptyState
              icon={<MessagesSquare className="h-8 w-8" />}
              title="Select a user"
              description="Choose someone on the left to see their conversations."
            />
          )}
          {selectedUser && (
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <Avatar
                  src={selectedUser.avatarUrl}
                  name={selectedUser.displayName}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selectedUser.displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              {convQuery.isLoading && <Loading />}
              <ErrorNote error={convQuery.error} />
              {convQuery.data && convQuery.data.items.length === 0 && (
                <EmptyState
                  icon={<MessagesSquare className="h-8 w-8" />}
                  title="No conversations"
                  description="This user has not chatted with anyone."
                />
              )}
              <div className="divide-y divide-slate-100">
                {convQuery.data?.items.map((c) => {
                  const others = c.otherParticipants;
                  const isGroup = c.type !== "direct" || others.length > 1;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setOpenConv(c)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      {isGroup ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UsersIcon className="h-5 w-5" />
                        </div>
                      ) : (
                        <Avatar
                          src={others[0]?.avatarUrl}
                          name={others[0]?.displayName}
                          size={40}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {c.title || namesOf(others)}
                          </p>
                          {isGroup && <Badge tone="blue">Group</Badge>}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {lastPreview(c)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-400">
                          {fmtRelative(c.lastMessageAt)}
                        </span>
                        <Badge tone="neutral">{c.messageCount} msgs</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
              {convQuery.data && (
                <Pagination
                  offset={convOffset}
                  limit={convLimit}
                  total={convQuery.data.total}
                  count={convQuery.data.items.length}
                  onChange={setConvOffset}
                />
              )}
            </div>
          )}
        </Card>
      </div>

      <ThreadModal
        conv={openConv}
        viewerId={selectedUser?.id ?? null}
        onClose={() => setOpenConv(null)}
      />
    </div>
  );
}

function ThreadModal({
  conv,
  viewerId,
  onClose,
}: {
  conv: ConversationRow | null;
  viewerId: string | null;
  onClose: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 100;

  // Reset paging whenever we switch to a different conversation so a stale
  // offset from a previous thread never hides recent messages.
  useEffect(() => {
    setOffset(0);
  }, [conv?.id]);

  const query = useQuery({
    queryKey: ["conv-thread", conv?.id, offset],
    enabled: !!conv,
    queryFn: () =>
      api.get<ConversationThread>(`/admin/conversations/${conv!.id}/messages`, {
        limit,
        offset,
      }),
  });

  const title = conv
    ? conv.title ||
      namesOf(conv.otherParticipants.length ? conv.otherParticipants : conv.participants)
    : "";

  return (
    <Modal open={!!conv} onClose={onClose} title={title}>
      {query.isLoading && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {query.data.items.length === 0 && (
            <EmptyState title="No messages" description="This thread is empty." />
          )}
          {query.data.items.map((m) => {
            const mine = m.senderId === viewerId;
            return (
              <div
                key={m.id}
                className={"flex gap-2 " + (mine ? "flex-row-reverse" : "")}
              >
                <Avatar
                  src={m.sender?.avatarUrl}
                  name={m.sender?.displayName ?? "?"}
                  size={28}
                />
                <div
                  className={
                    "max-w-[78%] rounded-2xl px-3 py-2 text-sm " +
                    (mine
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-800")
                  }
                >
                  <div
                    className={
                      "mb-0.5 text-[11px] font-medium " +
                      (mine ? "text-brand-100" : "text-slate-500")
                    }
                  >
                    {m.sender?.displayName ?? "Unknown"}
                  </div>
                  {m.deleted ? (
                    <span className="italic opacity-70">Deleted message</span>
                  ) : (
                    <>
                      {m.content && (
                        <p className="whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                      )}
                      {m.attachments.map((a) =>
                        a.type === "image" ? (
                          <img
                            key={a.id}
                            src={a.thumbnailUrl || a.url}
                            alt={a.name ?? ""}
                            className="mt-1 max-h-48 rounded-lg object-cover"
                          />
                        ) : (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className={
                              "mt-1 flex items-center gap-1 text-xs underline " +
                              (mine ? "text-brand-100" : "text-brand-700")
                            }
                          >
                            <Paperclip className="h-3 w-3" />
                            {a.name || a.type}
                          </a>
                        ),
                      )}
                    </>
                  )}
                  <div
                    className={
                      "mt-1 text-[10px] " +
                      (mine ? "text-brand-100" : "text-slate-400")
                    }
                    title={fmtDate(m.createdAt)}
                  >
                    {fmtDateTime(m.createdAt)}
                    {m.editedAt ? " · edited" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {query.data && (
        <Pagination
          offset={offset}
          limit={limit}
          total={query.data.total}
          count={query.data.items.length}
          onChange={setOffset}
        />
      )}
    </Modal>
  );
}
