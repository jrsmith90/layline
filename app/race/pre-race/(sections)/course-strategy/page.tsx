"use client";

import { useSyncExternalStore } from "react";
import { CourseStrategyResultCard } from "@/components/race/CourseStrategyResultCard";
import PreRaceCourseStrategyForm from "@/components/race/PreRaceCourseStrategyForm";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardCourseStrategy,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import type { CourseStrategyAnswers, CourseStrategyResult } from "@/lib/race/courseStrategy/types";

const DEFAULT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function SectionHead({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[color:var(--divider)] pb-3">
      <span className="layline-kicker">{badge}</span>
      <span className="flex-1 text-sm font-semibold text-[color:var(--text-soft)]">{title}</span>
    </div>
  );
}

export default function CourseStrategyPage() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT,
  );

  function handleStrategyReady(payload: {
    result: CourseStrategyResult;
    answers: CourseStrategyAnswers;
  }) {
    setTacticalBoardCourseStrategy({
      answers: payload.answers,
      result: payload.result,
    });
  }

  return (
    <section>
      <SectionHead badge="Strategy Intel" title="Opening-leg strategy intel" />

      <div className="mb-8">
        <PreRaceCourseStrategyForm
          key={`strategy-${draft.courseId}`}
          defaultCourseId={draft.courseId}
          meanWindDirectionDeg={draft.meanWindDirectionDeg}
          tackAngleDeg={draft.tackAngleDeg}
          plannedRaceStartDate={draft.raceStartDate}
          plannedRaceStartTime={draft.raceStartTime}
          confirmedSailSelection={draft.confirmedSailSelection}
          initialAnswers={draft.courseStrategy}
          onPlanReady={handleStrategyReady}
        />
      </div>

      {draft.courseStrategyResult ? (
        <CourseStrategyResultCard
          result={draft.courseStrategyResult}
          strategyNotes={draft.courseStrategy?.strategyNotes}
          title="Saved course strategy"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-[color:var(--divider)] p-5 text-sm leading-6 text-[color:var(--text-soft)]">
          No course strategy saved yet. Fill the strategy inputs above, then this becomes the read-only strategy brief.
        </div>
      )}
    </section>
  );
}
