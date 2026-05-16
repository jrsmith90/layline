"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
import { PreRaceCommandDeck } from "@/components/race/PreRaceCommandDeck";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";
import { TacticalBoardContent } from "@/components/race/TacticalBoard";

const RaceConditionsMap = dynamic(
  () => import("@/components/race/RaceConditionsMap"),
  { ssr: false }
);

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Race Setup"
        title="Build the opening picture."
        badges={["Conditions", "Course", "Opening Bias"]}
        actions={
          <Link
            href="/race/live"
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
          >
            Race Live
          </Link>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <PreRaceCommandDeck />
        </div>

        <div className="space-y-5">
          <CoursePreviewCard />
        </div>
      </section>

      <section id="course-read" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <AppPageHeader
            eyebrow="Course Read"
            title="Course and chart"
            badges={["Chart", "Preview", "Constraints"]}
          />
          <div id="conditions-map">
            <RaceConditionsMap />
          </div>
        </div>

        <div className="space-y-5">
          <AppPageHeader
            eyebrow="Sail Choice"
            title="Sail choice"
            badges={["Wind", "Sea State", "Inventory"]}
            actions={
              <Link
                href="/race/pre-race/sail-selection"
                className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
              >
                Sail Selection
              </Link>
            }
          />
        </div>
      </section>

      <section id="route-plan" className="space-y-5">
        <AppPageHeader
          eyebrow="Opening Plan"
          title="Opening bias"
          badges={["Original Bias", "Live Check", "Change Threshold"]}
        />
        <PreRaceRouteBiasWorkflow />
      </section>

      <section id="tactical-board" className="space-y-5">
        <AppPageHeader
          eyebrow="Pre-Race Tactical Board"
          title="Tactical board"
          badges={["Mean Wind", "Line Bias", "Mark Geometry"]}
        />
        <TacticalBoardContent embedded />
      </section>
    </main>
  );
}
