"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";
import PreRaceCourseStrategyWorkflow from "@/components/race/PreRaceCourseStrategyWorkflow";
import { PreRaceLegHeadingChart } from "@/components/race/PreRaceLegHeadingChart";
import { PreRaceLegLookoutSheet } from "@/components/race/PreRaceLegLookoutSheet";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";
import { PreRaceSailPackageSummary } from "@/components/race/PreRaceSailPackageSummary";
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
        description="Set the selections once at the top, then work straight down the dockside brief so the whole crew arrives with the same race picture."
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

      <PreRaceSetupPanel />

      <PageSection
        id="course-read"
        badge="Step 1"
        title="Read the course and chart"
        detail="Start with the map and course brief, then carry that same picture into the sail call and the rest of the crew plan."
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div id="conditions-map">
            <RaceConditionsMap showCourseSelector={false} />
          </div>

          <CoursePreviewCard showControls={false} />
        </div>
      </PageSection>

      <PageSection
        id="sail-package"
        badge="Step 2"
        title="Confirm the sail package"
        detail="Keep the confirmed sails, reef call, and forecast read visible in the main brief instead of hiding Step 2 on a separate screen."
      >
        <PreRaceSailPackageSummary selection={draft.confirmedSailSelection} />
      </PageSection>

      <PageSection
        id="course-strategy"
        badge="Step 3"
        title="Break down the opening leg strategy"
        detail="Analyze each zone with expected headings, wind shifts, current patterns, and laylines."
      >
        <PreRaceCourseStrategyWorkflow showPlannedRaceStartPanel={false} />
      </PageSection>

      <PageSection
        id="route-plan"
        badge="Step 4"
        title="Lock and re-check opening bias"
        detail="Save the opening side first, then use the live re-check only if conditions have changed."
      >
        <PreRaceRouteBiasWorkflow />
      </PageSection>

      <PageSection
        id="tactical-board"
        badge="Step 5"
        title="Seed the tactical board"
        detail="Carry the saved course and opening picture into the launch board so Race Live starts from the same plan."
      >
        <TacticalBoardContent embedded />
      </PageSection>

      <PageSection
        id="leg-headings"
        badge="Reference"
        title="Mark-to-mark heading chart"
        detail="Use the course bearing and saved tack angle to carry a quick port and starboard heading reference for every leg."
      >
        <PreRaceLegHeadingChart />
      </PageSection>

      <PageSection
        id="crew-lookout"
        badge="Crew Brief"
        title="Leg-by-leg lookout sheet"
        detail="Share the quick triggers to watch on each leg so the crew can make cleaner calls without reopening every planning panel."
      >
        <PreRaceLegLookoutSheet courseData={courseData} draft={draft} />
      </PageSection>
    </main>
  );
}

function PageSection(props: {
  id?: string;
  title: string;
  detail?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section id={props.id} className="layline-panel scroll-mt-24 overflow-hidden">
      <div className="p-4">
        <div className="layline-kicker">{props.badge ?? "Section"}</div>
        <div className="mt-1 text-xl font-black text-[color:var(--text)]">{props.title}</div>
        {props.detail ? (
          <div className="layline-learn-only mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
            {props.detail}
          </div>
        ) : null}
      </div>
      <div className="border-t border-[color:var(--divider)] p-4">{props.children}</div>
    </section>
  );
}
