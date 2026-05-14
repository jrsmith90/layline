"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigation } from "lucide-react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { useGpsCourse } from "@/lib/useGpsCourse";

const GPS_ENABLED_KEY = "layline-phone-gps-enabled";

type PhoneGpsContextValue = ReturnType<typeof useGpsCourse> & {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
};

const PhoneGpsContext = createContext<PhoneGpsContextValue | null>(null);

export function usePhoneGps() {
  const context = useContext(PhoneGpsContext);

  if (!context) {
    throw new Error("usePhoneGps must be used inside PhoneGpsProvider.");
  }

  return context;
}

function formatSpeedKt(sogMps: number | null) {
  if (sogMps == null) return null;
  return sogMps * 1.943844;
}

function FloatingGpsControl() {
  const gps = usePhoneGps();
  const { effectiveMode } = useDisplayMode();
  const speedKt = formatSpeedKt(gps.sogMps);

  const statusText = !gps.supported
    ? "Unavailable"
    : gps.permission === "denied"
      ? "Denied"
      : gps.enabled
        ? gps.freshness === "stale"
          ? "Stale"
          : gps.cogDeg == null
          ? "Acquiring"
            : `${Math.round(gps.cogDeg)} deg`
        : "Off";

  return (
    <div
      className={[
        "fixed inset-x-0 bottom-3 z-50 mx-auto w-full px-4",
        effectiveMode === "desktop"
          ? "max-w-xl"
          : effectiveMode === "ipad"
            ? "max-w-lg"
            : "max-w-md",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={gps.toggle}
        disabled={!gps.supported}
        className={[
          "layline-pill flex w-full items-center justify-between gap-3 px-4 py-3 text-left shadow-lg backdrop-blur",
          gps.enabled ? "border-[color:var(--favorable)]" : "",
          !gps.supported ? "opacity-60" : "",
        ].join(" ")}
        aria-label={gps.enabled ? "Turn phone GPS off" : "Turn phone GPS on"}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
              gps.enabled
                ? "border-[color:var(--favorable)] text-[color:var(--favorable)]"
                : "border-[color:var(--divider)] text-[color:var(--muted)]",
            ].join(" ")}
          >
            <Navigation size={17} strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Phone GPS
            </span>
            <span className="block truncate text-sm font-semibold text-[color:var(--text)]">
              {statusText}
              {speedKt != null ? ` · ${speedKt.toFixed(1)} kt` : ""}
            </span>
          </span>
        </span>
        <span
          className={[
            "h-3 w-3 shrink-0 rounded-full",
            gps.enabled && gps.permission !== "denied"
              ? gps.confidence === "low" || gps.freshness === "stale"
                ? "bg-[color:var(--warning)]"
                : gps.confidence === "medium"
                  ? "bg-amber-300"
                  : "bg-[color:var(--favorable)]"
              : "bg-[color:var(--divider)]",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export function PhoneGpsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(GPS_ENABLED_KEY) === "true";
  });
  const gps = useGpsCourse(enabled);

  function setEnabled(nextEnabled: boolean) {
    setEnabledState(nextEnabled);
    localStorage.setItem(GPS_ENABLED_KEY, String(nextEnabled));
  }

  const value = useMemo<PhoneGpsContextValue>(
    () => ({
      ...gps,
      enabled,
      setEnabled,
      toggle: () => setEnabled(!enabled),
    }),
    [enabled, gps]
  );

  return (
    <PhoneGpsContext.Provider value={value}>
      {children}
      <FloatingGpsControl />
    </PhoneGpsContext.Provider>
  );
}
