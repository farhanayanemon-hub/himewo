import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

const THEME_KEY = "himewo_theme_mode";
const ACTIVE_KEY = "himewo_active_status";

interface PreferencesValue {
  themeMode: ThemeMode;
  activeStatus: boolean;
  ready: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setActiveStatus: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [activeStatus, setActiveStatusState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [storedTheme, storedActive] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(ACTIVE_KEY),
        ]);
        if (!active) return;
        if (
          storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "system"
        ) {
          setThemeModeState(storedTheme);
        }
        if (storedActive != null) setActiveStatusState(storedActive !== "false");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    void AsyncStorage.setItem(THEME_KEY, mode);
  };

  const setActiveStatus = (value: boolean) => {
    setActiveStatusState(value);
    void AsyncStorage.setItem(ACTIVE_KEY, value ? "true" : "false");
  };

  const value = useMemo<PreferencesValue>(
    () => ({ themeMode, activeStatus, ready, setThemeMode, setActiveStatus }),
    [themeMode, activeStatus, ready],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}

export function usePreferencesOptional(): PreferencesValue | null {
  return useContext(PreferencesContext);
}
