"use client";

import { useSyncExternalStore } from "react";
import PreRaceCourseStrategyForm from "@/components/race/PreRaceCourseStrategyForm";
import PreRaceRouteBiasForm from "@/components/race/PreRaceRouteBiasForm";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardCourseStrategy,
  setTacticalBoardRouteBiasPlan,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import type {
  CourseStrategyAnswers,
  CourseStrategyResult,
} from "@/lib/race/courseStrategy/types";
import type { RouteBiasAnswers, RouteBiasResult } from "@/lib/race/scoreRouteBias";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function InputSection(props: {
  badge: string;
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--divider)] bg-black/10 p-4">
      <div className="layline-kicker">{props.badge}</div>
      <h3 className="mt-1 text-xl font-black text-[color:var(--text)]">{props.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">{props.detail}</p>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

export function PreRacePlanningInputsPanel() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
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

  function handleRouteBiasReady(payload: {
    result: RouteBiasResult;
    answers: RouteBiasAnswers;
  }) {
    setTacticalBoardRouteBiasPlan({
      answers: payload.answers,
      plan: payload.result,
    });
  }

  return (
    <section className="layline-panel p-5">
      <div className="max-w-4xl">
        <div className="layline-kicker">Planning Inputs</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--text)]">
          Fill the manual inputs once
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
          Use this block for the remaining dropdowns and manual fields, then scroll the rest of the
          page as a read-only crew brief. The course and planned start above drive both sections.
        </p>
      </div>

      <div className="mt-5 grid gap-5">
        <InputSection
          badge="Step 3 Inputs"
          title="Opening-leg strategy inputs"
          detail="Use the AI coach fill if the forecast and current picture is solid, then only tweak zones or notes when you need a custom call."
        >
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
        </InputSection>

        <InputSection
          badge="Step 4 Inputs"
          title="Opening-bias inputs"
          detail="Save the first-leg side here after the AI wind read and your own local check agree on the opening picture."
        >
          <PreRaceRouteBiasForm
            key={JSON.stringify({
              courseId: draft.courseId,
              answers: draft.routeBias.originalAnswers,
              plan: draft.routeBias.originalPlan,
            })}
            defaultCourseId={draft.courseId}
            initialAnswers={draft.routeBias.originalAnswers}
            initialResult={draft.routeBias.originalPlan}
            showCourseField={false}
            onPlanReady={handleRouteBiasReady}
          />
        </InputSection>
      </div>
    </section>
  );
}
