"use client";

import { useSyncExternalStore } from "react";
import { PreRaceLegLookoutSheet } from "@/components/race/PreRaceLegLookoutSheet";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";

const DEFAULT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function SectionHead({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[color:var(--divider)] pb-3">
      <span className="layline-kicker">{badge}</span>
      <span className="flex-1 text-sm font-semibold text-[color:var(--text-soft)]">{title}</span>
    </div>
  );
}

export default function CrewBriefPage() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT,
  );
  const courseData = useResolvedCourseData(draft.courseId);

  return (
    <section>
      <SectionHead badge="Crew Brief" title="Leg-by-leg lookout sheet" />
      <PreRaceLegLookoutSheet courseData={courseData} draft={draft} />
    </section>
  );
}
