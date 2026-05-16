"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AiCoachCard } from "@/components/ai/AiCoachCard";
import { WorkflowStageStrip } from "@/components/layout/WorkflowStageStrip";
import { formatCourseLabel, getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import { buildPreRaceCoachBrief } from "@/lib/ai/coach";
import { deriveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoard";
import { selectTacticalBoardStatus } from "@/lib/race/tacticalBoard/selectors";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function parseAngle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function statusLabel(status: ReturnType<typeof selectTacticalBoardStatus>) {
  switch (status) {
    case "ready":
      return "Ready";
    case "partial":
      return "Partial";
    default:
      return "Needs setup";
  }
}

function planStatus(
  action: string | null | undefined,
  hasPlan: boolean,
) {
  if (!hasPlan) return "Not locked";
  if (action === "change_side_bias") return "Change side";
  if (action === "prepare_to_change_side_bias") return "Prepare shift";
  if (action === "stay_flexible") return "Stay flexible";
  return "Hold plan";
}

export function PreRaceCommandDeck() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const course = useMemo(() => getCourseData(draft.courseId), [draft.courseId]);
  const board = useMemo(
    () =>
      deriveTacticalBoard({
        courseId: draft.courseId,
        courseData: course,
        meanWindDirectionDeg: parseAngle(draft.meanWindDirectionDeg),
        currentWindDirectionDeg: parseAngle(draft.currentWindDirectionDeg),
        tackAngleDeg: parseNumber(draft.tackAngleDeg) ?? 42,
        windwardMarkBearingDeg: parseAngle(draft.windwardMarkBearingDeg),
        downwindMarkBearingDeg: parseAngle(draft.downwindMarkBearingDeg),
        linePortEndBearingDeg: parseAngle(draft.linePortEndBearingDeg),
        lineStarboardEndBearingDeg: parseAngle(draft.lineStarboardEndBearingDeg),
        downwindTrueWindAngleDeg: parseNumber(draft.downwindTrueWindAngleDeg) ?? 135,
        windTrend: draft.windTrend,
      }),
    [course, draft],
  );
  const boardStatus = selectTacticalBoardStatus(board);
  const coachBrief = buildPreRaceCoachBrief({
    course,
    boardStatus,
    openingPlan: draft.routeBias.originalPlan,
    latestUpdate: draft.routeBias.latestUpdate,
  });

  return (
    <div className="space-y-5">
      <section className="layline-panel p-4">
        <div className="layline-kicker">Command Deck</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight">
          Leave the dock with one clear story
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DeckMetric label="Course" value={formatCourseLabel(draft.courseId)} />
          <DeckMetric
            label="Opening plan"
            value={planStatus(draft.routeBias.latestUpdate?.action, draft.routeBias.originalPlan != null)}
          />
          <DeckMetric label="Board" value={statusLabel(boardStatus)} />
          <DeckMetric
            label="Routing"
            value={
              course.specialRoutingConstraints.length > 0
                ? `${course.specialRoutingConstraints.length} constraints`
                : "Standard marks"
            }
          />
        </div>
      </section>

      <WorkflowStageStrip
        title="Pre-Race Flow"
        items={[
          {
            label: "Course read",
            status: course.specialRoutingConstraints.length > 0 ? "Context loaded" : "Standard course",
            href: "#course-read",
            tone: "focus",
          },
          {
            label: "Opening plan",
            status: draft.routeBias.originalPlan ? "Plan saved" : "Waiting",
            href: "#route-plan",
            tone: draft.routeBias.originalPlan ? "positive" : "warning",
          },
          {
            label: "Live board",
            status: statusLabel(boardStatus),
            href: "#tactical-board",
            tone: boardStatus === "ready" ? "positive" : "focus",
          },
        ]}
      />

      <AiCoachCard brief={coachBrief} />
    </div>
  );
}

function DeckMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-base font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}
