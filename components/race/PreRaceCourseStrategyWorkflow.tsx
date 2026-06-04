"use client";

import { useMemo, useSyncExternalStore } from "react";
import { PlannedRaceStartFields } from "@/components/race/PlannedRaceStartFields";
import PreRaceCourseStrategyForm from "@/components/race/PreRaceCourseStrategyForm";
import { CourseStrategyResultCard } from "@/components/race/CourseStrategyResultCard";
import { Panel } from "@/components/ui/Panel";
import type { CourseStrategyAnswers, CourseStrategyResult } from "@/lib/race/courseStrategy/types";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardCourseStrategy,
  setTacticalBoardDraftField,
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
      <Panel title="Planned Race Start">
        <PlannedRaceStartFields
          raceDate={draft.raceStartDate}
          raceTime={draft.raceStartTime}
          onRaceDateChange={(value) => setTacticalBoardDraftField("raceStartDate", value)}
          onRaceTimeChange={(value) => setTacticalBoardDraftField("raceStartTime", value)}
          helperText="Step 3 uses this same target to plan the opening-leg wind picture and current effect ahead of the gun."
        />
      </Panel>

      <PreRaceCourseStrategyForm
        key={draft.courseId}
        defaultCourseId={draft.courseId}
        meanWindDirectionDeg={draft.meanWindDirectionDeg}
        tackAngleDeg={draft.tackAngleDeg}
        plannedRaceStartDate={draft.raceStartDate}
        plannedRaceStartTime={draft.raceStartTime}
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
