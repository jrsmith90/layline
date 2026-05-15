"use client";

import Link from "next/link";
import Image from "next/image";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import { Flag } from "lucide-react";

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
    href: "/library",
    label: "Library",
    detail: "Trim, troubleshooting, tactics, weather, and notes in one support hub.",
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
                Layline now routes everything through four top-level places. The race workflow
                stays front and center, and the supporting tools live one step away in a calmer
                library instead of competing with the main decision flow.
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

      <section className="layline-panel p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--divider)] bg-black/20 text-[color:var(--text-soft)]">
            <Flag size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="layline-kicker">Trimmed Structure</div>
            <h2 className="mt-1 text-lg font-black tracking-tight text-[color:var(--text)]">
              Everything else now lives behind the main flow.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              Pre-Race owns setup, Race Live owns in-race decisions, Review owns debrief,
              and Library holds supporting references. You can still jump to the advanced
              tools from inside those sections, but they no longer crowd the front door.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/race/pre-race" className="layline-chip text-[color:var(--text)]">
                Pre-Race owns setup
              </Link>
              <Link href="/race/live" className="layline-chip text-[color:var(--text)]">
                Race Live owns live calls
              </Link>
              <Link href="/race/review" className="layline-chip text-[color:var(--text)]">
                Review owns debrief
              </Link>
              <Link href="/library" className="layline-chip text-[color:var(--text)]">
                Library owns references
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
