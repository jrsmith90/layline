"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowDisclosure } from "@/components/layout/WorkflowDisclosure";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
import { PreRaceCommandDeck } from "@/components/race/PreRaceCommandDeck";
import PreRaceCourseStrategyWorkflow from "@/components/race/PreRaceCourseStrategyWorkflow";
import { PreRaceLegHeadingChart } from "@/components/race/PreRaceLegHeadingChart";
import { PreRaceLegLookoutSheet } from "@/components/race/PreRaceLegLookoutSheet";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";
import { PreRaceSetupPanel } from "@/components/race/PreRaceSetupPanel";
import { TacticalBoardContent } from "@/components/race/TacticalBoard";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";

const RaceConditionsMap = dynamic(
  () => import("@/components/race/RaceConditionsMap"),
  { ssr: false }
);

const PRE_RACE_QUICK_LINKS = [
  {
    href: "#course-read",
    label: "1. Course and chart",
    detail: "Confirm the course, map, and routing constraints.",
  },
  {
    href: "/race/pre-race/sail-selection",
    label: "2. Sail choice",
    detail: "Turn the course and wind read into an inventory call.",
  },
  {
    href: "#course-strategy",
    label: "3. Course strategy",
    detail: "Break down the opening leg by zone with headings and risk assessment.",
  },
  {
    href: "#route-plan",
    label: "4. Opening bias",
    detail: "Save the first-leg side, then re-check only if needed.",
  },
  {
    href: "#tactical-board",
    label: "5. Tactical board",
    detail: "Carry the saved setup into launch mode.",
  },
];

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

export default function Page() {
  const { effectiveMode } = useDisplayMode();
  const isDesktopLayout = effectiveMode === "desktop";
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseData = useResolvedCourseData(draft.courseId);

  return (
    <main
      className={[
        "mx-auto w-full space-y-5 px-4 pb-8 pt-4",
        isDesktopLayout ? "max-w-[96rem]" : "max-w-5xl",
      ].join(" ")}
    >
      <AppPageHeader
        eyebrow="Race Setup"
        title="Build the opening picture."
        description="Run the updated dockside plan in one pass: confirm the course, make the sail call, analyze zones with strategy, lock the opening bias, and seed the tactical board before switching to Race Live."
        badges={["Course", "Sail Choice", "Course Strategy", "Opening Bias", "Tactical Board"]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/race/pre-race/export"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--favorable)]/15 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
            >
              Export PDF
            </Link>
            <Link
              href="/race/live"
              className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
            >
              Race Live
            </Link>
          </div>
        }
      />

      <WorkflowQuickLinks title="Updated Plan" items={PRE_RACE_QUICK_LINKS} />

      <PreRaceSetupPanel />

      <PreRaceCommandDeck />

      <WorkflowDisclosure
        id="course-read"
        badge="Step 1"
        title="Read the course and chart"
        detail="Start with the map and course brief, then carry that same picture into the sail call and the rest of the crew plan."
        defaultOpen
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div id="conditions-map">
            <RaceConditionsMap showCourseSelector={false} />
          </div>

          <CoursePreviewCard showControls={false} />
        </div>
      </WorkflowDisclosure>

      <WorkflowDisclosure
        id="course-strategy"
        badge="Step 3"
        title="Break down the opening leg strategy"
        detail="Analyze each zone with expected headings, wind shifts, current patterns, and laylines."
        defaultOpen
      >
        <PreRaceCourseStrategyWorkflow showPlannedRaceStartPanel={false} />
      </WorkflowDisclosure>

      <WorkflowDisclosure
        id="route-plan"
        badge="Step 4"
        title="Lock and re-check opening bias"
        detail="Save the opening side first, then use the live re-check only if conditions have changed."
        defaultOpen
      >
        <PreRaceRouteBiasWorkflow />
      </WorkflowDisclosure>

      <WorkflowDisclosure
        id="tactical-board"
        badge="Step 5"
        title="Seed the tactical board"
        detail="Carry the saved course and opening picture into the launch board so Race Live starts from the same plan."
      >
        <TacticalBoardContent embedded />
      </WorkflowDisclosure>

      <WorkflowDisclosure
        id="leg-headings"
        badge="Reference"
        title="Mark-to-mark heading chart"
        detail="Use the course bearing and saved tack angle to carry a quick port and starboard heading reference for every leg."
        defaultOpen
      >
        <PreRaceLegHeadingChart />
      </WorkflowDisclosure>

      <WorkflowDisclosure
        id="crew-lookout"
        badge="Crew Brief"
        title="Leg-by-leg lookout sheet"
        detail="Share the quick triggers to watch on each leg so the crew can make cleaner calls without reopening every planning panel."
        defaultOpen
      >
        <PreRaceLegLookoutSheet courseData={courseData} draft={draft} />
      </WorkflowDisclosure>
    </main>
  );
}
