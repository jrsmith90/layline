"use client";

import Link from "next/link";
import Image from "next/image";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";
import {
  CloudSun,
  Flag,
  Library,
  Map,
  Notebook,
  Route,
  Sailboat,
  Waves,
  Wind,
  Wrench,
} from "lucide-react";

const moduleGroups = [
  {
    title: "Pre Race",
    icon: CloudSun,
    accent: "#22c55e",
    summary: "Plan the day, choose sails, and get the start organized.",
    items: [
      {
        href: "/race/map",
        label: "Race Map",
        icon: Map,
        accent: "#38bdf8",
        race: "NOAA chart",
        learn: "Wind, tide, and current map",
      },
      {
        href: "/race/pre-race",
        label: "Pre-Race",
        icon: CloudSun,
        accent: "#22c55e",
        race: "Conditions + sail call",
        learn: "Course conditions, route bias, and sail selection",
      },
      {
        href: "/start",
        label: "Start",
        icon: Flag,
        accent: "#ef4444",
        race: "Lane + pressure",
        learn: "Lane, pressure, and bailout logic",
      },
    ],
  },
  {
    title: "Live During Race",
    icon: Flag,
    accent: "#f59e0b",
    summary: "Cockpit tools for course position, mark progress, and tactics.",
    items: [
      {
        href: "/race/live",
        label: "Race Live",
        icon: Flag,
        accent: "#f59e0b",
        race: "Cockpit mode",
        learn: "Big-display course, VMG, and tack calls",
      },
      {
        href: "/race/tracker",
        label: "Course Tracker",
        icon: Route,
        accent: "#06b6d4",
        race: "Mark progress",
        learn: "COG, VMG, layline, and tack timing",
      },
      {
        href: "/tactics",
        label: "Tactics",
        icon: Route,
        accent: "#eab308",
        race: "Decisions",
        learn: "Upwind and downwind decisions",
      },
    ],
  },
  {
    title: "Troubleshooting",
    icon: Wrench,
    accent: "#f97316",
    summary: "Diagnose speed, control, lane, and balance problems fast.",
    items: [
      {
        href: "/troubleshoot",
        label: "Troubleshoot",
        icon: Wrench,
        accent: "#f97316",
        race: "Fix fast",
        learn: "Fix speed, control, and trim issues",
      },
    ],
  },
  {
    title: "Library",
    icon: Library,
    accent: "#3b82f6",
    summary: "Trim reference, notes, and race review material.",
    items: [
      {
        href: "/trim/main",
        label: "Mainsail Trim",
        icon: Sailboat,
        accent: "#3b82f6",
        race: "Power + depower",
        learn: "Power, balance, and depower controls",
      },
      {
        href: "/trim/jib",
        label: "Headsail Trim",
        icon: Wind,
        accent: "#a855f7",
        race: "Trim + flow",
        learn: "Lead, sheet, and telltale flow",
      },
      {
        href: "/trim/spin",
        label: "Spinnaker Trim",
        icon: Waves,
        accent: "#14b8a6",
        race: "Downwind control",
        learn: "Downwind trim and control",
      },
      {
        href: "/notes",
        label: "Notes",
        icon: Notebook,
        accent: "#94a3b8",
        race: "Review later",
        learn: "Logs and learning",
      },
      {
        href: "/race/review",
        label: "After Action Report",
        icon: Notebook,
        accent: "#ec4899",
        race: "Good/bad/neutral calls",
        learn: "Score the day and plan practice",
      },
    ],
  },
];

export default function HomePage() {
  const { effectiveMode } = useDisplayMode();
  const { isRaceMode, toggleMode } = useAppMode();

  const isIpadLayout = effectiveMode === "ipad";
  const isDesktopLayout = effectiveMode === "desktop";
  const isWideLayout = isIpadLayout || isDesktopLayout;

  return (
    <main
      className={[
        "mx-auto space-y-5 px-4 pb-8 pt-3",
        isDesktopLayout ? "max-w-7xl" : isIpadLayout ? "max-w-5xl" : "max-w-md",
      ].join(" ")}
    >
      <header className="layline-panel overflow-hidden p-4">
        <div
          className={[
            "grid gap-4",
            isDesktopLayout
              ? "items-center lg:grid-cols-[1.05fr_0.95fr]"
              : isIpadLayout
                ? "items-center md:grid-cols-[1.15fr_0.85fr]"
                : "",
          ].join(" ")}
        >
          <div className="relative overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_50%_10%,rgba(0,168,168,0.22),transparent_52%),linear-gradient(180deg,rgba(23,51,79,0.68),rgba(7,22,37,0.16))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
            <Image
              src="/laylinemain.png"
              alt="Layline Sail Smarter"
              width={1536}
              height={1024}
              priority
              className="h-auto w-full rounded-[1.15rem]"
            />
          </div>

          <div>
            <h1 className="sr-only">Layline</h1>
            <p className="text-center text-sm leading-5 text-[color:var(--text-soft)] md:text-left">
              Decision support for starts, trim, weather, and race-course tactics.
            </p>

            <div className="my-5 layline-rule" />

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Active Mode
                </div>
                <div className="text-sm font-semibold text-[color:var(--text)]">
                  {isRaceMode ? "Race Mode" : "Learning Mode"}
                </div>
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

            <div className="mt-4">
              <DisplayModeControl />
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="layline-kicker">Race Workflow</div>
          <div className="text-xs text-[color:var(--muted)]">Grouped</div>
        </div>

        <div
          className={[
            "grid gap-3",
            isDesktopLayout
              ? "grid-cols-4"
              : isWideLayout
                ? "grid-cols-2"
                : "grid-cols-1",
          ].join(" ")}
        >
          {moduleGroups.map((group) => {
            const GroupIcon = group.icon;

            return (
              <div
                key={group.title}
                className="layline-panel flex min-h-52 flex-col gap-4 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-[color:var(--panel)] shadow-sm"
                    style={{
                      color: group.accent,
                      borderColor: group.accent,
                    }}
                  >
                    <GroupIcon size={19} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black uppercase leading-5 text-[color:var(--text)]">
                      {group.title}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
                      {group.summary}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-3 rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-soft)] px-3 py-2.5 transition duration-150 active:scale-[0.99]"
                        aria-label={`${item.label}: ${
                          isRaceMode ? item.race : item.learn
                        }`}
                        title={item.label}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-[color:var(--panel)] transition group-active:scale-95"
                          style={{
                            color: item.accent,
                            borderColor: item.accent,
                          }}
                        >
                          <Icon size={17} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold leading-5 text-[color:var(--text-soft)]">
                            {item.label}
                          </div>
                          <div className="truncate text-xs leading-4 text-[color:var(--muted)]">
                            {isRaceMode ? item.race : item.learn}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
