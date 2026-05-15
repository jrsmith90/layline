"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Flag, Route, Sailboat, Wind } from "lucide-react";
import { useAppMode } from "@/components/display/AppModeProvider";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";
import type { WindTrend } from "@/data/race/getRouteBiasInputs";
import { getRouteBiasInputs } from "@/data/race/getRouteBiasInputs";
import {
  formatCourseLabel,
  getDefaultCourseId,
  getAllCourseIds,
  getCourseData,
} from "@/data/race/getCourseData";
import type { TacticalUpdateAction } from "@/lib/race/checkPlanValidity";
import { wrap360 } from "@/lib/race/courseTracker";
import type {
  RouteBiasAnswers,
  RouteBiasConfidence,
  RouteBiasDecision,
} from "@/lib/race/scoreRouteBias";
import { deriveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoard";
import {
  selectPrimaryCalls,
  selectShiftHeadline,
  selectStartLineHeadline,
  selectTacticalBoardStatus,
} from "@/lib/race/tacticalBoard/selectors";
import {
  buildTacticalBoardDraftDefaults,
  copyTacticalBoardMeanWindToCurrentWind,
  getStoredTacticalBoardDraft,
  seedTacticalBoardMarkBearings,
  setTacticalBoardCourseId,
  setTacticalBoardDraftField,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const courseIds = getAllCourseIds();
const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatSignedDeg(value: number | null) {
  if (value == null) return "--";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} deg`;
}

function formatDistance(value: number | null) {
  return value == null ? "--" : `${value.toFixed(1)} nm`;
}

function parseAngle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : wrap360(parsed);
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function getStatusCopy(status: ReturnType<typeof selectTacticalBoardStatus>) {
  switch (status) {
    case "ready":
      return "Board ready";
    case "partial":
      return "Partial board";
    default:
      return "Setup needed";
  }
}

function getShiftPanelClasses(memoryColor: string) {
  if (memoryColor === "green") {
    return "border-[color:var(--favorable)] bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.24),transparent_52%),linear-gradient(180deg,rgba(7,22,37,0.9),rgba(7,22,37,0.7))] text-teal-50";
  }

  if (memoryColor === "red") {
    return "border-[color:var(--unfavorable)] bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.22),transparent_52%),linear-gradient(180deg,rgba(34,12,16,0.94),rgba(13,7,10,0.72))] text-red-50";
  }

  return "border-[color:var(--divider)] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_52%),linear-gradient(180deg,rgba(12,25,39,0.92),rgba(7,22,37,0.72))] text-[color:var(--text)]";
}

function getTrendCopy(trend: WindTrend) {
  switch (trend) {
    case "building":
      return "Building";
    case "fading":
      return "Fading";
    case "steady":
      return "Steady";
    case "oscillating":
      return "Oscillating";
    case "unstable":
      return "Unstable";
    default:
      return "Trend unset";
  }
}

function getSideCopy(value: string) {
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

function formatRouteBiasDecision(decision: RouteBiasDecision) {
  switch (decision) {
    case "shore_first":
      return "Favor shore early";
    case "bay_first":
      return "Favor bay early";
    case "neutral":
      return "Stay central";
    case "mixed_signal":
      return "Mixed signal";
    default:
      return decision;
  }
}

function formatRouteBiasConfidence(confidence: RouteBiasConfidence) {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatUpdateAction(action: TacticalUpdateAction) {
  switch (action) {
    case "hold_course":
      return "Hold course";
    case "stay_flexible":
      return "Stay flexible";
    case "prepare_to_change_side_bias":
      return "Prepare to shift";
    case "change_side_bias":
      return "Change side bias";
    default:
      return action;
  }
}

function describeRouteBiasSample(answers?: RouteBiasAnswers | null) {
  if (!answers) return "No sample";

  return `${Math.round(answers.windDirectionDeg)} deg, ${answers.windTrend}`;
}

export default function TacticalBoard() {
  const { isRaceMode } = useAppMode();
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseData = useMemo(() => getCourseData(draft.courseId), [draft.courseId]);
  const routeBiasInputModel = useMemo(
    () => getRouteBiasInputs(draft.courseId),
    [draft.courseId],
  );
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
  const tacticalCalls = useMemo(() => selectPrimaryCalls(board), [board]);
  const status = selectTacticalBoardStatus(board);
  const shiftHeadline = selectShiftHeadline(board);
  const lineHeadline = selectStartLineHeadline(board);
  const openingBiasPlan = draft.routeBias.originalPlan;
  const currentBiasPlan = draft.routeBias.latestPlan ?? openingBiasPlan;
  const openingBiasUpdate = draft.routeBias.latestUpdate;
  const openingBiasSample = draft.routeBias.latestAnswers ?? draft.routeBias.originalAnswers;

  function handleCourseChange(nextCourseId: string) {
    setTacticalBoardCourseId(nextCourseId);
  }

  function seedMarkBearingsFromCourse() {
    seedTacticalBoardMarkBearings(draft.courseId);
  }

  function useMeanWindAsCurrent() {
    copyTacticalBoardMeanWindToCurrentWind();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 pb-8 pt-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/race/pre-race"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Pre-race
        </Link>
        <Link
          href="/race/live"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Race live
        </Link>
        <Link
          href="/race/tracker"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Course tracker
        </Link>
      </div>

      <LiveInstrumentsPanel context="route" />

      <section className={["layline-panel overflow-hidden p-5", getShiftPanelClasses(board.shift.memoryColor)].join(" ")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="layline-kicker text-current/70">Layline Tactical Board</div>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
              {formatCourseLabel(draft.courseId)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90">
              {shiftHeadline}
            </p>
          </div>
          <div className="text-right text-xs font-bold uppercase tracking-[0.16em] opacity-80">
            <div>{getStatusCopy(status)}</div>
            <div className="mt-2">{getTrendCopy(board.setup.windTrend)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <HeroMetric label="Baseline Wind" value={formatDeg(board.shift.referenceFromDeg)} />
          <HeroMetric label="Current Wind" value={formatDeg(board.shift.currentFromDeg)} />
          <HeroMetric label="Shift Memory" value={formatSignedDeg(board.shift.deltaDeg)} />
          <HeroMetric label="Jibe Bearing" value={formatDeg(board.downwind.jibeBearingDeg)} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="layline-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="layline-kicker">Setup</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Manual Inputs</h2>
            </div>
            <button
              type="button"
              onClick={seedMarkBearingsFromCourse}
              className="rounded-lg border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-wide"
            >
              Seed Marks From Course
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Course</span>
              <select
                className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2.5"
                value={draft.courseId}
                onChange={(event) => handleCourseChange(event.target.value)}
              >
                {courseIds.map((courseId) => (
                  <option key={courseId} value={courseId} className="bg-slate-900">
                    {formatCourseLabel(courseId)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Wind trend</span>
              <select
                className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2.5"
                value={draft.windTrend}
                onChange={(event) =>
                  setTacticalBoardDraftField("windTrend", event.target.value as WindTrend)
                }
              >
                <option value="unknown" className="bg-slate-900">Unclear</option>
                <option value="steady" className="bg-slate-900">Steady</option>
                <option value="building" className="bg-slate-900">Building</option>
                <option value="fading" className="bg-slate-900">Fading</option>
                <option value="oscillating" className="bg-slate-900">Oscillating</option>
                <option value="unstable" className="bg-slate-900">Unstable</option>
              </select>
            </label>

            <AngleInput
              label="Mean wind from"
              value={draft.meanWindDirectionDeg}
              onChange={(value) => setTacticalBoardDraftField("meanWindDirectionDeg", value)}
            />
            <div className="space-y-1">
              <AngleInput
                label="Current wind from"
                value={draft.currentWindDirectionDeg}
                onChange={(value) =>
                  setTacticalBoardDraftField("currentWindDirectionDeg", value)
                }
              />
              <button
                type="button"
                onClick={useMeanWindAsCurrent}
                className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]"
              >
                Copy mean wind
              </button>
            </div>

            <NumberInput
              label="Tack angle"
              unit="deg"
              value={draft.tackAngleDeg}
              onChange={(value) => setTacticalBoardDraftField("tackAngleDeg", value)}
            />
            <NumberInput
              label="Run TWA"
              unit="deg"
              value={draft.downwindTrueWindAngleDeg}
              onChange={(value) =>
                setTacticalBoardDraftField("downwindTrueWindAngleDeg", value)
              }
            />

            <AngleInput
              label="Windward mark bearing"
              value={draft.windwardMarkBearingDeg}
              onChange={(value) =>
                setTacticalBoardDraftField("windwardMarkBearingDeg", value)
              }
            />
            <AngleInput
              label="Downwind mark bearing"
              value={draft.downwindMarkBearingDeg}
              onChange={(value) =>
                setTacticalBoardDraftField("downwindMarkBearingDeg", value)
              }
            />

            <AngleInput
              label="Port-end line bearing"
              value={draft.linePortEndBearingDeg}
              onChange={(value) => setTacticalBoardDraftField("linePortEndBearingDeg", value)}
            />
            <AngleInput
              label="Starboard-end line bearing"
              value={draft.lineStarboardEndBearingDeg}
              onChange={(value) =>
                setTacticalBoardDraftField("lineStarboardEndBearingDeg", value)
              }
            />
          </div>
        </section>

        <section className="space-y-5">
          <section className="layline-panel p-4">
            <div className="flex items-start gap-3">
              <Wind className="mt-1 text-[color:var(--muted)]" size={18} />
              <div>
                <div className="layline-kicker">Primary Read</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  {isRaceMode ? "Fast Calls" : "Coach Calls"}
                </h2>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {tacticalCalls.map((call) => (
                <div
                  key={call}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]"
                >
                  {call}
                </div>
              ))}
            </div>
            {!isRaceMode && (
              <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
                This board now sets the baseline for the live tactical overlay. Use it to
                lock in mean wind, line bearings, and mark geometry, then let the live
                cockpit and tracker layer current wind and active-leg context on top.
              </p>
            )}
          </section>

          <section className="layline-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Route className="mt-1 text-[color:var(--muted)]" size={18} />
                <div>
                  <div className="layline-kicker">Opening Bias</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">Route Plan</h2>
                </div>
              </div>
              <Link
                href="/race/pre-race"
                className="rounded-lg border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em]"
              >
                Edit Plan
              </Link>
            </div>

            {openingBiasPlan ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricCard
                    label="Baseline Call"
                    value={formatRouteBiasDecision(openingBiasPlan.decision)}
                  />
                  <MetricCard
                    label="Current Check"
                    value={
                      currentBiasPlan
                        ? formatRouteBiasDecision(currentBiasPlan.decision)
                        : "No check yet"
                    }
                  />
                  <MetricCard
                    label="Update Action"
                    value={
                      openingBiasUpdate
                        ? formatUpdateAction(openingBiasUpdate.action)
                        : "Hold baseline"
                    }
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MetricCard
                    label="Baseline Confidence"
                    value={formatRouteBiasConfidence(openingBiasPlan.confidence)}
                  />
                  <MetricCard
                    label="Current Confidence"
                    value={
                      currentBiasPlan
                        ? formatRouteBiasConfidence(currentBiasPlan.confidence)
                        : "--"
                    }
                  />
                  <MetricCard
                    label="Latest Sample"
                    value={describeRouteBiasSample(openingBiasSample)}
                  />
                </div>

                <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--text-soft)]">
                  {(openingBiasUpdate?.reasons.length
                    ? openingBiasUpdate.reasons
                    : currentBiasPlan?.reasons ?? []
                  )
                    .slice(0, 3)
                    .map((reason) => (
                      <div key={reason}>{reason}</div>
                    ))}
                  {(openingBiasUpdate?.warnings.length
                    ? openingBiasUpdate.warnings
                    : currentBiasPlan?.warnings ?? []
                  )
                    .slice(0, 2)
                    .map((warning) => (
                      <div key={warning} className="text-amber-200/90">
                        {warning}
                      </div>
                    ))}
                </div>

                {!isRaceMode && (
                  <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
                    The pre-race route-bias workflow now seeds this board&apos;s opening-leg
                    bias, so the saved call, live check, and cockpit overlay all stay aligned.
                  </p>
                )}
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[color:var(--divider)] bg-black/20 p-4 text-sm leading-6 text-[color:var(--text-soft)]">
                Lock an opening-leg route-bias plan in Pre-race to carry the first-leg side
                call into this board and the live overlay.
              </div>
            )}
          </section>

          <section className="layline-panel p-4">
            <div className="flex items-start gap-3">
              <Route className="mt-1 text-[color:var(--muted)]" size={18} />
              <div>
                <div className="layline-kicker">Course Context</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Course Notes</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MetricCard label="First Mark" value={board.course.firstMark ?? "--"} />
              <MetricCard
                label="Course Length"
                value={formatDistance(board.course.totalDistanceNm)}
              />
            </div>
            <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--text-soft)]">
              {routeBiasInputModel.notes.map((note) => (
                <div key={note}>{note}</div>
              ))}
              {board.course.summary.specialRoutingNotes.map((note) => (
                <div key={note}>{note}</div>
              ))}
            </div>
          </section>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="layline-panel p-4">
          <div className="flex items-start gap-3">
            <Flag className="mt-1 text-[color:var(--muted)]" size={18} />
            <div>
              <div className="layline-kicker">Upwind</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Target Headings</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <MetricCard
              label="Starboard Tack"
              value={formatDeg(board.upwind.starboardTackHeadingDeg)}
            />
            <MetricCard
              label="Port Tack"
              value={formatDeg(board.upwind.portTackHeadingDeg)}
            />
            <MetricCard
              label="Windward Mark"
              value={formatDeg(board.upwind.windwardMarkBearingDeg)}
            />
            <MetricCard
              label="Mark Offset"
              value={formatSignedDeg(board.upwind.windwardMarkOffsetDeg)}
            />
            <MetricCard
              label="Favored Tack"
              value={getSideCopy(board.upwind.favoredTack)}
            />
          </div>
        </section>

        <section className="layline-panel p-4">
          <div className="flex items-start gap-3">
            <Sailboat className="mt-1 text-[color:var(--muted)]" size={18} />
            <div>
              <div className="layline-kicker">Downwind</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Run Geometry</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <MetricCard label="Jibe Bearing" value={formatDeg(board.downwind.jibeBearingDeg)} />
            <MetricCard
              label="Starboard Gybe"
              value={formatDeg(board.downwind.starboardGybeHeadingDeg)}
            />
            <MetricCard
              label="Port Gybe"
              value={formatDeg(board.downwind.portGybeHeadingDeg)}
            />
            <MetricCard
              label="Run Mark"
              value={formatDeg(board.downwind.downwindMarkBearingDeg)}
            />
            <MetricCard
              label="Dominant Reach"
              value={getSideCopy(board.downwind.dominantReach)}
            />
          </div>
        </section>

        <section className="layline-panel p-4">
          <div className="flex items-start gap-3">
            <Route className="mt-1 text-[color:var(--muted)]" size={18} />
            <div>
              <div className="layline-kicker">Start Line</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Bias Read</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[color:var(--text-soft)]">
            {lineHeadline}
          </p>
          <div className="mt-4 grid gap-3">
            <MetricCard
              label="Port-End Bearing"
              value={formatDeg(board.startLine.portEndBearingDeg)}
            />
            <MetricCard
              label="Starboard-End Bearing"
              value={formatDeg(board.startLine.starboardEndBearingDeg)}
            />
            <MetricCard label="Bias" value={formatSignedDeg(board.startLine.biasDeg)} />
            <MetricCard
              label="Favored End"
              value={getSideCopy(board.startLine.favoredEnd)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function AngleInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{props.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2.5"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
        <span className="text-sm text-[color:var(--muted)]">deg</span>
      </div>
    </label>
  );
}

function NumberInput(props: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{props.label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2.5"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
        <span className="text-sm text-[color:var(--muted)]">{props.unit}</span>
      </div>
    </label>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}
