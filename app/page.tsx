"use client";

import Image from "next/image";
import Link from "next/link";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";

const primaryFlow = [
  { href: "/race/pre-race", label: "Pre-Race" },
  { href: "/race/live", label: "Race Live" },
  { href: "/race/review", label: "Review" },
  { href: "/library", label: "Library" },
];

const quickTools = [
  { href: "/race/brief", label: "Skipper Brief" },
  { href: "/race/pre-race#tactical-board", label: "Tactical Board" },
  { href: "/start", label: "Start" },
  { href: "/trim", label: "Trim" },
];

// Links that the desktop sidebar does not already show
const desktopExtras = [
  { href: "/library", label: "Library" },
  { href: "/race/brief", label: "Skipper Brief" },
  { href: "/trim", label: "Trim" },
  { href: "/weather/current", label: "Weather" },
];

export default function HomePage() {
  const { effectiveMode } = useDisplayMode();
  const { isRaceMode, toggleMode } = useAppMode();

  const isIpadLayout = effectiveMode === "ipad";
  const isDesktopLayout = effectiveMode === "desktop";

  if (isDesktopLayout) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-10 py-10">
        {/* Title */}
        <div>
          <div className="layline-kicker">Race Day Dashboard</div>
          <h1 className="mt-2 text-5xl font-black tracking-tight text-[color:var(--text)]">
            Choose the next lane.
          </h1>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Annapolis Bay Racing · {isRaceMode ? "Race Mode" : "Learning Mode"}
          </p>
        </div>

        {/* Controls row */}
        <div className="grid max-w-3xl grid-cols-2 gap-5">
          <div className="layline-panel p-5">
            <div className="layline-kicker">Mode</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-base font-black text-[color:var(--text)]">
                {isRaceMode ? "Race Mode" : "Learning Mode"}
              </div>
              <button
                onClick={toggleMode}
                className="layline-pill relative flex w-36 items-center justify-between p-1 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98]"
                aria-label="Toggle race mode"
              >
                <span
                  className={`absolute top-1 h-8 w-[4.15rem] rounded-full transition-all duration-200 ${
                    isRaceMode
                      ? "left-[4.35rem] bg-[color:var(--unfavorable)]"
                      : "left-1 bg-[color:var(--favorable)]"
                  }`}
                />
                <span className="relative z-10 flex h-8 w-[4.15rem] items-center justify-center text-white">
                  Learn
                </span>
                <span className="relative z-10 flex h-8 w-[4.15rem] items-center justify-center text-white">
                  Race
                </span>
              </button>
            </div>
          </div>

          <div className="layline-panel p-5">
            <DisplayModeControl />
          </div>
        </div>

        {/* Extra quick links not covered by the sidebar */}
        <div>
          <div className="layline-kicker mb-3">Quick Access</div>
          <div className="flex flex-wrap gap-3">
            {desktopExtras.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="layline-pill px-5 py-3 text-sm font-semibold text-[color:var(--text)] transition hover:text-[color:var(--favorable)] active:scale-[0.98]"
              >
                {item.label} →
              </Link>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={[
        "mx-auto space-y-5 px-4 pb-10 pt-4",
        isIpadLayout ? "max-w-5xl" : "max-w-md",
      ].join(" ")}
    >
      {/* Hero */}
      <section className="layline-panel overflow-hidden p-0">
        <div className={["grid gap-0", isIpadLayout ? "md:grid-cols-2" : ""].join(" ")}>
          <div className="flex flex-col justify-between p-5">
            <div>
              <div className="layline-kicker">Race Day Dashboard</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[color:var(--text)]">
                Choose the next lane.
              </h1>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="layline-chip text-[color:var(--text)]">
                {isRaceMode ? "Race Mode" : "Learning Mode"}
              </span>
              <span className="layline-chip text-[color:var(--text)]">
                Display · {effectiveMode}
              </span>
            </div>
          </div>

          <div className="border-t border-[color:var(--divider)] p-3 md:border-l md:border-t-0">
            <Image
              src="/laylinemain.png"
              alt="Layline Sail Smarter"
              width={1536}
              height={1024}
              priority
              className="h-auto w-full rounded-xl"
            />
          </div>
        </div>
      </section>

      {/* Mode + display controls */}
      <section className={["grid gap-3", isIpadLayout ? "grid-cols-2" : ""].join(" ")}>
        <div className="layline-panel p-4">
          <div className="layline-kicker">Mode</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-base font-black text-[color:var(--text)]">
              {isRaceMode ? "Race Mode" : "Learning Mode"}
            </div>
            <button
              onClick={toggleMode}
              className="layline-pill relative flex w-40 items-center justify-between p-1 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98]"
              aria-label="Toggle race mode"
            >
              <span
                className={`absolute top-1 h-8 w-[4.65rem] rounded-full transition-all duration-200 ${
                  isRaceMode
                    ? "left-[4.85rem] bg-[color:var(--unfavorable)]"
                    : "left-1 bg-[color:var(--favorable)]"
                }`}
              />
              <span className="relative z-10 flex h-8 w-[4.65rem] items-center justify-center text-white">
                Learn
              </span>
              <span className="relative z-10 flex h-8 w-[4.65rem] items-center justify-center text-white">
                Race
              </span>
            </button>
          </div>
        </div>

        <div className="layline-panel p-4">
          <div className="layline-kicker">Display</div>
          <div className="mt-4">
            <DisplayModeControl />
          </div>
        </div>
      </section>

      <WorkflowQuickLinks title="Primary Workflow" items={primaryFlow} />
      <WorkflowQuickLinks title="Quick Tools" items={quickTools} />
    </main>
  );
}
