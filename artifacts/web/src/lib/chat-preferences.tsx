import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { updateConversationPrefs } from "@workspace/api-client-react";

const ACTIVE_STATUS_KEY = "himewo_chat_active_status";
const READ_RECEIPTS_KEY = "himewo_chat_read_receipts";
const LOCKED_CHATS_KEY = "himewo_chat_locked_ids";
const CHAT_LOCK_PIN_KEY = "himewo_chat_lock_pin";
const CUSTOM_UNREAD_KEY = "himewo_chat_custom_unread_ids";
const MUTED_CHATS_KEY = "himewo_chat_muted_ids";
const DELETED_CHATS_KEY = "himewo_chat_deleted_ids";
const HIDE_LOCKED_CHATS_KEY = "himewo_chat_hide_locked";

interface ChatPreferencesValue {
  activeStatus: boolean;
  readReceipts: boolean;
  lockedChatIds: number[];
  deletedChatIds: number[];
  hideLockedChats: boolean;
  chatLockPin: string | null;
  customUnreadChatIds: number[];
  mutedChatIds: number[];
  setActiveStatus: (val: boolean) => void;
  setReadReceipts: (val: boolean) => void;
  setHideLockedChats: (val: boolean) => void;
  setChatLockPin: (pin: string | null) => void;
  lockChat: (convId: number) => void;
  unlockChat: (convId: number) => void;
  unlockAllChats: () => void;
  isLocked: (convId: number) => boolean;
  deleteChat: (convId: number) => void;
  restoreChat: (convId: number) => void;
  isDeleted: (convId: number) => boolean;
  toggleMarkUnread: (convId: number) => void;
  isCustomUnread: (convId: number) => boolean;
  toggleMuteChat: (convId: number) => void;
  isMuted: (convId: number) => boolean;
  verifyPin: (pin: string) => boolean;
}

const ChatPreferencesContext = createContext<ChatPreferencesValue | null>(null);

