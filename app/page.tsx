"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  CloudSun,
  Compass,
  Flag,
  Notebook,
  Route,
  Sailboat,
  Waves,
  Wind,
  Wrench,
} from "lucide-react";

const modules = [
  {
    href: "/sail-selection",
    label: "Sail Selection",
    icon: Compass,
    accent: "var(--advisory)",
    race: "Quick sail + reef call",
    learn: "Pre-race setup, sail choice, reef calls",
  },
  {
    href: "/start",
    label: "Start",
    icon: Flag,
    accent: "var(--warning)",
    race: "Lane + pressure",
    learn: "Lane, pressure, and bailout logic",
  },
  {
    href: "/race/pre-race",
    label: "Weather",
    icon: CloudSun,
    accent: "var(--favorable)",
    race: "Route bias check",
    learn: "Pre-race weather, pressure, current, and route bias",
  },
  {
    href: "/trim/main",
    label: "Mainsail Trim",
    icon: Sailboat,
    accent: "var(--unfavorable)",
    race: "Power + depower",
    learn: "Power, balance, and depower controls",
  },
  {
    href: "/trim/jib",
    label: "Headsail Trim",
    icon: Wind,
    accent: "var(--warning)",
    race: "Trim + flow",
    learn: "Lead, sheet, and telltale flow",
  },
  {
    href: "/trim/spin",
    label: "Spinnaker Trim",
    icon: Waves,
    accent: "var(--blue)",
    race: "Downwind control",
    learn: "Downwind trim and control",
  },
  {
    href: "/tactics",
    label: "Tactics",
    icon: Route,
    accent: "var(--favorable)",
    race: "Decisions",
    learn: "Upwind and downwind decisions",
  },
  {
    href: "/troubleshoot",
    label: "Troubleshoot",
    icon: Wrench,
    accent: "var(--unfavorable)",
    race: "Fix fast",
    learn: "Fix speed, control, and trim issues",
  },
  {
    href: "/notes",
    label: "Notes",
    icon: Notebook,
    accent: "var(--muted)",
    race: "Review later",
    learn: "Logs and learning",
  },
];

export default function HomePage() {
  const [raceMode, setRaceMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("race-mode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("race-mode", raceMode ? "true" : "false");
  }, [raceMode]);

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-8 pt-3">
      <header className="layline-panel overflow-hidden p-4">
        <div className="overflow-hidden rounded-xl border border-[color:var(--divider)] bg-[color:var(--bg-deep)]">
          <Image
            src="/laylinemain.png"
            alt="Layline Sail Smarter"
            width={1536}
            height={1024}
            priority
            className="h-auto w-full"
          />
        </div>
        <h1 className="sr-only">Layline</h1>
        <p className="mt-4 text-center text-sm leading-5 text-[color:var(--text-soft)]">
          Decision support for starts, trim, weather, and race-course tactics.
        </p>

        <div className="my-5 layline-rule" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Active Mode
            </div>
            <div className="text-sm font-semibold text-[color:var(--text)]">
              {raceMode ? "Race Mode" : "Learning Mode"}
            </div>
          </div>

          <button
            onClick={() => setRaceMode((v) => !v)}
            className="layline-pill relative flex w-40 items-center justify-between p-1 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98]"
            aria-label="Toggle race mode"
          >
            <span
              className={`absolute top-1 h-8 w-[4.65rem] rounded-full transition-all duration-200 ${
                raceMode
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
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="layline-kicker">Modules</div>
          <div className="text-xs text-[color:var(--muted)]">Tap to open</div>
        </div>

        <div className="grid gap-3">
          {modules.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group layline-panel block p-4 transition duration-150 active:scale-[0.985]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-[color:var(--panel-soft)] transition group-active:scale-95"
                    style={{
                      color: item.accent,
                      borderColor: "color-mix(in srgb, var(--divider) 72%, transparent)",
                    }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="truncate text-sm font-extrabold uppercase tracking-wide text-[color:var(--text)]">
                        {item.label}
                      </h2>
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.accent }}
                      />
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
                      {raceMode ? item.race : item.learn}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
