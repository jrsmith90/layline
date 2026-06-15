"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Anchor,
  BookOpen,
  Clipboard,
  Crosshair,
  Flag,
  Home,
  Laptop,
  Layers,
  Library,
  MonitorSmartphone,
  Navigation,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Wrench,
} from "lucide-react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";

const displayOptions = [
  { mode: "auto" as const, label: "Auto", icon: MonitorSmartphone },
  { mode: "phone" as const, label: "Phone", icon: Smartphone },
  { mode: "ipad" as const, label: "iPad", icon: Tablet },
  { mode: "desktop" as const, label: "Desk", icon: Laptop },
];

const navItems = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/race/pre-race", label: "Pre-Race", icon: Clipboard, exact: false },
  { href: "/race/live", label: "Race Live", icon: Activity, exact: false },
  { href: "/race/tactical-board", label: "Tactical Board", icon: Layers, exact: false },
  { href: "/race/tracker", label: "Course Tracker", icon: Navigation, exact: false },
  { href: "/race/review", label: "Review", icon: BookOpen, exact: false },
  { href: "/start", label: "Start", icon: Flag, exact: false },
  { href: "/race/map", label: "Race Map", icon: Anchor, exact: false },
  { href: "/course-library", label: "Course Library", icon: Library, exact: false },
  { href: "/trim", label: "Trim", icon: SlidersHorizontal, exact: false },
  { href: "/tactics", label: "Tactics", icon: Crosshair, exact: false },
  { href: "/troubleshoot", label: "Troubleshoot", icon: Wrench, exact: false },
];

export function AppSidebar() {
  const { effectiveMode, mode, setMode } = useDisplayMode();
  const pathname = usePathname();

  if (effectiveMode !== "desktop") return null;

  return (
    <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-[color:var(--divider)] bg-[color:var(--bg-deep)]">
      <div className="border-b border-[color:var(--divider)] px-5 py-5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Layline
        </div>
        <div className="mt-0.5 text-sm font-black text-[color:var(--text)]">Sailing Tactics</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-[color:var(--panel-soft)] text-[color:var(--text)]"
                  : "text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--text)]",
              ].join(" ")}
            >
              <Icon size={15} strokeWidth={2.3} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[color:var(--divider)] px-3 py-3">
        <div className="layline-kicker mb-2">Display</div>
        <div className="grid grid-cols-4 gap-1">
          {displayOptions.map(({ mode: m, label, icon: Icon }) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                "flex flex-col items-center gap-1 rounded-lg py-2 text-center transition active:scale-[0.97]",
                mode === m
                  ? "bg-[color:var(--panel-soft)] text-[color:var(--text)]"
                  : "text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--text)]",
              ].join(" ")}
            >
              <Icon size={14} strokeWidth={2.3} />
              <span className="text-[0.6rem] font-bold uppercase tracking-wide leading-none">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-[color:var(--divider)] pt-3 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Annapolis · Bay Racing
        </div>
      </div>
    </aside>
  );
}
