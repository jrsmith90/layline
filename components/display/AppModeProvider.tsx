"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { APP_MODE_KEY, isAppMode, type AppMode } from "@/lib/appMode";

type AppModeContextValue = {
  mode: AppMode;
  isRaceMode: boolean;
  isLearningMode: boolean;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

function readSavedMode(): AppMode {
  if (typeof window === "undefined") return "learning";

  const saved = localStorage.getItem(APP_MODE_KEY);
  return isAppMode(saved) ? saved : "learning";
}

export function useAppMode() {
  const context = useContext(AppModeContext);

  if (!context) {
    throw new Error("useAppMode must be used inside AppModeProvider.");
  }

  return context;
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("learning");
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only run initialization once after hydration
    if (!initializedRef.current) {
      initializedRef.current = true;
      const savedMode = readSavedMode();
      if (savedMode !== "learning") {
        queueMicrotask(() => setModeState(savedMode));
      }
    }
  }, []);

  useEffect(() => {
    // Save mode to localStorage whenever it changes
    localStorage.setItem(APP_MODE_KEY, mode);
    // Update document attribute
    document.documentElement.dataset.laylineAppMode = mode;
  }, [mode]);

  function setMode(nextMode: AppMode) {
    setModeState(nextMode);
  }

  function toggleMode() {
    setModeState((current) => (current === "race" ? "learning" : "race"));
  }

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      isRaceMode: mode === "race",
      isLearningMode: mode === "learning",
      setMode,
      toggleMode,
    }),
    [mode],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}
