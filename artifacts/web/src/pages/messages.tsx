import { useState, useRef, useEffect, useMemo } from "react";
import { avatarSrc } from "@/lib/avatar";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage,
  useCreateConversation,
  useListFriends,
  getListMessagesQueryKey,
  getListConversationsQueryKey,
  getListFriendsQueryKey,
  type StoryEmbed,
  type Conversation,
  type Message,
  type Profile,
} from "@workspace/api-client-react";
import { storyBackground } from "@/pages/stories";
import { Link, useParams, useLocation } from "wouter";
import { useRealtime } from "@/lib/realtime";
import { useCall } from "@/components/call-provider";
import { useAuth } from "@/lib/auth";
import { useChatPreferences } from "@/lib/chat-preferences";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Phone,
  Video,
  Info,
  Loader2,
  MessageCircle,
  SquarePen,
  X,
  ArrowLeft,
  Check,
  CheckCheck,
  Eye,
  Settings,
  Lock,
  Unlock,
  MoreVertical,
  VolumeX,
  Volume2,
  Mail,
  MailOpen,
  Trash2,
  Ban,
  ShieldCheck,
  KeyRound,
  Plus,
  ChevronRight,
} from "lucide-react";
import { EmojiPickerButton } from "@/components/emoji-picker";

function StoryEmbedInline({ story, isMe }: { story: StoryEmbed; isMe: boolean }) {
  return (
    <div className={`mb-1 flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
      <span className="text-[11px] text-muted-foreground px-1">
        {story.authorName ? `${story.authorName}'s story` : "Story"}
      </span>
      <div className="w-24 h-40 rounded-xl overflow-hidden border border-border/60 relative bg-muted">
        {story.expired ? (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground text-center p-2">
            Story unavailable
          </div>
        ) : story.storyType === "text" ? (
          <div
            className="w-full h-full flex items-center justify-center p-2"
            style={{ background: storyBackground(story.backgroundStyle) }}
          >
            <span className="text-white text-[11px] font-semibold text-center line-clamp-4 break-words drop-shadow">
              {story.textContent}
            </span>
          </div>
        ) : story.mediaType === "video" ? (
          <video src={story.mediaUrl ?? undefined} className="w-full h-full object-cover" muted />
        ) : (
          <img src={story.mediaUrl ?? undefined} className="w-full h-full object-cover" alt="" />
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ? Number(id) : undefined;
  
  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const { data: messages, isLoading: msgsLoading } = useListMessages(
    conversationId!, 
    {}, 
    { query: { enabled: !!conversationId, queryKey: getListMessagesQueryKey(conversationId!) } }
  );

  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const { user } = useAuth();
  const realtime = useRealtime();
  const call = useCall();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const {
    activeStatus,
    readReceipts,
    lockedChatIds,
    chatLockPin,
    lockChat,
    unlockChat,
    toggleMarkUnread,
    isCustomUnread,
    toggleMuteChat,
    isMuted,
    verifyPin,
    setChatLockPin,
    setActiveStatus,
    setReadReceipts,
  } = useChatPreferences();

  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"enter" | "set_new" | "confirm_new">("enter");
  const [pinInput, setPinInput] = useState("");
  const [tempPin, setTempPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccessCallback, setPinSuccessCallback] = useState<(() => void) | null>(null);

  // Friends for active row and new chat
  const { data: friendsData, isLoading: friendsLoading } = useListFriends({
    query: { queryKey: getListFriendsQueryKey() },
  });
  const friends = useMemo(() => (friendsData ?? []) as Profile[], [friendsData]);

  // Combine contacts for Active Row sorted by online status
  const activeContacts = useMemo(() => {
    const map = new Map<string, Profile>();
    friends.forEach((f) => {
      if (f.id !== user?.id) map.set(f.id, f);
    });
    (conversations ?? []).forEach((conv) => {
      conv.members.forEach((m) => {
        if (m.user.id !== user?.id && !map.has(m.user.id)) {
          map.set(m.user.id, m.user);
        }
      });
    });
    const list = Array.from(map.values());
    return list.sort(
      (a, b) => Number(realtime.isOnline(b.id)) - Number(realtime.isOnline(a.id)),
    );
  }, [friends, conversations, user?.id, realtime]);

  const handleStartConversation = (friendId: string) => {
    // Check if direct conversation already exists
    const existing = (conversations ?? []).find(
      (c) => c.type === "direct" && c.members.some((m) => m.user.id === friendId),
    );
    if (existing) {
      setShowNewChat(false);
      navigate(`/messages/${existing.id}`);
      return;
    }

    createConversation.mutate(
      { data: { type: "direct", memberIds: [friendId] } },
      {
        onSuccess: (conv) => {
          setShowNewChat(false);
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          navigate(`/messages/${conv.id}`);
        },
      },
    );
  };

  const [newMessage, setNewMessage] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const currentConv = conversations?.find((c) => c.id === conversationId);
  const peerMember = currentConv?.members.find((m) => m.user.id !== user?.id);
  const otherMember = peerMember?.user;
  const isGroup = currentConv?.type === "group";
  const [peerLastReadId, setPeerLastReadId] = useState<number>(() => peerMember?.lastReadMessageId ?? 0);

  useEffect(() => {
    if (peerMember?.lastReadMessageId != null) {
      setPeerLastReadId((prev) => Math.max(prev, peerMember.lastReadMessageId ?? 0));
    }
  }, [peerMember?.lastReadMessageId]);

  useEffect(() => {
    setPeerLastReadId(peerMember?.lastReadMessageId ?? 0);
  }, [conversationId]);

  // Subscribe to real-time events: messages, typing, seen
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type === "seen") {
        const e = event as { conversationId: number; messageId: number; userId: string };
        if (conversationId && e.conversationId === conversationId && e.userId !== user?.id) {
          setPeerLastReadId((prev) => Math.max(prev, Number(e.messageId) || 0));
        }
        queryClient.setQueryData<Conversation[]>(getListConversationsQueryKey(), (old = []) => {
          if (!Array.isArray(old)) return old;
          return old.map((c) => {
            if (c.id === e.conversationId) {
              return {
                ...c,
                members: c.members.map((m) =>
                  m.user.id === e.userId
                    ? {
                        ...m,
                        lastReadMessageId: Math.max(
                          m.lastReadMessageId ?? 0,
                          Number(e.messageId) || 0,
                        ),
                      }
                    : m,
                ),
              };
            }
            return c;
          });
        });
      } else if (event.type === "message") {
        const e = event as { conversationId: number; message?: Message };
        if (conversationId && e.conversationId === conversationId && e.message) {
          queryClient.setQueryData<Message[]>(getListMessagesQueryKey(conversationId), (old = []) => {
            if (!Array.isArray(old)) return [e.message!];
            if (old.some((m) => m.id === e.message!.id)) return old;
            return [e.message!, ...old];
          });
        }
        if (e.message) {
          queryClient.setQueryData<Conversation[]>(getListConversationsQueryKey(), (old = []) => {
            if (!Array.isArray(old)) return old;
            const exists = old.some((c) => c.id === e.conversationId);
            if (!exists) {
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
              return old;
            }
            return old.map((c) => {
              if (c.id === e.conversationId) {
                return {
                  ...c,
                  lastMessage: e.message,
                  lastMessageAt: e.message!.createdAt,
                  unreadCount: c.unreadCount + (e.message!.sender.id === user?.id ? 0 : 1),
                };
              }
              return c;
            });
          });
        }
      } else if (event.type === "message_deleted") {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (conversationId && event.conversationId === conversationId) {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
        }
      } else if (event.type === "typing" && event.conversationId === conversationId && event.userId !== user?.id) {
        setPeerTyping(true);
      } else if (event.type === "stop_typing" && event.conversationId === conversationId && event.userId !== user?.id) {
        setPeerTyping(false);
      }
    });
    return unsubscribe;
  }, [realtime, queryClient, conversationId, user?.id]);

  // Reset typing indicator when switching threads
  useEffect(() => {
    setPeerTyping(false);
  }, [conversationId]);

  // Mark latest incoming message as seen only if readReceipts is ON
  useEffect(() => {
    if (!conversationId || !messages?.length || !readReceipts) return;
    const latest = messages[0];
    if (latest && latest.sender.id !== user?.id) {
      realtime.sendSeen(conversationId, latest.id);
    }
  }, [conversationId, messages, realtime, user?.id, readReceipts]);

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (!conversationId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      realtime.sendTyping(conversationId, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      realtime.sendTyping(conversationId, false);
    }, 1500);
  };

  const stopTyping = () => {
    if (isTypingRef.current && conversationId) {
      isTypingRef.current = false;
      realtime.sendTyping(conversationId, false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleStartCall = (video: boolean) => {
    if (!otherMember) return;
    call.startCall(
      { id: otherMember.id, name: otherMember.displayName, avatarUrl: otherMember.avatarUrl ?? undefined },
      video,
    );
  };

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !conversationId || !user) return;

    setNewMessage("");
    stopTyping();

    const tempId = -Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversationId,
      sender: user as any,
      content,
      type: "text" as any,
      createdAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
    };

    queryClient.setQueryData<Message[]>(getListMessagesQueryKey(conversationId), (old = []) => [
      optimisticMsg,
      ...(Array.isArray(old) ? old : []),
    ]);

    queryClient.setQueryData<Conversation[]>(getListConversationsQueryKey(), (old = []) => {
      if (!Array.isArray(old)) return old;
      return old.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: optimisticMsg,
            lastMessageAt: optimisticMsg.createdAt,
          };
        }
        return conv;
      });
    });

    try {
      const sent = await sendMessage.mutateAsync({
        id: conversationId,
        data: { content, type: "text" as any },
      });

      queryClient.setQueryData<Message[]>(getListMessagesQueryKey(conversationId), (old = []) => {
        if (!Array.isArray(old)) return [sent as Message];
        return old.map((m) => (m.id === tempId ? (sent as Message) : m));
      });

      queryClient.setQueryData<Conversation[]>(getListConversationsQueryKey(), (old = []) => {
        if (!Array.isArray(old)) return old;
        return old.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: sent as Message,
              lastMessageAt: (sent as Message).createdAt,
            };
          }
          return conv;
        });
      });
    } catch {
      queryClient.setQueryData<Message[]>(getListMessagesQueryKey(conversationId), (old = []) => {
        if (!Array.isArray(old)) return [];
        return old.filter((m) => m.id !== tempId);
      });
      setNewMessage(content);
    }
  };

  // PIN verification flow helpers
  const requirePin = (mode: "enter" | "set_new", onSuccess: () => void) => {
    setPinMode(mode);
    setPinInput("");
    setTempPin("");
    setPinError(null);
    setPinSuccessCallback(() => onSuccess);
    setPinModalOpen(true);
  };

  const handlePinSubmit = (val: string) => {
    if (val.length !== 4) return;
    if (pinMode === "enter") {
      if (verifyPin(val)) {
        setPinModalOpen(false);
        setPinInput("");
        setPinError(null);
        if (pinSuccessCallback) {
          pinSuccessCallback();
          setPinSuccessCallback(null);
        }
      } else {
        setPinError("Incorrect PIN. Please try again.");
        setPinInput("");
      }
    } else if (pinMode === "set_new") {
      setTempPin(val);
      setPinInput("");
      setPinError(null);
      setPinMode("confirm_new");
    } else if (pinMode === "confirm_new") {
      if (val === tempPin) {
        setChatLockPin(val);
        setPinModalOpen(false);
        setPinInput("");
        setTempPin("");
        setPinError(null);
        if (pinSuccessCallback) {
          pinSuccessCallback();
          setPinSuccessCallback(null);
        }
      } else {
        setPinError("PINs do not match. Try again.");
        setPinInput("");
        setTempPin("");
        setPinMode("set_new");
      }
    }
  };

  const handleOpenLocked = () => {
    if (!chatLockPin) {
      requirePin("set_new", () => setShowLockedModal(true));
    } else {
      requirePin("enter", () => setShowLockedModal(true));
    }
  };

  const handleLockToggle = (conv: Conversation) => {
    const isLocked = lockedChatIds.includes(conv.id);
    if (isLocked) {
      if (chatLockPin) {
        requirePin("enter", () => unlockChat(conv.id));
      } else {
        unlockChat(conv.id);
      }
    } else {
      if (!chatLockPin) {
        requirePin("set_new", () => lockChat(conv.id));
      } else {
        lockChat(conv.id);
      }
    }
  };

  const normalConversations = useMemo(() => {
    const list = (conversations ?? []).filter((c) => !lockedChatIds.includes(c.id));
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter((c) => {
      const other = c.members.find((m) => m.user.id !== user?.id)?.user;
      const title = c.title || other?.displayName || "";
      return title.toLowerCase().includes(q);
    });
  }, [conversations, lockedChatIds, searchFilter, user?.id]);

  const lockedConversations = useMemo(() => {
    return (conversations ?? []).filter((c) => lockedChatIds.includes(c.id));
  }, [conversations, lockedChatIds]);

  const activeConv = conversations?.find((c) => c.id === conversationId);

  return (
    <MainLayout>
      <div className="bg-card md:border border-border md:rounded-xl overflow-hidden shadow-sm flex -mx-4 md:mx-0 h-[calc(100dvh-9.5rem-env(safe-area-inset-bottom))] md:h-[calc(100vh-100px)] animate-in fade-in">
        {/* Sidebar / Conversation List */}
        <div className={`${conversationId ? "hidden md:flex" : "flex"} w-full md:w-[320px] lg:w-[360px] border-r border-border flex-col bg-card/50`}>
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-bold text-xl aurora-gradient-text">Chats</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted/60"
                onClick={() => setShowSettings(true)}
                title="Chat Settings"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted/60"
                onClick={() => setShowNewChat(true)}
                title="New message"
              >
                <SquarePen className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Active Contacts Presence Row */}
          <div className="p-3 border-b border-border/60 bg-muted/20 overflow-x-auto scrollbar-none flex items-center gap-3">
            {/* Your story button */}
            <Link
              href="/stories?create=1"
              className="flex flex-col items-center shrink-0 w-14 group text-center"
            >
              <div className="relative w-12 h-12 rounded-full ring-2 ring-primary/40 p-0.5 group-hover:scale-105 transition-transform">
                <img
                  src={avatarSrc(user?.avatarUrl)}
                  className="w-full h-full rounded-full object-cover"
                  alt=""
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold border border-card shadow-sm">
                  +
                </span>
              </div>
              <span className="text-[11px] font-medium text-foreground truncate w-full mt-1">
                Your story
              </span>
            </Link>

            {/* Active friends */}
            {activeContacts.map((f) => {
              const online = realtime.isOnline(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => handleStartConversation(f.id)}
                  className="flex flex-col items-center shrink-0 w-14 group text-center"
                >
                  <div className="relative w-12 h-12 rounded-full p-0.5 group-hover:scale-105 transition-transform">
                    <img
                      src={avatarSrc(f.avatarUrl)}
                      className="w-full h-full rounded-full object-cover bg-muted"
                      alt=""
                    />
                    {online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-foreground truncate w-full mt-1">
                    {f.displayName.split(" ")[0]}
                  </span>
                  {online ? (
                    <span className="text-[9px] text-green-500 font-semibold -mt-0.5">Online</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="p-2.5">
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="bg-muted/50 border-none rounded-full text-sm h-9"
            />
          </div>

          {/* WhatsApp-style Locked Chats Bar */}
          {lockedChatIds.length > 0 && (
            <div className="px-2 pb-1">
              <button
                onClick={handleOpenLocked}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:scale-105 transition-transform">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <span>Locked chats</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lockedChatIds.length} {lockedChatIds.length === 1 ? "chat" : "chats"} protected
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {convsLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : normalConversations.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10 px-4">
                {searchFilter.trim() ? "No conversations match your search." : "No conversations yet. Start a new chat!"}
              </div>
            ) : (
              normalConversations.map((conv) => {
                const other = conv.members.find((m) => m.user.id !== user?.id)?.user;
                const displayTitle = conv.title || other?.displayName || "Unknown Chat";
                const avatar = conv.avatarUrl || other?.avatarUrl;
                const isOnline = other ? realtime.isOnline(other.id) : false;

                const isGroupConv = conv.type === "group";
                const peerMem = !isGroupConv
                  ? conv.members.find((m) => m.user.id !== user?.id)
                  : undefined;
                const lastMsg = conv.lastMessage;
                const isLastMe = lastMsg && lastMsg.sender.id === user?.id;
                const isLastSeen =
                  !isGroupConv &&
                  !!(
                    isLastMe &&
                    lastMsg &&
                    peerMem?.lastReadMessageId != null &&
                    peerMem.lastReadMessageId >= lastMsg.id
                  );
                const isLastDelivered =
                  !isGroupConv &&
                  !!(
                    isLastMe &&
                    lastMsg &&
                    (isOnline ||
                      (peerMem?.lastReadMessageId != null && peerMem.lastReadMessageId > 0))
                  );

                const unread = conv.unreadCount > 0 || isCustomUnread(conv.id);
                const muted = isMuted(conv.id);

                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-3 p-3 rounded-2xl transition-all relative ${
                      conversationId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                    }`}
                  >
                    <Link
                      href={`/messages/${conv.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={avatar || avatarSrc(null)}
                          className="w-12 h-12 rounded-full object-cover bg-muted"
                          alt=""
                        />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <div className={`font-semibold truncate text-[15px] flex items-center gap-1.5 ${unread ? "text-foreground font-bold" : ""}`}>
                            <span>{displayTitle}</span>
                            {muted && <VolumeX className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                            {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                          </div>
                        </div>
                        <div className="text-sm truncate text-muted-foreground flex items-center gap-1">
                          {isLastMe && lastMsg && (
                            <span className="inline-flex shrink-0">
                              {isLastSeen ? (
                                <CheckCheck className="w-3.5 h-3.5 text-primary" />
                              ) : isLastDelivered ? (
                                <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </span>
                          )}
                          <span className={`truncate ${unread ? "font-semibold text-foreground" : ""}`}>
                            {isLastMe ? "You: " : ""}
                            {lastMsg?.content || "Say hi!"}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Unread / Seen badge */}
                    {isLastSeen ? (
                      <div
                        className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0"
                        title="Seen"
                      >
                        <Eye className="w-3 h-3 text-primary" />
                      </div>
                    ) : unread ? (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                        {conv.unreadCount || "1"}
                      </div>
                    ) : null}

                    {/* Conversation Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity"
                          title="Options"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-xl p-1 shadow-xl">
                        <DropdownMenuItem
                          onClick={() => handleLockToggle(conv)}
                          className="gap-2.5 cursor-pointer py-2 text-sm"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Lock chat (Hide with PIN)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMarkUnread(conv.id)}
                          className="gap-2.5 cursor-pointer py-2 text-sm"
                        >
                          {unread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                          <span>{unread ? "Mark as read" : "Mark as unread"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMuteChat(conv.id)}
                          className="gap-2.5 cursor-pointer py-2 text-sm"
                        >
                          {muted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                          <span>{muted ? "Unmute notifications" : "Mute notifications"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => lockChat(conv.id)}
                          className="gap-2.5 cursor-pointer py-2 text-sm text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete chat</span>
                        </DropdownMenuItem>
                        {!isGroupConv && (
                          <DropdownMenuItem
                            onClick={() => lockChat(conv.id)}
                            className="gap-2.5 cursor-pointer py-2 text-sm text-destructive focus:text-destructive"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Block user</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Thread */}
        <div className={`${conversationId ? "flex" : "hidden md:flex"} flex-1 flex-col bg-background relative`}>
          {conversationId ? (
            <>
              {/* Thread Header */}
              <div className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <Link href="/messages" className="md:hidden -ml-2 p-1.5 rounded-full hover:bg-muted text-primary shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                  </Link>
                  <img 
                    src={avatarSrc(activeConv?.avatarUrl || activeConv?.members.find(m => m.user.id !== user?.id)?.user.avatarUrl)} 
                    className="w-10 h-10 rounded-full object-cover bg-muted" 
                    alt="" 
                  />
                  <div>
                    <div className="font-bold">{activeConv?.title || activeConv?.members.find(m => m.user.id !== user?.id)?.user.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {activeConv?.members.some(m => m.user.id !== user?.id && realtime.isOnline(m.user.id)) 
                        ? "Active now" 
                        : "Offline"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => handleStartCall(false)} disabled={!otherMember} title="Voice call"><Phone className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => handleStartCall(true)} disabled={!otherMember} title="Video call"><Video className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-muted-foreground"><Info className="w-5 h-5" /></Button>
                </div>
              </div>

              {/* Message History List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {[...(messages ?? [])].reverse().map((msg, i, arr) => {
                      const isMe = msg.sender.id === user?.id;
                      const showAvatar = !isMe && (i === 0 || arr[i - 1].sender.id !== msg.sender.id);
                      const isLastMsgOfUser = isMe && i === arr.length - 1;
                      const isSeen = isMe && peerLastReadId >= msg.id && msg.id > 0;
                      const isDelivered = isMe && (realtime.isOnline(peerMember?.user.id ?? "") || (peerMember?.lastReadMessageId != null && peerMember.lastReadMessageId > 0));

                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                          {!isMe && (
                            <div className="w-7 shrink-0">
                              {showAvatar && (
                                <img src={avatarSrc(msg.sender.avatarUrl)} className="w-7 h-7 rounded-full object-cover" alt="" />
                              )}
                            </div>
                          )}
                          <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {(msg as any).storyEmbed && (
                              <StoryEmbedInline story={(msg as any).storyEmbed} isMe={isMe} />
                            )}
                            <div
                              className={`p-3 text-[15px] rounded-2xl ${
                                isMe 
                                  ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm" 
                                  : "bg-muted text-foreground rounded-bl-sm border border-border/50"
                              }`}
                            >
                              {msg.content}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <span className="text-[11px] flex items-center">
                                  {isSeen ? (
                                    <span title="Seen" className="text-primary inline-flex items-center gap-0.5">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    </span>
                                  ) : isDelivered ? (
                                    <span title="Delivered" className="text-muted-foreground inline-flex items-center gap-0.5">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <span title="Sent" className="text-muted-foreground inline-flex items-center gap-0.5">
                                      <Check className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {peerTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm border border-border/50 px-4 py-3 flex items-center gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Compose Area */}
              <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <div className="flex-1 bg-muted/50 rounded-2xl border border-border/50 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/25 transition-all flex items-center px-4 py-1">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => handleTyping(e.target.value)}
                      onBlur={stopTyping}
                      placeholder="Type a message..." 
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 py-2.5 text-[16px]"
                    />
                    <EmojiPickerButton onSelect={(emoji) => handleTyping(newMessage + emoji)} />
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!newMessage.trim()}
                    className="shrink-0 rounded-full h-10 w-10 shadow-sm"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageCircle className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Messages</h2>
              <p className="max-w-md">Send private messages, media, and voice calls to your friends.</p>
              <Button className="mt-6 rounded-full px-8" onClick={() => setShowNewChat(true)}>Send Message</Button>
            </div>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in" onClick={() => setShowNewChat(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg">New Message</h3>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowNewChat(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-2 overflow-y-auto">
              {friendsLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : !friends?.length ? (
                <div className="text-center text-sm text-muted-foreground py-8">Add some friends to start chatting.</div>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleStartConversation(friend.id)}
                    disabled={createConversation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left disabled:opacity-60"
                  >
                    <img src={avatarSrc(friend.avatarUrl)} className="w-11 h-11 rounded-full object-cover bg-muted" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{friend.displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">@{friend.username}</div>
                    </div>
                    {createConversation.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in" onClick={() => setShowSettings(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg">Chat Settings</h3>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-6">
              {/* Privacy & Status */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Privacy & Status
                </h4>
                <div className="space-y-4 border border-border/80 rounded-2xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">Active Status</div>
                      <div className="text-xs text-muted-foreground">Show friends when you are online or recently active</div>
                    </div>
                    <Switch
                      checked={activeStatus}
                      onCheckedChange={setActiveStatus}
                    />
                  </div>

                  <div className="border-t border-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">Read Receipts (Seen)</div>
                      <div className="text-xs text-muted-foreground">Let others see when you have seen their messages</div>
                    </div>
                    <Switch
                      checked={readReceipts}
                      onCheckedChange={setReadReceipts}
                    />
                  </div>
                </div>
              </div>

              {/* Chat Lock & Security */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Locked Chats & Security
                </h4>
                <div className="space-y-4 border border-border/80 rounded-2xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">Chat Lock PIN</div>
                      <div className="text-xs text-muted-foreground">
                        {chatLockPin ? "4-digit PIN is configured" : "No PIN set yet"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs font-semibold"
                      onClick={() => {
                        setShowSettings(false);
                        requirePin("set_new", () => {});
                      }}
                    >
                      {chatLockPin ? "Change PIN" : "Set PIN"}
                    </Button>
                  </div>

                  {chatLockPin && (
                    <>
                      <div className="border-t border-border/60" />
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          requirePin("enter", () => {
                            setChatLockPin(null);
                          });
                        }}
                        className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove PIN Protection
                      </button>
                    </>
                  )}

                  {lockedChatIds.length > 0 && (
                    <>
                      <div className="border-t border-border/60" />
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          handleOpenLocked();
                        }}
                        className="w-full flex items-center justify-between text-sm font-semibold text-primary hover:underline"
                      >
                        <span>View Locked Chats ({lockedChatIds.length})</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4-digit PIN Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in" onClick={() => setPinModalOpen(false)}>
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 rounded-full text-muted-foreground"
              onClick={() => setPinModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-lg text-foreground">
              {pinMode === "enter"
                ? "Enter Chat PIN"
                : pinMode === "set_new"
                  ? "Create 4-Digit PIN"
                  : "Confirm 4-Digit PIN"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-6 px-4">
              {pinMode === "enter"
                ? "Enter your 4-digit PIN to access locked conversations"
                : pinMode === "set_new"
                  ? "Choose a 4-digit PIN for locking private chats"
                  : "Re-enter your 4-digit PIN to confirm"}
            </p>

            {/* 4 Pin Dots */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      filled ? "bg-primary border-primary scale-110" : "border-border"
                    }`}
                  />
                );
              })}
            </div>

            {pinError && <div className="text-xs text-destructive font-semibold mb-4">{pinError}</div>}

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoFocus
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                setPinError(null);
                setPinInput(val);
                if (val.length === 4) {
                  handlePinSubmit(val);
                }
              }}
              className="opacity-0 w-0 h-0 absolute pointer-events-none"
            />

            {/* Virtual numeric keypad for easy web tapping */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 4) {
                      const next = pinInput + num;
                      setPinError(null);
                      setPinInput(next);
                      if (next.length === 4) handlePinSubmit(next);
                    }
                  }}
                  className="h-12 rounded-2xl bg-muted/50 hover:bg-muted font-bold text-lg active:scale-95 transition-all text-foreground"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 4) {
                    const next = pinInput + "0";
                    setPinError(null);
                    setPinInput(next);
                    if (next.length === 4) handlePinSubmit(next);
                  }
                }}
                className="h-12 rounded-2xl bg-muted/50 hover:bg-muted font-bold text-lg active:scale-95 transition-all text-foreground"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinInput((prev) => prev.slice(0, -1));
                  setPinError(null);
                }}
                className="h-12 rounded-2xl bg-muted/30 hover:bg-muted font-semibold text-xs active:scale-95 transition-all text-muted-foreground flex items-center justify-center"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locked Chats Dialog */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in" onClick={() => setShowLockedModal(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Locked Chats</h3>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowLockedModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {lockedConversations.length === 0 ? (
                <div className="text-center py-10 px-4 text-sm text-muted-foreground">
                  No locked chats. To lock a chat, click the options menu on any conversation and choose "Lock chat".
                </div>
              ) : (
                lockedConversations.map((conv) => {
                  const other = conv.members.find((m) => m.user.id !== user?.id)?.user;
                  const displayTitle = conv.title || other?.displayName || "Unknown Chat";
                  const avatar = conv.avatarUrl || other?.avatarUrl;

                  return (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/60 transition-all"
                    >
                      <button
                        onClick={() => {
                          setShowLockedModal(false);
                          navigate(`/messages/${conv.id}`);
                        }}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                      >
                        <img
                          src={avatar || avatarSrc(null)}
                          className="w-11 h-11 rounded-full object-cover bg-muted shrink-0"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{displayTitle}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage?.content || "No messages"}
                          </div>
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full text-xs font-semibold ml-2 shrink-0"
                        onClick={() => unlockChat(conv.id)}
                      >
                        Unlock
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}