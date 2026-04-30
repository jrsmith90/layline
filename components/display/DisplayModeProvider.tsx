"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MonitorSmartphone, Smartphone, Tablet } from "lucide-react";

export type DisplayMode = "auto" | "phone" | "ipad";
export type EffectiveDisplayMode = "phone" | "ipad";

type DisplayModeContextValue = {
  mode: DisplayMode;
  effectiveMode: EffectiveDisplayMode;
  setMode: (mode: DisplayMode) => void;
};

const DISPLAY_MODE_KEY = "layline-display-mode";
const IPAD_WIDTH_QUERY = "(min-width: 768px)";

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

const displayOptions: Array<{
  mode: DisplayMode;
  label: string;
  description: string;
  icon: typeof MonitorSmartphone;
}> = [
  {
    mode: "auto",
    label: "Auto",
    description: "Match the screen",
    icon: MonitorSmartphone,
  },
  {
    mode: "phone",
    label: "Phone",
    description: "Compact cockpit view",
    icon: Smartphone,
  },
  {
    mode: "ipad",
    label: "iPad",
    description: "Wider dashboard view",
    icon: Tablet,
  },
];

function readSavedMode(): DisplayMode {
  if (typeof window === "undefined") return "auto";

  const saved = localStorage.getItem(DISPLAY_MODE_KEY);
  return saved === "phone" || saved === "ipad" || saved === "auto"
    ? saved
    : "auto";
}

function getAutoDisplayMode(): EffectiveDisplayMode {
  if (typeof window === "undefined") return "phone";
  return window.matchMedia(IPAD_WIDTH_QUERY).matches ? "ipad" : "phone";
}

export function useDisplayMode() {
  const context = useContext(DisplayModeContext);

  if (!context) {
    throw new Error("useDisplayMode must be used inside DisplayModeProvider.");
  }

  return context;
}

export function DisplayModeControl() {
  const { mode, effectiveMode, setMode } = useDisplayMode();

  return (
    <section className="rounded-2xl border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/45 p-3">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <div className="layline-kicker">Display</div>
          <div className="mt-1 text-sm font-semibold text-[color:var(--text)]">
            {effectiveMode === "ipad" ? "iPad layout" : "Phone layout"}
          </div>
        </div>
        <div className="text-right text-xs leading-5 text-[color:var(--muted)]">
          Optimizes spacing, columns, and cockpit controls.
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {displayOptions.map((option) => {
          const Icon = option.icon;
          const selected = mode === option.mode;

          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => setMode(option.mode)}
              className={[
                "layline-pill flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 text-center transition active:scale-[0.98]",
                selected
                  ? "border-[color:var(--favorable)] text-[color:var(--text)]"
                  : "text-[color:var(--muted)]",
              ].join(" ")}
              aria-pressed={selected}
            >
              <Icon size={18} strokeWidth={2.3} />
              <span className="text-xs font-extrabold uppercase tracking-wide">
                {option.label}
              </span>
              <span className="hidden text-[0.68rem] leading-3 text-[color:var(--muted)] sm:block">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DisplayMode>(readSavedMode);
  const [autoMode, setAutoMode] = useState<EffectiveDisplayMode>(
    getAutoDisplayMode
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(IPAD_WIDTH_QUERY);

    function syncAutoMode() {
      setAutoMode(mediaQuery.matches ? "ipad" : "phone");
    }

    syncAutoMode();
    mediaQuery.addEventListener("change", syncAutoMode);

    return () => mediaQuery.removeEventListener("change", syncAutoMode);
  }, []);

  const effectiveMode: EffectiveDisplayMode =
    mode === "auto" ? autoMode : mode;

  useEffect(() => {
    document.documentElement.dataset.laylineDisplay = effectiveMode;
  }, [effectiveMode]);

  function setMode(nextMode: DisplayMode) {
    setModeState(nextMode);
    localStorage.setItem(DISPLAY_MODE_KEY, nextMode);
  }

  const value = useMemo<DisplayModeContextValue>(
    () => ({
      mode,
      effectiveMode,
      setMode,
    }),
    [effectiveMode, mode]
  );

  return (
    <DisplayModeContext.Provider value={value}>
      {children}
    </DisplayModeContext.Provider>
  );
}
