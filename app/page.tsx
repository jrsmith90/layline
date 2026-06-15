"use client";

import Link from "next/link";
import {
  Activity,
  Anchor,
  BookOpen,
  Clipboard,
  Flag,
  Layers,
  Library,
  Navigation,
} from "lucide-react";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";

const navItems = [
  { href: "/race/pre-race", label: "Pre-Race", icon: Clipboard },
  { href: "/race/live", label: "Race Live", icon: Activity },
  { href: "/race/tactical-board", label: "Tactical Board", icon: Layers },
  { href: "/race/tracker", label: "Course Tracker", icon: Navigation },
  { href: "/race/review", label: "Review", icon: BookOpen },
  { href: "/start", label: "Start", icon: Flag },
  { href: "/race/map", label: "Race Map", icon: Anchor },
  { href: "/course-library", label: "Course Library", icon: Library },
];

export default function HomePage() {
  const { effectiveMode } = useDisplayMode();
  const { isRaceMode, toggleMode } = useAppMode();

  const isIpadLayout = effectiveMode === "ipad";
  const isDesktopLayout = effectiveMode === "desktop";

  if (isDesktopLayout) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-10 py-10">
        <div>
          <div className="layline-kicker">Race Day Dashboard</div>
          <h1 className="mt-2 text-5xl font-black tracking-tight text-[color:var(--text)]">
            Choose the next lane.
          </h1>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Annapolis Bay Racing · {isRaceMode ? "Race Mode" : "Learning Mode"}
          </p>
        </div>

        {/* Nav tiles — spread across top */}
        <div className="flex flex-wrap gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--muted)] transition-colors hover:bg-[color:var(--panel)] hover:text-[color:var(--text)] active:scale-[0.98]"
              >
                <Icon size={15} strokeWidth={2.3} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Controls */}
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
      {/* Header */}
      <div className="px-1">
        <div className="layline-kicker">Race Day Dashboard</div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--text)]">
          Choose the next lane.
        </h1>
      </div>

      {/* Nav tiles — spread across top */}
      <section className="flex flex-wrap gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--muted)] transition-colors hover:bg-[color:var(--panel)] hover:text-[color:var(--text)] active:scale-[0.98]"
            >
              <Icon size={14} strokeWidth={2.3} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
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
    </main>
  );
}
