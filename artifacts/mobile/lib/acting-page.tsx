import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActingPage = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

interface ActingPageContextValue {
  /** The page the user is currently acting as, or null for their own self. */
  actingPage: ActingPage | null;
  /** Switch identity (page or back to self when null). Shows a brief overlay. */
  switchTo: (page: ActingPage | null) => void;
  /** Name shown in the transition overlay while switching, or null when idle. */
  switching: string | null;
}

const STORAGE_KEY = "himewo-acting-page";

const ActingPageContext = createContext<ActingPageContextValue | null>(null);

export function ActingPageProvider({ children }: { children: ReactNode }) {
  const [actingPage, setActingPage] = useState<ActingPage | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  // Restore the last chosen identity on launch.
  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.id === "number" &&
          typeof parsed.name === "string"
        ) {
          setActingPage({
            id: parsed.id,
            name: parsed.name,
            avatarUrl: parsed.avatarUrl ?? null,
          });
        }
      } catch {
        // ignore malformed storage
      }
    });
  }, []);

  const switchTo = useCallback((page: ActingPage | null) => {
    setSwitching(page ? page.name : "your profile");
    if (page) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(page));
    else void AsyncStorage.removeItem(STORAGE_KEY);
    setTimeout(() => {
      setActingPage(page);
      setSwitching(null);
    }, 750);
  }, []);

  return (
    <ActingPageContext.Provider value={{ actingPage, switchTo, switching }}>
      {children}
      {switching && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.text}>Switching to {switching}…</Text>
        </View>
      )}
    </ActingPageContext.Provider>
  );
}

export function useActingPage(): ActingPageContextValue {
  const ctx = useContext(ActingPageContext);
  if (!ctx) {
    throw new Error("useActingPage must be used within ActingPageProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 100,
  },
  text: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
