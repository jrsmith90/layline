"use client";

import { useSyncExternalStore } from "react";
import { PreRaceOpeningBiasSummary } from "@/components/race/PreRaceOpeningBiasSummary";
import PreRaceRouteBiasForm from "@/components/race/PreRaceRouteBiasForm";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardRouteBiasPlan,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import type { RouteBiasAnswers, RouteBiasResult } from "@/lib/race/scoreRouteBias";

const DEFAULT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function SectionHead({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[color:var(--divider)] pb-3">
      <span className="layline-kicker">{badge}</span>
      <span className="flex-1 text-sm font-semibold text-[color:var(--text-soft)]">{title}</span>
    </div>
  );
}

export default function OpeningBiasPage() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT,
  );

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
    <section>
      <SectionHead badge="Opening Bias" title="Opening-bias intel" />

      <div className="mb-8">
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
      </div>

      <PreRaceOpeningBiasSummary draft={draft} />
    </section>
  );
}
