"use client";

import Image from "next/image";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";

const primaryFlow = [
  {
    href: "/race/pre-race",
    label: "Pre-Race",
  },
  {
    href: "/race/live",
    label: "Race Live",
  },
  {
    href: "/race/review",
    label: "Review",
  },
  {
    href: "/library",
    label: "Library",
  },
];

const quickTools = [
  { href: "/race/pre-race/sail-selection", label: "Sail Selection" },
  { href: "/race/pre-race#tactical-board", label: "Tactical Board" },
  { href: "/start", label: "Start" },
  { href: "/trim", label: "Trim" },
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
                Choose the next lane.
              </h1>
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
          <div className="mt-2 text-lg font-black text-[color:var(--text)]">Viewport</div>
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
