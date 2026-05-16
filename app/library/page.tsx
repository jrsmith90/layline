"use client";

import Link from "next/link";
import { AppPageHeader } from "@/components/layout/AppPageHeader";

const groups = [
  {
    title: "Boat Speed",
    items: [
      { href: "/trim", label: "Trim Hub" },
      { href: "/trim/main", label: "Main Trim" },
      { href: "/trim/jib", label: "Headsail Trim" },
      { href: "/trim/spin", label: "Spinnaker Trim" },
    ],
  },
  {
    title: "Decision Guides",
    items: [
      { href: "/start", label: "Start" },
      { href: "/tactics", label: "Tactics" },
      { href: "/troubleshoot", label: "Troubleshoot" },
    ],
  },
  {
    title: "Reference and History",
    items: [
      { href: "/weather/current", label: "Current Weather" },
      { href: "/race/review#logs", label: "Trim Logs" },
      { href: "/race/review#notes", label: "Notes" },
    ],
  },
];

export default function LibraryPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Library"
        title="Library"
        badges={["Trim", "Guides", "Weather", "History"]}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.title} className="layline-panel p-4">
            <div className="layline-kicker">{group.title}</div>
            <div className="mt-3 grid gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 transition active:scale-[0.99]"
                >
                  <div className="min-w-0 text-sm font-black text-[color:var(--text)]">
                    {item.label}
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
