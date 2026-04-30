"use client";

import Link from "next/link";
import { useState } from "react";
import { CrewLayoutCard } from "@/components/trim/CrewLayoutCard";
import { DownwindChecklistCard } from "@/components/trim/DownwindChecklistCard";
import {
  crewCountOptions,
  getDownwindChecklistConfig,
} from "@/lib/trim/downwindChecklist";
import type { CrewCount } from "@/types/trim";

export default function DownwindPage() {
  const [crewCount, setCrewCount] = useState<CrewCount>(4);
  const config = getDownwindChecklistConfig(crewCount);

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 pb-8 pt-3">
      <header className="space-y-2">
        <Link
          href="/trim"
          className="text-sm font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
        >
          Back to Trim
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Downwind</h1>
          <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
            Weather-mark symmetric spinnaker set checklist with crew duties,
            calls, and weight placement by crew count.
          </p>
        </div>
      </header>

      <section className="layline-panel space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="layline-kicker">Checklist</div>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Weather Mark Spinnaker Set
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
              Pick your crew count. Roles compress for short-handed boats and
              expand into dedicated stations for bigger teams.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-full border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/45 p-1">
            {crewCountOptions.map((option) => {
              const selected = option === crewCount;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCrewCount(option)}
                  className={`h-10 min-w-12 rounded-full px-3 text-sm font-extrabold transition active:scale-[0.98] ${
                    selected
                      ? "bg-[color:var(--favorable)] text-white"
                      : "text-[color:var(--text-soft)] hover:bg-white/10"
                  }`}
                  aria-pressed={selected}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <DownwindChecklistCard config={config} />
      <CrewLayoutCard config={config} />
    </main>
  );
}
