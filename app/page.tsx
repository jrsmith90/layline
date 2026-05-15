"use client";

import Link from "next/link";
import Image from "next/image";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import {
  CloudSun,
  Flag,
  Library,
  Map,
  Notebook,
  Route,
  Sailboat,
  Wrench,
} from "lucide-react";

const primaryFlow = [
  {
    href: "/race/pre-race",
    label: "Pre-Race",
    detail: "Course conditions, sail call, and opening-bias plan.",
  },
  {
    href: "/race/live",
    label: "Race Live",
    detail: "Big tactical calls, confidence, and live tactical board.",
  },
  {
    href: "/race/review",
    label: "Review",
    detail: "Replay calls, snapshots, and post-race notes.",
  },
  {
    href: "/race/tracker",
    label: "Course Tracker",
    detail: "Mark progress, layline timing, and manual recovery controls.",
  },
];

const moduleGroups = [
  {
    title: "Race Setup",
    icon: CloudSun,
    summary: "Plan the race day and build the opening picture before the gun.",
    items: [
      { href: "/race/map", label: "Race Map", detail: "Chart, current, and wind map" },
      { href: "/race/tactical-board", label: "Tactical Board", detail: "Shift memory and target headings" },
      { href: "/race/pre-race/sail-selection", label: "Sail Selection", detail: "Match sails to the day" },
      { href: "/weather/current", label: "Current Weather", detail: "Latest course weather feed" },
    ],
  },
  {
    title: "Live Decisions",
    icon: Flag,
    summary: "Keep the next move visible while the race is unfolding.",
    items: [
      { href: "/race/live", label: "Race Live", detail: "Primary cockpit display" },
      { href: "/race/tracker", label: "Course Tracker", detail: "Leg-by-leg mark progress" },
      { href: "/tactics", label: "Tactics", detail: "Upwind and downwind call support" },
      { href: "/troubleshoot", label: "Troubleshoot", detail: "Fix speed, control, and lane issues fast" },
    ],
  },
  {
    title: "Reference Deck",
    icon: Library,
    summary: "Reach for trim references and notes without cluttering race-time decisions.",
    items: [
      { href: "/trim/main", label: "Main Trim", detail: "Power, balance, and depower" },
      { href: "/trim/jib", label: "Headsail Trim", detail: "Lead, sheet, and flow" },
      { href: "/trim/spin", label: "Spinnaker Trim", detail: "Downwind control and pace" },
      { href: "/notes", label: "Notes", detail: "Keep logs and debrief points together" },
    ],
  },
];

const quickToolLinks = [
  { href: "/start", label: "Start", icon: Flag },
  { href: "/race/map", label: "Map", icon: Map },
  { href: "/trim/main", label: "Trim", icon: Sailboat },
  { href: "/tactics", label: "Tactics", icon: Route },
  { href: "/troubleshoot", label: "Fix", icon: Wrench },
  { href: "/notes", label: "Notes", icon: Notebook },
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
        "mx-auto space-y-5 px-4 pb-10 pt-4",
        isDesktopLayout ? "max-w-7xl" : isIpadLayout ? "max-w-5xl" : "max-w-md",
      ].join(" ")}
    >
      <section className="layline-panel overflow-hidden p-0">
        <div
          className={[
            "grid gap-0",
            isDesktopLayout
              ? "lg:grid-cols-[0.95fr_1.05fr]"
              : isWideLayout
                ? "md:grid-cols-[1fr_1fr]"
                : "",
          ].join(" ")}
        >
          <div className="flex flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="layline-kicker">Race Day Dashboard</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[color:var(--text)] sm:text-[2.5rem]">
                Keep the next sailing decision obvious.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-soft)] sm:text-[0.98rem]">
                Layline now has enough live tools that the interface needs to steer attention.
                Start from one clear workflow, keep only the next few decisions visible, and
                leave the deeper references one step away.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="layline-chip text-[color:var(--text)]">
                {isRaceMode ? "Race Mode Active" : "Learning Mode Active"}
              </span>
              <span className="layline-chip text-[color:var(--text)]">
                Display · {effectiveMode}
              </span>
              <span className="layline-chip text-[color:var(--text)]">Phone-first workflow</span>
            </div>
          </div>

          <div className="relative border-t border-white/10 p-3 md:border-l md:border-t-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(127,183,255,0.16),transparent_36%)]" />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(23,51,79,0.78),rgba(7,22,37,0.24))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Image
                src="/laylinemain.png"
                alt="Layline Sail Smarter"
                width={1536}
                height={1024}
                priority
                className="h-auto w-full rounded-[1rem]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="layline-panel p-4">
          <div className="layline-kicker">Mode</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-[color:var(--text)]">
                {isRaceMode ? "Race Mode" : "Learning Mode"}
              </div>
              <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
                {isRaceMode
                  ? "Short, high-priority language for race-time decisions."
                  : "More explanation, coaching, and support detail while learning."}
              </p>
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
          <div className="mt-2 text-lg font-black text-[color:var(--text)]">Viewport Behavior</div>
          <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
            Keep the layout tuned for the device you are holding so race-time screens stay legible.
          </p>
          <div className="mt-4">
            <DisplayModeControl />
          </div>
        </div>
      </section>

      <WorkflowQuickLinks title="Primary Workflow" items={primaryFlow} />

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="layline-kicker">Quick Tools</div>
          <div className="text-xs text-[color:var(--muted)]">Fast access</div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {quickToolLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="layline-panel flex flex-col items-center justify-center gap-2 px-3 py-4 text-center transition active:scale-[0.99]"
              >
                <Icon size={18} className="text-[color:var(--text-soft)]" />
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--text)]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="layline-kicker">Tool Deck</div>
          <div className="text-xs text-[color:var(--muted)]">Organized by job</div>
        </div>

        <div
          className={[
            "grid gap-3",
            isDesktopLayout ? "grid-cols-3" : isWideLayout ? "grid-cols-2" : "grid-cols-1",
          ].join(" ")}
        >
          {moduleGroups.map((group) => {
            const GroupIcon = group.icon;

            return (
              <section key={group.title} className="layline-panel p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--divider)] bg-black/20 text-[color:var(--text-soft)]">
                    <GroupIcon size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black tracking-tight text-[color:var(--text)]">
                      {group.title}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
                      {group.summary}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 transition active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-black text-[color:var(--text)]">{item.label}</div>
                        <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                          {item.detail}
                        </div>
                      </div>
                      <span className="text-sm font-black text-[color:var(--muted)]">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
