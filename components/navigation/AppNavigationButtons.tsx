"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";

const routeTitles = [
  { prefix: "/library", title: "Library" },
  { prefix: "/race/pre-race/sail-selection", title: "Sail Selection" },
  { prefix: "/race/pre-race", title: "Pre-Race" },
  { prefix: "/race/tactical-board", title: "Tactical Board" },
  { prefix: "/race/live", title: "Race Live" },
  { prefix: "/race/tracker", title: "Course Tracker" },
  { prefix: "/race/review", title: "After Action Review" },
  { prefix: "/race/map", title: "Race Map" },
  { prefix: "/weather/current", title: "Current Weather" },
  { prefix: "/start", title: "Start" },
  { prefix: "/tactics", title: "Tactics" },
  { prefix: "/trim", title: "Trim" },
  { prefix: "/troubleshoot", title: "Troubleshoot" },
  { prefix: "/notes", title: "After Action Review" },
  { prefix: "/logs", title: "After Action Review" },
];

export function AppNavigationButtons() {
  const pathname = usePathname();
  const router = useRouter();
  const { effectiveMode } = useDisplayMode();
  const isHome = pathname === "/";
  const pageTitle =
    routeTitles.find((route) => pathname.startsWith(route.prefix))?.title ?? "Layline";

  if (isHome) return null;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-[color:var(--divider)] bg-[color:var(--bg)]/90 px-4 py-3 backdrop-blur">
      <div
        className={[
          "mx-auto flex items-center justify-between gap-3",
          effectiveMode === "desktop"
            ? "max-w-7xl"
            : effectiveMode === "ipad"
              ? "max-w-5xl"
              : "max-w-md",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={goBack}
          className="layline-pill flex h-11 w-11 items-center justify-center text-[color:var(--text)] transition active:scale-[0.98]"
          aria-label="Go back"
        >
          <ArrowLeft size={17} strokeWidth={2.4} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Layline
          </div>
          <div className="truncate text-sm font-black text-[color:var(--text)]">{pageTitle}</div>
        </div>

        <Link
          href="/"
          className="layline-pill flex h-11 w-11 items-center justify-center text-[color:var(--text)] transition active:scale-[0.98]"
          aria-label="Return home"
        >
          <Home size={17} strokeWidth={2.4} />
        </Link>
      </div>
    </nav>
  );
}
