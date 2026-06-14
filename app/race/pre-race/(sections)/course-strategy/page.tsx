"use client";

import { useSyncExternalStore } from "react";
import { CourseStrategyResultCard } from "@/components/race/CourseStrategyResultCard";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

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

  return (
    <section>
      <SectionHead badge="Strategy Intel" title="Opening-leg strategy intel" />
      {draft.courseStrategyResult ? (
        <CourseStrategyResultCard
          result={draft.courseStrategyResult}
          strategyNotes={draft.courseStrategy?.strategyNotes}
          title="Saved course strategy"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-[color:var(--divider)] p-5 text-sm leading-6 text-[color:var(--text-soft)]">
          No course strategy saved yet. Fill the strategy input block on the left, then this becomes the read-only strategy brief.
        </div>
      )}
    </section>
  );
}
