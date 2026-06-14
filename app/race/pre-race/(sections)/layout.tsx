"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { PreRaceSetupPanel } from "@/components/race/PreRaceSetupPanel";

const SECTIONS = [
  { label: "Course Read", href: "/race/pre-race/course-read" },
  { label: "Sail Package", href: "/race/pre-race/sail-package" },
  { label: "Strategy", href: "/race/pre-race/course-strategy" },
  { label: "Opening Bias", href: "/race/pre-race/opening-bias" },
  { label: "Tactical", href: "/race/pre-race/tactical-snapshot" },
  { label: "Headings", href: "/race/pre-race/heading-reference" },
  { label: "Crew Brief", href: "/race/pre-race/crew-brief" },
];

export default function PreRaceSectionsLayout({ children }: { children: ReactNode }) {
  const { effectiveMode } = useDisplayMode();
  const pathname = usePathname();

  if (effectiveMode !== "desktop") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-8 pt-4">
        <div className="mb-5">
          <Link
            href="/race/pre-race"
            className="layline-kicker transition hover:text-[color:var(--text-soft)]"
          >
            ← Pre-Race
          </Link>
        </div>
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-[color:var(--divider)] bg-[color:var(--bg)] px-8 py-3">
        <div className="flex items-center gap-8">
          <div className="shrink-0">
            <div className="layline-kicker">Pre-Race</div>
            <div className="mt-0.5 text-[0.95rem] font-black leading-tight text-[color:var(--text)]">
              Build the opening picture.
            </div>
          </div>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={[
                  "shrink-0 rounded-lg px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] transition",
                  pathname === s.href
                    ? "bg-[color:var(--panel-soft)] text-[color:var(--text)]"
                    : "text-[color:var(--muted)] hover:text-[color:var(--text-soft)]",
                ].join(" ")}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/race/pre-race/export"
              target="_blank"
              rel="noreferrer"
              className="layline-pill px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[color:var(--favorable)] transition hover:opacity-80"
            >
              Export PDF
            </Link>
            <Link
              href="/race/live"
              className="layline-pill px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-soft)] transition hover:opacity-80"
            >
              Race Live
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-[color:var(--divider)] px-8 py-5">
        <PreRaceSetupPanel hideHeader />
      </div>

      <div className="flex-1 px-8 py-8">
        <div className="pb-8">{children}</div>
      </div>
    </div>
  );
}
