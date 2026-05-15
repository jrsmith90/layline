"use client";

import Link from "next/link";
import { AppPageHeader } from "@/components/layout/AppPageHeader";

const groups = [
  {
    title: "Boat Speed",
    description: "Trim references and sail-specific setup that support the live race workflow.",
    items: [
      { href: "/trim", label: "Trim Hub", detail: "Main, jib, spin, and quick actions." },
      { href: "/trim/main", label: "Main Trim", detail: "Power, balance, and depower controls." },
      { href: "/trim/jib", label: "Headsail Trim", detail: "Lead, sheet, and telltale flow." },
      { href: "/trim/spin", label: "Spinnaker Trim", detail: "Downwind trim and control." },
    ],
  },
  {
    title: "Decision Guides",
    description: "Supporting tactical and troubleshooting content that should stay nearby but not crowd the main race workflow.",
    items: [
      { href: "/start", label: "Start", detail: "Line bias, lane, and bailout planning." },
      { href: "/tactics", label: "Tactics", detail: "Upwind, downwind, and covering guides." },
      { href: "/troubleshoot", label: "Troubleshoot", detail: "Fix speed, control, and lane problems fast." },
    ],
  },
  {
    title: "Reference and History",
    description: "Keep deeper weather setup and review history nearby without forcing them into the main race flow.",
    items: [
      { href: "/weather/current", label: "Current Weather", detail: "Advanced weather, tide, and current setup." },
      { href: "/race/review#logs", label: "Trim Logs", detail: "Stored trim calls, ratings, and exports inside review." },
      { href: "/race/review#notes", label: "Notes", detail: "Cockpit notes and debrief notes inside review." },
    ],
  },
];

export default function LibraryPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Library"
        title="Keep supporting tools close, not loud."
        description="This is the quieter side of Layline: trim references, decision guides, weather setup, and supporting history. The core race workflow stays elsewhere, but the depth is still one step away."
        badges={["Trim", "Guides", "Weather", "History"]}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.title} className="layline-panel p-4">
            <div className="layline-kicker">{group.title}</div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-[color:var(--text)]">
              {group.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {group.description}
            </p>

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
        ))}
      </section>
    </main>
  );
}
