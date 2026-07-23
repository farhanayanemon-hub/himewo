import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ActingPage = {
  id: number;
  name: string;
  avatarUrl: string | null;
};

interface ActingPageContextValue {
  /** The page the user is currently acting as, or null for their own self. */
  actingPage: ActingPage | null;
  /** Switch identity (page or back to self when null). Shows a brief overlay.
   * `onDone` runs right after the new identity is applied (e.g. to navigate). */
  switchTo: (page: ActingPage | null, onDone?: () => void) => void;
  /** Name shown in the transition overlay while switching, or null when idle. */
  switching: string | null;
}

const STORAGE_KEY = "himewo-acting-page";

const ActingPageContext = createContext<ActingPageContextValue | null>(null);

function readStored(): ActingPage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "number" && typeof parsed.name === "string") {
      return { id: parsed.id, name: parsed.name, avatarUrl: parsed.avatarUrl ?? null };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

export function ActingPageProvider({ children }: { children: ReactNode }) {
  const [actingPage, setActingPage] = useState<ActingPage | null>(() =>
    readStored(),
  );
  const [switching, setSwitching] = useState<string | null>(null);

  const switchTo = useCallback((page: ActingPage | null, onDone?: () => void) => {
    setSwitching(page ? page.name : "your profile");
    // Persist immediately so a reload keeps the chosen identity.
    try {
      if (page) localStorage.setItem(STORAGE_KEY, JSON.stringify(page));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
    // Brief full-screen confirmation, Facebook-style, then apply.
    window.setTimeout(() => {
      setActingPage(page);
      setSwitching(null);
      onDone?.();
    }, 750);
  }, []);

  return (
    <ActingPageContext.Provider value={{ actingPage, switchTo, switching }}>
      {children}
      {switching && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm animate-in fade-in">
          <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
          <p className="text-lg font-semibold text-foreground">
            Switching to {switching}…
          </p>
        </div>
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