export function ChatPreferencesProvider({ children }: { children: ReactNode }) {
  const [activeStatus, setActiveStatusState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(ACTIVE_STATUS_KEY);
      return v !== "false";
    } catch {
      return true;
    }
  });

  const [readReceipts, setReadReceiptsState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(READ_RECEIPTS_KEY);
      return v !== "false";
    } catch {
      return true;
    }
  });

  const [lockedChatIds, setLockedChatIds] = useState<number[]>(() => {
    try {
      const v = localStorage.getItem(LOCKED_CHATS_KEY);
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [deletedChatIds, setDeletedChatIds] = useState<number[]>(() => {
    try {
      const v = localStorage.getItem(DELETED_CHATS_KEY);
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [hideLockedChats, setHideLockedChatsState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(HIDE_LOCKED_CHATS_KEY);
      return v === "true";
    } catch {
      return false;
    }
  });

  const setHideLockedChats = (val: boolean) => {
    setHideLockedChatsState(val);
    try {
      localStorage.setItem(HIDE_LOCKED_CHATS_KEY, val ? "true" : "false");
    } catch {}
  };

  const [chatLockPin, setChatLockPinState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CHAT_LOCK_PIN_KEY);
    } catch {
      return null;
    }
  });

  const [customUnreadChatIds, setCustomUnreadChatIds] = useState<number[]>(() => {
    try {
      const v = localStorage.getItem(CUSTOM_UNREAD_KEY);
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [mutedChatIds, setMutedChatIds] = useState<number[]>(() => {
    try {
      const v = localStorage.getItem(MUTED_CHATS_KEY);
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const toSilence = Array.from(new Set([...lockedChatIds, ...mutedChatIds]));
    for (const cid of toSilence) {
      updateConversationPrefs(cid, { isMuted: true }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveStatus = (val: boolean) => {
    setActiveStatusState(val);
    try {
      localStorage.setItem(ACTIVE_STATUS_KEY, val ? "true" : "false");
    } catch {}
  };

  const setReadReceipts = (val: boolean) => {
    setReadReceiptsState(val);
    try {
      localStorage.setItem(READ_RECEIPTS_KEY, val ? "true" : "false");
    } catch {}
  };

  const setChatLockPin = (pin: string | null) => {
    setChatLockPinState(pin);
    try {
      if (pin) {
        localStorage.setItem(CHAT_LOCK_PIN_KEY, pin);
      } else {
        localStorage.removeItem(CHAT_LOCK_PIN_KEY);
      }
    } catch {}
  };

  const lockChat = (convId: number) => {
    setDeletedChatIds((prev) => {
      if (!prev.includes(convId)) return prev;
      const next = prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(DELETED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setLockedChatIds((prev) => {
      if (prev.includes(convId)) return prev;
      const next = [...prev, convId];
      try {
        localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    updateConversationPrefs(convId, { isMuted: true }).catch(() => {});
  };

  const unlockChat = (convId: number) => {
    setLockedChatIds((prev) => {
      const next = prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (!mutedChatIds.includes(convId)) {
      updateConversationPrefs(convId, { isMuted: false }).catch(() => {});
    }
  };

  const unlockAllChats = () => {
    const currentLocked = [...lockedChatIds];
    setLockedChatIds([]);
    try {
      localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify([]));
    } catch {}
    for (const cid of currentLocked) {
      if (!mutedChatIds.includes(cid)) {
        updateConversationPrefs(cid, { isMuted: false }).catch(() => {});
      }
    }
  };

  const isLocked = (convId: number) => lockedChatIds.includes(convId);

  const deleteChat = (convId: number) => {
    // 1. Remove from lockedChatIds so it never enters locked chats
    setLockedChatIds((prev) => {
      const next = prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    // 2. Remove from custom unread
    setCustomUnreadChatIds((prev) => {
      const next = prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(CUSTOM_UNREAD_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    // 3. Mark in deletedChatIds
    setDeletedChatIds((prev) => {
      if (prev.includes(convId)) return prev;
      const next = [...prev, convId];
      try {
        localStorage.setItem(DELETED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isDeleted = (convId: number) => deletedChatIds.includes(convId);

  const restoreChat = (convId: number) => {
    setDeletedChatIds((prev) => {
      if (!prev.includes(convId)) return prev;
      const next = prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(DELETED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleMarkUnread = (convId: number) => {
    setCustomUnreadChatIds((prev) => {
      const next = prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];
      try {
        localStorage.setItem(CUSTOM_UNREAD_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isCustomUnread = (convId: number) => customUnreadChatIds.includes(convId);

  const toggleMuteChat = (convId: number) => {
    setMutedChatIds((prev) => {
      const willMute = !prev.includes(convId);
      const next = willMute
        ? [...prev, convId]
        : prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(MUTED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      const effectiveMuted = willMute || lockedChatIds.includes(convId);
      updateConversationPrefs(convId, { isMuted: effectiveMuted }).catch(() => {});
      return next;
    });
  };

  const isMuted = (convId: number) => mutedChatIds.includes(convId);

  const verifyPin = (pin: string) => {
    return chatLockPin != null && chatLockPin === pin;
  };

  const value = useMemo<ChatPreferencesValue>(
    () => ({
      activeStatus,
      readReceipts,
      lockedChatIds,
      deletedChatIds,
      hideLockedChats,
      chatLockPin,
      customUnreadChatIds,
      mutedChatIds,
      setActiveStatus,
      setReadReceipts,
      setHideLockedChats,
      setChatLockPin,
      lockChat,
      unlockChat,
      unlockAllChats,
      isLocked,
      deleteChat,
      restoreChat,
      isDeleted,
      toggleMarkUnread,
      isCustomUnread,
      toggleMuteChat,
      isMuted,
      verifyPin,
    }),
    [
      activeStatus,
      readReceipts,
      lockedChatIds,
      deletedChatIds,
      hideLockedChats,
      chatLockPin,
      customUnreadChatIds,
      mutedChatIds,
    ],
  );

  return (
    <ChatPreferencesContext.Provider value={value}>
      {children}
    </ChatPreferencesContext.Provider>
  );
}

export function useChatPreferences(): ChatPreferencesValue {
  const ctx = useContext(ChatPreferencesContext);
  if (!ctx) {
    throw new Error("useChatPreferences must be used within a ChatPreferencesProvider");
  }
  return ctx;
}
