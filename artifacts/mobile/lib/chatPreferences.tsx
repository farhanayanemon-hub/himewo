import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  ready: boolean;
  setActiveStatus: (val: boolean) => void;
  setReadReceipts: (val: boolean) => void;
  setChatLockPin: (pin: string | null) => Promise<void>;
  lockChat: (convId: number) => Promise<void>;
  unlockChat: (convId: number) => Promise<void>;
  toggleMarkUnread: (convId: number) => Promise<void>;
  isCustomUnread: (convId: number) => boolean;
  toggleMuteChat: (convId: number) => Promise<void>;
  isMuted: (convId: number) => boolean;
  verifyPin: (pin: string) => boolean;
}

const ChatPreferencesContext = createContext<ChatPreferencesValue | null>(null);

export function ChatPreferencesProvider({ children }: { children: ReactNode }) {
  const [activeStatus, setActiveStatusState] = useState(true);
  const [readReceipts, setReadReceiptsState] = useState(true);
  const [lockedChatIds, setLockedChatIds] = useState<number[]>([]);
  const [chatLockPin, setChatLockPinState] = useState<string | null>(null);
  const [customUnreadChatIds, setCustomUnreadChatIds] = useState<number[]>([]);
  const [mutedChatIds, setMutedChatIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [
          storedActive,
          storedReceipts,
          storedLocked,
          storedPin,
          storedUnread,
          storedMuted,
        ] = await Promise.all([
          AsyncStorage.getItem(ACTIVE_STATUS_KEY),
          AsyncStorage.getItem(READ_RECEIPTS_KEY),
          AsyncStorage.getItem(LOCKED_CHATS_KEY),
          AsyncStorage.getItem(CHAT_LOCK_PIN_KEY),
          AsyncStorage.getItem(CUSTOM_UNREAD_KEY),
          AsyncStorage.getItem(MUTED_CHATS_KEY),
        ]);

        if (!mounted) return;

        if (storedActive != null) setActiveStatusState(storedActive !== "false");
        if (storedReceipts != null) setReadReceiptsState(storedReceipts !== "false");
        if (storedPin != null) setChatLockPinState(storedPin);
        if (storedLocked) {
          try {
            setLockedChatIds(JSON.parse(storedLocked));
          } catch {}
        }
        if (storedUnread) {
          try {
            setCustomUnreadChatIds(JSON.parse(storedUnread));
          } catch {}
        }
        if (storedMuted) {
          try {
            setMutedChatIds(JSON.parse(storedMuted));
          } catch {}
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setActiveStatus = (val: boolean) => {
    setActiveStatusState(val);
    void AsyncStorage.setItem(ACTIVE_STATUS_KEY, val ? "true" : "false");
  };

  const setReadReceipts = (val: boolean) => {
    setReadReceiptsState(val);
    void AsyncStorage.setItem(READ_RECEIPTS_KEY, val ? "true" : "false");
  };

  const setChatLockPin = async (pin: string | null) => {
    setChatLockPinState(pin);
    if (pin) {
      await AsyncStorage.setItem(CHAT_LOCK_PIN_KEY, pin);
    } else {
      await AsyncStorage.removeItem(CHAT_LOCK_PIN_KEY);
    }
  };

  const lockChat = async (convId: number) => {
    setLockedChatIds((prev) => {
      if (prev.includes(convId)) return prev;
      const next = [...prev, convId];
      void AsyncStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const unlockChat = async (convId: number) => {
    setLockedChatIds((prev) => {
      const next = prev.filter((id) => id !== convId);
      void AsyncStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleMarkUnread = async (convId: number) => {
    setCustomUnreadChatIds((prev) => {
      const next = prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];
      void AsyncStorage.setItem(CUSTOM_UNREAD_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isCustomUnread = (convId: number) => customUnreadChatIds.includes(convId);

  const toggleMuteChat = async (convId: number) => {
    setMutedChatIds((prev) => {
      const next = prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];
      void AsyncStorage.setItem(MUTED_CHATS_KEY, JSON.stringify(next));
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
      ready,
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
      ready,
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
