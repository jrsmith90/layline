"use client";

import { useSyncExternalStore } from "react";
import { PreRaceSailPackageSummary } from "@/components/race/PreRaceSailPackageSummary";
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

export default function SailPackagePage() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT,
  );

  return (
    <section>
      <SectionHead badge="Sail Package" title="Confirm the sail package" />
      <PreRaceSailPackageSummary selection={draft.confirmedSailSelection} />
    </section>
  );
}
