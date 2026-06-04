"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Flag, Route, Wind } from "lucide-react";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  formatOpeningBiasAction,
  formatOpeningBiasConfidence,
  formatOpeningBiasLabel,
} from "@/lib/race/openingBias";
import { getMarkShortLabel } from "@/lib/race/markLabels";
import { deriveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoard";
import {
  selectPrimaryCalls,
  selectShiftHeadline,
  selectStartLineHeadline,
  selectTacticalBoardStatus,
} from "@/lib/race/tacticalBoard/selectors";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";

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

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatSignedDeg(value: number | null) {
  if (value == null) return "--";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} deg`;
}

function getStatusCopy(status: ReturnType<typeof selectTacticalBoardStatus>) {
  switch (status) {
    case "ready":
      return "Ready";
    case "partial":
      return "Partial";
    default:
      return "Setup needed";
  }
}

function getSideCopy(value: "starboard" | "port" | "even" | "unknown" | "square") {
  switch (value) {
    case "starboard":
      return "Starboard";
    case "port":
      return "Port";
    case "even":
      return "Even";
    case "square":
      return "Square";
    default:
      return "Unknown";
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}

function SummaryCard(props: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--divider)] bg-black/10 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-[color:var(--muted)]">{props.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="layline-kicker">{props.eyebrow}</div>
          <h3 className="mt-1 text-xl font-black text-[color:var(--text)]">{props.title}</h3>
        </div>
      </div>
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

export function PreRaceTacticalSnapshot() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseData = useResolvedCourseData(draft.courseId);
  const board = useMemo(
    () =>
      deriveTacticalBoard({
        courseId: draft.courseId,
        courseData,
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
    [courseData, draft],
  );
  const status = selectTacticalBoardStatus(board);
  const primaryCalls = selectPrimaryCalls(board);
  const shiftHeadline = selectShiftHeadline(board);
  const lineHeadline = selectStartLineHeadline(board);
  const firstMarkLabel = board.course.firstMark
    ? getMarkShortLabel(board.course.firstMark, board.course.summary.marks[board.course.firstMark])
    : "--";
  const latestOpeningBiasAction = formatOpeningBiasAction(draft.routeBias.latestUpdate?.action);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Board Status" value={getStatusCopy(status)} />
        <Metric label="Baseline Wind" value={formatDeg(board.shift.referenceFromDeg)} />
        <Metric label="Current Wind" value={formatDeg(board.shift.currentFromDeg)} />
        <Metric label="First Mark" value={firstMarkLabel} />
        <Metric label="Shift Memory" value={formatSignedDeg(board.shift.deltaDeg)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <SummaryCard
            icon={<Wind size={18} />}
            eyebrow="Primary Calls"
            title="Launch Picture"
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]">
                {shiftHeadline}
              </div>
              {primaryCalls.map((call) => (
                <div
                  key={call}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]"
                >
                  {call}
                </div>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<Route size={18} />}
            eyebrow="Opening Bias"
            title="Saved Side Call"
          >
            {draft.routeBias.originalPlan ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Saved Pick"
                    value={formatOpeningBiasLabel(draft.routeBias.originalPlan.decision)}
                  />
                  <Metric
                    label="Confidence"
                    value={formatOpeningBiasConfidence(draft.routeBias.originalPlan.confidence)}
                  />
                  <Metric
                    label="Latest Update"
                    value={latestOpeningBiasAction ?? "Hold saved plan"}
                  />
                </div>
                <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]">
                  {draft.routeBias.latestUpdate?.reasons[0] ??
                    draft.routeBias.originalPlan.reasons[0] ??
                    "No saved opening-bias note yet."}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[color:var(--divider)] bg-black/10 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]">
                Save an opening-bias plan above and this launch snapshot will carry it here.
              </div>
            )}
          </SummaryCard>
        </div>

        <div className="space-y-4">
          <SummaryCard
            icon={<Flag size={18} />}
            eyebrow="Steering Numbers"
            title="Upwind Targets"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Starboard Tack" value={formatDeg(board.upwind.starboardTackHeadingDeg)} />
              <Metric label="Port Tack" value={formatDeg(board.upwind.portTackHeadingDeg)} />
              <Metric label="Mark Bearing" value={formatDeg(board.upwind.windwardMarkBearingDeg)} />
              <Metric label="Favored Tack" value={getSideCopy(board.upwind.favoredTack)} />
            </div>
          </SummaryCard>

          <SummaryCard
            icon={<Route size={18} />}
            eyebrow="Start Line"
            title="Bias Read"
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]">
                {lineHeadline}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Bias" value={formatSignedDeg(board.startLine.biasDeg)} />
                <Metric label="Favored End" value={getSideCopy(board.startLine.favoredEnd)} />
              </div>
            </div>
          </SummaryCard>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/race/tactical-board"
          className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
        >
          Open Full Tactical Board
        </Link>
        <Link
          href="/race/live"
          className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
        >
          Open Race Live
        </Link>
      </div>
    </section>
  );
}
