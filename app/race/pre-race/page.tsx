"use client";

import dynamic from "next/dynamic";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
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
        title="Build the opening picture before the gun."
        description="Keep pre-race decisions in one lane: confirm conditions, review the course, and leave with a single opening-bias and sail plan instead of a scattered set of notes."
        badges={["Conditions", "Course", "Opening Bias"]}
      />

      <WorkflowQuickLinks
        title="Next Steps"
        items={[
          { href: "#conditions-map", label: "Conditions Map", detail: "Jump to the chart, current, and wind view" },
          { href: "#tactical-board", label: "Tactical Board", detail: "Jump to the saved wind and geometry board" },
          { href: "/race/pre-race/sail-selection", label: "Sail Selection", detail: "Translate the conditions into a sail call" },
          { href: "/race/live", label: "Race Live", detail: "Carry the plan into the cockpit view" },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div id="conditions-map">
            <RaceConditionsMap />
          </div>
          <PreRaceRouteBiasWorkflow />
        </div>

        <div className="space-y-5">
          <CoursePreviewCard />
        </div>
      </section>

      <section id="tactical-board" className="space-y-5">
        <AppPageHeader
          eyebrow="Pre-Race Tactical Board"
          title="Keep the saved geometry with the opening plan."
          description="The manual tactical board now lives inside Pre-Race so the baseline wind, line, and mark setup stay beside the opening-bias workflow instead of in a separate planning screen."
          badges={["Mean Wind", "Line Bias", "Mark Geometry"]}
        />
        <TacticalBoardContent embedded />
      </section>
    </main>
  );
}
