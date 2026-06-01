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

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

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
        initialAnswers={draft.courseStrategy}
        onPlanReady={handleStrategyReady}
      />

      <CourseStrategyResultCard
        result={result}
        title="Saved course strategy"
      />
    </div>
  );
}
