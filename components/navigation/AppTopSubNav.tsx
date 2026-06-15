"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";

type SubNavItem = { href: string; label: string; exact?: boolean };

const sections: { match: string; title: string; items: SubNavItem[] }[] = [
  {
    match: "/race/pre-race",
    title: "Pre-Race",
    items: [
      { href: "/race/pre-race", label: "Overview", exact: true },
      { href: "/race/pre-race/sail-selection", label: "Sail Selection" },
      { href: "/race/brief", label: "Skipper Brief" },
      { href: "/race/pre-race/export", label: "Export" },
    ],
  },
  {
    match: "/race/review",
    title: "Review",
    items: [
      { href: "/race/review", label: "Review", exact: true },
      { href: "/notes", label: "Notes" },
      { href: "/logs", label: "Logs" },
    ],
  },
  {
    match: "/course-library",
    title: "Course Library",
    items: [
      { href: "/course-library", label: "All Courses", exact: true },
      { href: "/course-library/new", label: "New Course" },
    ],
  },
  {
    match: "/trim",
    title: "Trim",
    items: [
      { href: "/trim", label: "Overview", exact: true },
      { href: "/trim/main", label: "Main" },
      { href: "/trim/jib", label: "Jib" },
      { href: "/trim/spin", label: "Spinnaker" },
      { href: "/trim/downwind", label: "Downwind" },
    ],
  },
  {
    match: "/tactics",
    title: "Tactics",
    items: [
      { href: "/tactics", label: "Overview", exact: true },
      { href: "/tactics/upwind", label: "Upwind" },
      { href: "/tactics/downwind", label: "Downwind" },
      { href: "/tactics/covering", label: "Covering" },
    ],
  },
  {
    match: "/troubleshoot",
    title: "Troubleshoot",
    items: [
      { href: "/troubleshoot", label: "Overview", exact: true },
      { href: "/troubleshoot/slow", label: "Slow" },
      { href: "/troubleshoot/bad-air", label: "Bad Air" },
      { href: "/troubleshoot/lane", label: "Lane" },
      { href: "/troubleshoot/overpowered", label: "Overpowered" },
      { href: "/troubleshoot/pinching", label: "Pinching" },
    ],
  },
];

export function AppTopSubNav() {
  const pathname = usePathname();
  const { effectiveMode } = useDisplayMode();

  if (effectiveMode !== "desktop") return null;

  const section = sections.find((s) => pathname.startsWith(s.match));
  if (!section) return null;

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center gap-0 border-b border-[color:var(--divider)] bg-[color:var(--bg-deep)] px-8 print:hidden">
      <span className="layline-kicker shrink-0">{section.title}</span>
      <div className="mx-4 h-3.5 w-px shrink-0 bg-[color:var(--divider)]" />
      <nav className="flex items-center gap-0.5">
        {section.items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-[color:var(--panel-soft)] text-[color:var(--text)]"
                  : "text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--text)]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
