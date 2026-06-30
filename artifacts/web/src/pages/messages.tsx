import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage,
  useCreateConversation,
  useListFriends,
  getListMessagesQueryKey,
  getListConversationsQueryKey,
  getListFriendsQueryKey
} from "@workspace/api-client-react";
import { Link, useParams, useLocation } from "wouter";
import { useRealtime } from "@/lib/realtime";
import { useCall } from "@/components/call-provider";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, Video, Info, Loader2, MessageCircle, SquarePen, X, ArrowLeft } from "lucide-react";
import { EmojiPickerButton } from "@/components/emoji-picker";

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

  const [showNewChat, setShowNewChat] = useState(false);
  const { data: friends, isLoading: friendsLoading } = useListFriends({ query: { enabled: showNewChat, queryKey: getListFriendsQueryKey() } });

  const handleStartConversation = (friendId: string) => {
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

  const otherMember = conversations
    ?.find((c) => c.id === conversationId)
    ?.members.find((m) => m.user.id !== user?.id)?.user;

  // Subscribe to real-time events: messages, typing, seen
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type === "message" || event.type === "message_deleted") {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (conversationId && event.conversationId === conversationId) {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
        }
      } else if (event.type === "typing" && event.conversationId === conversationId && event.userId !== user?.id) {
        setPeerTyping(true);
      } else if (event.type === "stop_typing" && event.conversationId === conversationId && event.userId !== user?.id) {
        setPeerTyping(false);
      } else if (event.type === "seen" && conversationId && event.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
      }
    });
    return unsubscribe;
  }, [realtime, queryClient, conversationId, user?.id]);

  // Reset typing indicator when switching threads
  useEffect(() => {
    setPeerTyping(false);
  }, [conversationId]);

  // Mark latest incoming message as seen
  useEffect(() => {
    if (!conversationId || !messages?.length) return;
    const latest = messages[0];
    if (latest && latest.sender.id !== user?.id) {
      realtime.sendSeen(conversationId, latest.id);
    }
  }, [conversationId, messages, realtime, user?.id]);

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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    stopTyping();
    sendMessage.mutate(
      { id: conversationId, data: { content: newMessage, type: "text" } },
      {
        onSuccess: () => {
          setNewMessage("");
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      }
    );
  };

  const activeConv = conversations?.find(c => c.id === conversationId);

  return (
    <MainLayout>
      <div className="bg-card md:border border-border md:rounded-xl overflow-hidden shadow-sm flex -mx-4 md:mx-0 h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] md:h-[calc(100vh-100px)] animate-in fade-in">
        {/* Conversation List */}
        <div className={`${conversationId ? "hidden md:flex" : "flex"} w-full md:w-[320px] border-r border-border flex-col bg-card/50`}>
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-bold text-lg">Chats</h2>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowNewChat(true)} title="New message">
              <SquarePen className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-2">
            <Input placeholder="Search messages..." className="bg-muted/50 border-none rounded-full" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {convsLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : conversations?.map(conv => {
              const otherMember = conv.members.find(m => m.user.id !== user?.id)?.user;
              const displayTitle = conv.title || otherMember?.displayName || "Unknown Chat";
              const avatar = conv.avatarUrl || otherMember?.avatarUrl;
              const isOnline = otherMember ? realtime.isOnline(otherMember.id) : false;

              return (
                <Link 
                  key={conv.id} 
                  href={`/messages/${conv.id}`}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${conversationId === conv.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
                >
                  <div className="relative">
                    <img src={avatar || ""} className="w-12 h-12 rounded-full object-cover bg-muted" alt="" />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="font-semibold truncate text-[15px]">{displayTitle}</div>
                      <div className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                      </div>
                    </div>
                    <div className="text-sm truncate text-muted-foreground">
                      {conv.lastMessage?.sender.id === user?.id ? "You: " : ""}
                      {conv.lastMessage?.content || "Say hi!"}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {conv.unreadCount}
                    </div>
                  )}
                </Link>
              );
            })}
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
                    src={activeConv?.avatarUrl || activeConv?.members.find(m => m.user.id !== user?.id)?.user.avatarUrl || ""} 
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

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <div className="text-center text-xs text-muted-foreground my-6">Beginning of the conversation</div>
                    {messages?.slice().reverse().map((msg, i) => {
                      const isMe = msg.sender.id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                          {!isMe && (
                            <img src={msg.sender.avatarUrl || ""} className="w-8 h-8 rounded-full object-cover self-end mr-2 bg-muted" alt="" />
                          )}
                          <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div 
                              className={`px-4 py-2.5 rounded-2xl ${
                                isMe 
                                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                  : 'bg-muted text-foreground rounded-bl-sm border border-border/50'
                              }`}
                            >
                              <div className="text-[15px] leading-relaxed break-words">{msg.content}</div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isMe && i === 0 && (msg as { seenBy?: unknown[] }).seenBy?.length ? " · Seen" : ""}
                            </span>
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
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </Button>
                  <div className="flex-1 bg-muted/50 rounded-2xl border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all flex items-center px-4 py-1">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={e => handleTyping(e.target.value)}
                      onBlur={stopTyping}
                      placeholder="Aa" 
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 py-2 text-[15px]"
                    />
                    <EmojiPickerButton onSelect={(emoji) => handleTyping(newMessage + emoji)} />
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="shrink-0 rounded-full h-10 w-10 shadow-sm"
                  >
                    <Send className="w-4 h-4 ml-1" />
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
              <p className="max-w-md">Send private photos and messages to a friend or group.</p>
              <Button className="mt-6 rounded-full px-8" onClick={() => setShowNewChat(true)}>Send Message</Button>
            </div>
          )}
        </div>
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in" onClick={() => setShowNewChat(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
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
                    <img src={friend.avatarUrl || ""} className="w-11 h-11 rounded-full object-cover bg-muted" alt="" />
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
    </MainLayout>
  );
}