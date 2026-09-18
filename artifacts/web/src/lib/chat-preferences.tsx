import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ACTIVE_STATUS_KEY = "himewo_chat_active_status";
const READ_RECEIPTS_KEY = "himewo_chat_read_receipts";
const LOCKED_CHATS_KEY = "himewo_chat_locked_ids";
const CHAT_LOCK_PIN_KEY = "himewo_chat_lock_pin";
const CUSTOM_UNREAD_KEY = "himewo_chat_custom_unread_ids";
const MUTED_CHATS_KEY = "himewo_chat_muted_ids";

interface ChatPreferencesValue {
  activeStatus: boolean;
  readReceipts: boolean;
  lockedChatIds: number[];
  chatLockPin: string | null;
  customUnreadChatIds: number[];
  mutedChatIds: number[];
  setActiveStatus: (val: boolean) => void;
  setReadReceipts: (val: boolean) => void;
  setChatLockPin: (pin: string | null) => void;
  lockChat: (convId: number) => void;
  unlockChat: (convId: number) => void;
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
    setLockedChatIds((prev) => {
      if (prev.includes(convId)) return prev;
      const next = [...prev, convId];
      try {
        localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const unlockChat = (convId: number) => {
    setLockedChatIds((prev) => {
      const next = prev.filter((id) => id !== convId);
      try {
        localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
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
      const next = prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];
      try {
        localStorage.setItem(MUTED_CHATS_KEY, JSON.stringify(next));
      } catch {}
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
      chatLockPin,
      customUnreadChatIds,
      mutedChatIds,
      setActiveStatus,
      setReadReceipts,
      setChatLockPin,
      lockChat,
      unlockChat,
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
