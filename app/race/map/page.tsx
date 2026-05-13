"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const RaceConditionsMap = dynamic(
  () => import("@/components/race/RaceConditionsMap"),
  { ssr: false },
);

export default function RaceMapPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/race/pre-race"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Pre-race workflow
        </Link>
        <Link
          href="/race/tracker"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Active course tracker
        </Link>
        <Link
          href="/race/live"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Race live cockpit
        </Link>
      </div>

      <RaceConditionsMap />
    </main>
  );
}
