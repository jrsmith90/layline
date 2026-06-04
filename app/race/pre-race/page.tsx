"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowDisclosure } from "@/components/layout/WorkflowDisclosure";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
import { PreRaceCommandDeck } from "@/components/race/PreRaceCommandDeck";
import PreRaceCourseStrategyWorkflow from "@/components/race/PreRaceCourseStrategyWorkflow";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";
import { TacticalBoardContent } from "@/components/race/TacticalBoard";
import {
  formatCourseLabel,
  getCourseData,
  getDefaultCourseId,
} from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

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
          <Link
            href="/race/live"
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
          >
            Race Live
          </Link>
        }
      />

      <WorkflowQuickLinks title="Updated Plan" items={PRE_RACE_QUICK_LINKS} />

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <PreRaceCommandDeck />
        </div>

        <div className="space-y-5">
          <CoursePreviewCard />
        </div>
      </section>

      <WorkflowDisclosure
        id="course-read"
        badge="Step 1"
        title="Read the course and chart"
        detail="Keep the map and routing context nearby, then move straight into the sail call."
        defaultOpen
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div id="conditions-map">
            <RaceConditionsMap />
          </div>

          <SailChoiceLaunchCard />
        </div>
      </WorkflowDisclosure>

      <WorkflowDisclosure
        id="course-strategy"
        badge="Step 3"
        title="Break down the opening leg strategy"
        detail="Analyze each zone with expected headings, wind shifts, current patterns, and laylines."
        defaultOpen
      >
        <PreRaceCourseStrategyWorkflow />
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
    </main>
  );
}

function SailChoiceLaunchCard() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const course = useMemo(() => getCourseData(draft.courseId), [draft.courseId]);

  return (
    <section className="layline-panel flex h-full flex-col p-5">
      <div className="layline-kicker">Step 2</div>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--text)]">
        Choose the sail package
      </h2>
      <p className="layline-learn-only mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
        Jump into sail selection with the same course already loaded so the wind read,
        inventory call, and opening leg assumptions stay aligned.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PrepMetric label="Selected course" value={formatCourseLabel(draft.courseId)} />
        <PrepMetric label="First mark" value={course.firstMark ?? "Unknown"} />
      </div>

      <div className="mt-3 rounded-xl border border-[color:var(--divider)] bg-black/20 p-4 text-sm leading-6 text-[color:var(--text-soft)]">
        Use this after the course read if you still need to confirm headsail, spinnaker,
        reef risk, or the likely sea-state crossover.
      </div>

      <Link
        href="/race/pre-race/sail-selection"
        className="mt-4 inline-flex w-fit rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
      >
        Open Sail Selection
      </Link>
    </section>
  );
}

function PrepMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}
