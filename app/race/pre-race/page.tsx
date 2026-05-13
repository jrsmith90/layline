"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";

const RaceConditionsMap = dynamic(
  () => import("@/components/race/RaceConditionsMap"),
  { ssr: false }
);

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/race/map"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Race map
        </Link>
        <Link
          href="/weather/current"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Course conditions
        </Link>
        <Link
          href="/race/pre-race/sail-selection"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Sail selection
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
        <Link
          href="/race/review"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          After Action Report
        </Link>
      </div>
      <RaceConditionsMap />
      <CoursePreviewCard />
      <PreRaceRouteBiasWorkflow />
    </main>
  );
}
