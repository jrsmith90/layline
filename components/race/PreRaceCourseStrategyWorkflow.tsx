"use client";

import { useMemo, useSyncExternalStore } from "react";
import PreRaceCourseStrategyForm from "@/components/race/PreRaceCourseStrategyForm";
import { CourseStrategyResultCard } from "@/components/race/CourseStrategyResultCard";
import type { CourseStrategyAnswers, CourseStrategyResult } from "@/lib/race/courseStrategy/types";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardCourseStrategy,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults("ted-v3");

export default function PreRaceCourseStrategyWorkflow() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );

  const result = useMemo(() => draft.courseStrategyResult, [draft.courseStrategyResult]);

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
    <div className="space-y-6">
      <PreRaceCourseStrategyForm
        key={draft.courseId}
        defaultCourseId={draft.courseId}
        meanWindDirectionDeg={draft.meanWindDirectionDeg}
        tackAngleDeg={draft.tackAngleDeg}
        confirmedSailSelection={draft.confirmedSailSelection}
        initialAnswers={draft.courseStrategy}
        onPlanReady={handleStrategyReady}
      />

      <CourseStrategyResultCard
        result={result}
        strategyNotes={draft.courseStrategy?.strategyNotes}
        title="Saved course strategy"
      />
    </div>
  );
}
