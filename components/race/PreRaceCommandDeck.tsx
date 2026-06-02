"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AiCoachCard } from "@/components/ai/AiCoachCard";
import { WorkflowStageStrip } from "@/components/layout/WorkflowStageStrip";
import { InlineExplain } from "@/components/ui/InlineExplain";
import { formatCourseLabel, getDefaultCourseId } from "@/data/race/getCourseData";
import { buildPreRaceCoachBrief } from "@/lib/ai/coach";
import { deriveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoard";
import { selectTacticalBoardStatus } from "@/lib/race/tacticalBoard/selectors";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";
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
  const course = useResolvedCourseData(draft.courseId);
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
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight">
            Leave the dock with one clear story
          </h2>
          <InlineExplain
            label="Explain the command deck"
            title="How to use this"
          >
            Start here before you dive into the detailed tools. The goal is to leave the dock
            knowing four things: which course you are sailing, what the first-leg side plan is,
            whether the tactical board is ready, and whether any instruction limits need extra
            attention.
          </InlineExplain>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DeckMetric
            label="Course"
            value={formatCourseLabel(draft.courseId)}
            help="This confirms which route all of the pre-race tools are using. If this is wrong, your map, tactical board, and opening plan will all point at the wrong first mark."
          />
          <DeckMetric
            label="Opening bias"
            value={planStatus(draft.routeBias.latestUpdate?.action, draft.routeBias.originalPlan != null)}
            help="This tells you whether you already have a first-leg side plan. Use it as the answer to: where do we want to start our race picture, and do we still trust that plan?"
          />
          <DeckMetric
            label="Board"
            value={statusLabel(boardStatus)}
            help="This is a readiness check for the tactical board. If it says partial or needs setup, you still need to finish key inputs like wind direction, tack angle, or mark bearing before the heading numbers are trustworthy."
          />
          <DeckMetric
            label="Instructions"
            value={
              course.specialRoutingConstraints.length > 0
                ? `${course.specialRoutingConstraints.length} constraints`
                : "Standard marks"
            }
            help="This is your quick warning that the sailing instructions add extra rules, like passing certain marks on the channel side. If this number is not zero, review those constraints before leaving the dock."
          />
        </div>
      </section>

      <WorkflowStageStrip
        title="Pre-Race Flow"
        items={[
          {
            label: "Course and chart",
            detail:
              course.specialRoutingConstraints.length > 0
                ? "Preview the course sequence and instruction limits."
                : "Confirm the announced course and mark order.",
            status: course.specialRoutingConstraints.length > 0 ? "Context loaded" : "Standard course",
            href: "#course-read",
            tone: "focus",
          },
          {
            label: "Sail choice",
            detail: "Use the same course context for the inventory call.",
            status:
              draft.confirmedSailSelection?.courseId === draft.courseId ? "Confirmed" : "Waiting",
            href: "/race/pre-race/sail-selection",
            tone:
              draft.confirmedSailSelection?.courseId === draft.courseId ? "positive" : "focus",
          },
          {
            label: "Opening bias",
            detail: "Save the first-leg side, then re-check if needed.",
            status: draft.routeBias.originalPlan ? "Plan saved" : "Waiting",
            href: "#route-plan",
            tone: draft.routeBias.originalPlan ? "positive" : "warning",
          },
          {
            label: "Tactical board",
            detail: "Carry the saved course and bias into launch mode.",
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

function DeckMetric(props: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        <span>{props.label}</span>
        {props.help ? (
          <InlineExplain
            label={`Explain ${props.label}`}
            title={props.label}
            widthClassName="w-80"
          >
            {props.help}
          </InlineExplain>
        ) : null}
      </div>
      <div className="mt-2 text-base font-black text-[color:var(--text)]">{props.value}</div>
    </div>
  );
}
