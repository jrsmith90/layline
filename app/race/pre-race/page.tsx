"use client";

import dynamic from "next/dynamic";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";

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
          { href: "/race/map", label: "Race Map", detail: "Check chart, current, and wind pattern" },
          { href: "/weather/current", label: "Current Weather", detail: "Confirm the latest course weather read" },
          { href: "/race/pre-race/sail-selection", label: "Sail Selection", detail: "Translate the conditions into a sail call" },
          { href: "/race/live", label: "Race Live", detail: "Carry the plan into the cockpit view" },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <RaceConditionsMap />
          <PreRaceRouteBiasWorkflow />
        </div>

        <div className="space-y-5">
          <CoursePreviewCard />
        </div>
      </section>
    </main>
  );
}
