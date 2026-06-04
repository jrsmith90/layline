"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Flag, Route, Sailboat, Wind } from "lucide-react";
import { useAppMode } from "@/components/display/AppModeProvider";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";
import { RoutingConstraintsList } from "@/components/race/RoutingConstraintsList";
import { InlineExplain } from "@/components/ui/InlineExplain";
import type { WindTrend } from "@/data/race/getRouteBiasInputs";
import { getRouteBiasInputs } from "@/data/race/getRouteBiasInputs";
import {
  type CourseSummary,
  formatCourseLabel,
  getDefaultCourseId,
} from "@/data/race/getCourseData";
import type { TacticalUpdateAction } from "@/lib/race/checkPlanValidity";
import { wrap360 } from "@/lib/race/courseTracker";
import {
  useCourseIds,
  useResolvedCourseData,
} from "@/lib/race/useCourseCatalogVersion";
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
import { getMarkShortLabel } from "@/lib/race/markLabels";

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

function formatMarkTarget(markId: string | null, marks: CourseSummary["marks"]) {
  if (!markId) return "the next mark";

  const mark = marks[markId];
  if (!mark) return markId;

  return getMarkShortLabel(markId, mark);
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

function getFavoredTackAction(favoredTack: string, markTarget: string) {
  switch (favoredTack) {
    case "starboard":
      return `The geometry favors starboard tack on the way to ${markTarget}.`;
    case "port":
      return `The geometry favors port tack on the way to ${markTarget}.`;
    case "even":
      return `The course is balanced right now, so either tack can work on the way to ${markTarget}.`;
    default:
      return `Once you set the wind and mark bearing, this will tell you which tack lines up better for ${markTarget}.`;
  }
}

export default function TacticalBoard() {
  return <TacticalBoardContent />;
}

export function TacticalBoardContent({
  embedded = false,
  showManualInputs = true,
}: {
  embedded?: boolean;
  showManualInputs?: boolean;
}) {
  const { isRaceMode } = useAppMode();
  const { effectiveMode } = useDisplayMode();
  const isDesktopLayout = effectiveMode === "desktop";
  const courseIds = useCourseIds();
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseData = useResolvedCourseData(draft.courseId);
  const routeBiasInputModel = getRouteBiasInputs(draft.courseId);
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
  const firstMarkTarget = formatMarkTarget(
    board.course.firstMark,
    board.course.summary.marks,
  );
  const showEmbeddedReadOnly = embedded && !showManualInputs;

  function handleCourseChange(nextCourseId: string) {
    setTacticalBoardCourseId(nextCourseId);
  }

  function seedMarkBearingsFromCourse() {
    seedTacticalBoardMarkBearings(draft.courseId);
  }

  function useMeanWindAsCurrent() {
    copyTacticalBoardMeanWindToCurrentWind();
  }

  const content = (
    <>
      {!embedded && <LiveInstrumentsPanel context="route" />}

      <section
        className={[
          "layline-panel overflow-hidden",
          showEmbeddedReadOnly ? "p-4" : "p-5",
          getShiftPanelClasses(board.shift.memoryColor),
        ].join(" ")}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="layline-kicker text-current/70">
              {showEmbeddedReadOnly ? "Tactical Snapshot" : "Layline Tactical Board"}
            </div>
            <h1
              className={[
                "mt-1 font-black uppercase tracking-tight",
                showEmbeddedReadOnly ? "text-2xl" : "text-3xl",
              ].join(" ")}
            >
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

        <div
          className={[
            showEmbeddedReadOnly ? "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "mt-5 grid gap-3 md:grid-cols-4",
          ].join(" ")}
        >
          <HeroMetric
            label="Baseline Wind"
            value={formatDeg(board.shift.referenceFromDeg)}
            help="This is your pre-race anchor wind direction. Use it as the normal picture of the course so you can spot whether the current wind has shifted away from your baseline."
          />
          <HeroMetric
            label="Current Wind"
            value={formatDeg(board.shift.currentFromDeg)}
            help="This is the wind direction you should use for immediate steering calls right now. If it changes, the target tack headings below should change with it."
          />
          <HeroMetric
            label="Shift Memory"
            value={formatSignedDeg(board.shift.deltaDeg)}
            help="This compares the current wind to your baseline wind. Positive means a right shift, negative means a left shift, and the size tells you whether the change is small noise or something worth reacting to."
          />
          <HeroMetric
            label="Jibe Bearing"
            value={formatDeg(board.downwind.jibeBearingDeg)}
            help="This is the downwind centerline, or the direction directly away from the wind. Use it as the downwind reference before deciding whether port or starboard gybe better points at the next mark."
          />
        </div>
      </section>

      {showManualInputs ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="layline-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="layline-kicker">Setup</div>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">Manual Inputs</h2>
                  <InlineExplain
                    label="Explain manual inputs"
                    title="How to use this"
                    widthClassName="w-80"
                  >
                    This is where you feed the board the key geometry for the day. If these values
                    are close, the steering numbers and bias calls below become useful. If they are
                    wrong, the board can still look polished while pointing you at the wrong answer.
                  </InlineExplain>
                </div>
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
                <span className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <span>Course</span>
                  <InlineExplain
                    label="Explain course input"
                    title="Course"
                    widthClassName="w-80"
                  >
                    Choose the route you expect to sail. This decides which first mark and course
                    geometry the board uses for headings, route bias, and course notes.
                  </InlineExplain>
                </span>
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
                <span className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <span>Wind trend</span>
                  <InlineExplain
                    label="Explain wind trend input"
                    title="Wind trend"
                    widthClassName="w-80"
                  >
                    This describes how stable the breeze feels overall. It helps frame whether you
                    should trust the current number, expect more movement, or stay more flexible
                    with the first-leg plan.
                  </InlineExplain>
                </span>
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
                help="Your all-day average wind direction. Use the best stable number you have from before the start so the board knows what normal looks like."
                onChange={(value) => setTacticalBoardDraftField("meanWindDirectionDeg", value)}
              />
              <div className="space-y-1">
                <AngleInput
                  label="Current wind from"
                  value={draft.currentWindDirectionDeg}
                  help="The latest wind direction you would steer off right now. Update this when the breeze changes and the target headings will follow it."
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
                help="The angle your boat typically sails away from the wind upwind. Use your real target angle here so the port and starboard heading numbers match your boat."
                onChange={(value) => setTacticalBoardDraftField("tackAngleDeg", value)}
              />
              <NumberInput
                label="Run TWA"
                unit="deg"
                value={draft.downwindTrueWindAngleDeg}
                help="The downwind true wind angle your boat likes to sail. This drives the gybe headings and the downwind geometry block."
                onChange={(value) =>
                  setTacticalBoardDraftField("downwindTrueWindAngleDeg", value)
                }
              />

              <AngleInput
                label="Windward mark bearing"
                value={draft.windwardMarkBearingDeg}
                help="The compass bearing from your current area toward the first upwind mark. This is what lets the board compare your tack headings to the actual mark location."
                onChange={(value) =>
                  setTacticalBoardDraftField("windwardMarkBearingDeg", value)
                }
              />
              <AngleInput
                label="Downwind mark bearing"
                value={draft.downwindMarkBearingDeg}
                help="The compass bearing to the downwind mark. Use this if you want the run geometry to reflect the real course instead of a simple opposite-of-upwind assumption."
                onChange={(value) =>
                  setTacticalBoardDraftField("downwindMarkBearingDeg", value)
                }
              />

              <AngleInput
                label="Port-end line bearing"
                value={draft.linePortEndBearingDeg}
                help="The bearing from your position toward the port end of the starting line. Together with the starboard-end bearing, this gives the board its line bias read."
                onChange={(value) => setTacticalBoardDraftField("linePortEndBearingDeg", value)}
              />
              <AngleInput
                label="Starboard-end line bearing"
                value={draft.lineStarboardEndBearingDeg}
                help="The bearing from your position toward the committee-boat end. Once both line ends are filled in, the board can estimate which end is favored."
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
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight">
                      {isRaceMode ? "Fast Calls" : "Coach Calls"}
                    </h2>
                    <InlineExplain
                      label="Explain coach calls"
                      title="How to use this"
                      widthClassName="w-80"
                    >
                      Think of these as the plain-English takeaways from the board. If you do not
                      have time to read every metric, start here and use these lines as the short
                      race-crew version of the current setup.
                    </InlineExplain>
                  </div>
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
                    <div className="mt-1 flex items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tight">Route Plan</h2>
                      <InlineExplain
                        label="Explain route plan"
                        title="How to use this"
                        widthClassName="w-80"
                      >
                        This is your first-leg side plan. Use it to answer: where do we expect the
                        better pressure or geometry early, and has anything changed enough that we
                        should adjust that call before the start?
                      </InlineExplain>
                    </div>
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
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight">Course Notes</h2>
                    <InlineExplain
                      label="Explain course notes"
                      title="How to use this"
                      widthClassName="w-80"
                    >
                      This is the rules-and-geometry reminder section. Use it to confirm the first
                      mark, overall length, and any instruction limits that could change how you
                      round or pass marks once the race starts.
                    </InlineExplain>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MetricCard label="First Mark" value={board.course.firstMark ?? "--"} />
                <MetricCard
                  label="Course Length"
                  value={formatDistance(board.course.totalDistanceNm)}
                />
              </div>
              {board.course.summary.specialRoutingConstraints.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Instruction Limits
                  </div>
                  <div className="mt-3">
                    <RoutingConstraintsList
                      constraints={board.course.summary.specialRoutingConstraints}
                    />
                  </div>
                </div>
              )}
              <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--text-soft)]">
                {board.course.summary.course.notes ? (
                  <div>{board.course.summary.course.notes}</div>
                ) : null}
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
      ) : (
        <div className="space-y-5">
          <section className="layline-panel p-4">
            <div className="flex items-start gap-3">
              <Wind className="mt-1 text-[color:var(--muted)]" size={18} />
              <div>
                <div className="layline-kicker">Primary Read</div>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">
                    {isRaceMode ? "Fast Calls" : "Coach Calls"}
                  </h2>
                  <InlineExplain
                    label="Explain coach calls"
                    title="How to use this"
                    widthClassName="w-80"
                  >
                    Think of these as the plain-English takeaways from the board. If you do not
                    have time to read every metric, start here and use these lines as the short
                    race-crew version of the current setup.
                  </InlineExplain>
                </div>
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
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight">Route Plan</h2>
                    <InlineExplain
                      label="Explain route plan"
                      title="How to use this"
                      widthClassName="w-80"
                    >
                      This is your first-leg side plan. Use it to answer: where do we expect the
                      better pressure or geometry early, and has anything changed enough that we
                      should adjust that call before the start?
                    </InlineExplain>
                  </div>
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
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">Course Notes</h2>
                  <InlineExplain
                    label="Explain course notes"
                    title="How to use this"
                    widthClassName="w-80"
                  >
                    This is the rules-and-geometry reminder section. Use it to confirm the first
                    mark, overall length, and any instruction limits that could change how you
                    round or pass marks once the race starts.
                  </InlineExplain>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MetricCard label="First Mark" value={board.course.firstMark ?? "--"} />
              <MetricCard
                label="Course Length"
                value={formatDistance(board.course.totalDistanceNm)}
              />
            </div>
            {board.course.summary.specialRoutingConstraints.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Instruction Limits
                </div>
                <div className="mt-3">
                  <RoutingConstraintsList
                    constraints={board.course.summary.specialRoutingConstraints}
                  />
                </div>
              </div>
            )}
            <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--text-soft)]">
              {board.course.summary.course.notes ? (
                <div>{board.course.summary.course.notes}</div>
              ) : null}
                {routeBiasInputModel.notes.map((note) => (
                  <div key={note}>{note}</div>
                ))}
                {board.course.summary.specialRoutingNotes.map((note) => (
                  <div key={note}>{note}</div>
                ))}
              </div>
            </section>
        </div>
      )}

      <section className="layline-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Flag className="mt-1 text-[color:var(--muted)]" size={18} />
            <div>
              <div className="layline-kicker">Upwind</div>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Headings To The Next Mark</h2>
                <InlineExplain
                  label="Explain target headings"
                  title="How to use this"
                  widthClassName="w-80"
                >
                  This is the quick steering section. If you are sailing upwind toward the next
                  mark, use the starboard number when you are on starboard tack and the port
                  number when you are on port tack. Then compare those targets to what the compass
                  and the boat actually feel like.
                </InlineExplain>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-soft)]">
                Use these as your working compass targets on the beat to{" "}
                <span className="font-bold text-[color:var(--text)]">{firstMarkTarget}</span>.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm leading-6 text-[color:var(--text-soft)]">
            {getFavoredTackAction(board.upwind.favoredTack, firstMarkTarget)}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <HeadingCalloutCard
              tackLabel="Starboard Tack"
              heading={formatDeg(board.upwind.starboardTackHeadingDeg)}
              description={`If the boat is on starboard tack sailing toward ${firstMarkTarget}, steer this heading as your starting target.`}
            />
            <HeadingCalloutCard
              tackLabel="Port Tack"
              heading={formatDeg(board.upwind.portTackHeadingDeg)}
              description={`If the boat is on port tack sailing toward ${firstMarkTarget}, steer this heading as your starting target.`}
            />
          </div>

          <div className="grid gap-3">
            <MetricCard
              label="Windward Mark Bearing"
              value={formatDeg(board.upwind.windwardMarkBearingDeg)}
              help="This is the actual direction to the next upwind mark. Comparing it with your tack headings tells you which tack points closer to the mark."
            />
            <MetricCard
              label="Mark Offset"
              value={formatSignedDeg(board.upwind.windwardMarkOffsetDeg)}
              help="This shows how far the mark sits to one side of the wind axis. Positive values lean the geometry toward starboard tack, negative values lean it toward port."
            />
            <MetricCard
              label="Favored Tack"
              value={getSideCopy(board.upwind.favoredTack)}
              help="This is the board's simple read on which tack lines up better with the mark right now. It is not a full strategy decision by itself, but it is a strong steering clue."
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">

        <section className="layline-panel p-4">
          <div className="flex items-start gap-3">
            <Sailboat className="mt-1 text-[color:var(--muted)]" size={18} />
            <div>
              <div className="layline-kicker">Downwind</div>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Run Geometry</h2>
                <InlineExplain
                  label="Explain run geometry"
                  title="How to use this"
                  widthClassName="w-80"
                >
                  Use this section after the top mark. It tells you the centerline downwind and
                  which gybe is better aligned with the next mark so you can make cleaner jibe
                  decisions instead of guessing off feel alone.
                </InlineExplain>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <MetricCard
              label="Jibe Bearing"
              value={formatDeg(board.downwind.jibeBearingDeg)}
              help="This is the direction directly downwind. Treat it as the centerline for the run before looking at which gybe better points toward the mark."
            />
            <MetricCard
              label="Starboard Gybe"
              value={formatDeg(board.downwind.starboardGybeHeadingDeg)}
              help="This is your working heading when sailing downwind on starboard gybe."
            />
            <MetricCard
              label="Port Gybe"
              value={formatDeg(board.downwind.portGybeHeadingDeg)}
              help="This is your working heading when sailing downwind on port gybe."
            />
            <MetricCard
              label="Run Mark"
              value={formatDeg(board.downwind.downwindMarkBearingDeg)}
              help="This is the direction to the downwind mark. Compare it with the gybe headings to see which side aims you better."
            />
            <MetricCard
              label="Dominant Reach"
              value={getSideCopy(board.downwind.dominantReach)}
              help="This is the board's read on which gybe has better downwind geometry toward the mark."
            />
          </div>
        </section>

        <section className="layline-panel p-4">
          <div className="flex items-start gap-3">
            <Route className="mt-1 text-[color:var(--muted)]" size={18} />
            <div>
              <div className="layline-kicker">Start Line</div>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Bias Read</h2>
                <InlineExplain
                  label="Explain start line bias"
                  title="How to use this"
                  widthClassName="w-80"
                >
                  This section helps with where the line is tilted relative to the wind. A favored
                  end can make it easier to start with speed and less distance sailed, but it still
                  has to fit your first-leg plan and traffic picture.
                </InlineExplain>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[color:var(--text-soft)]">
            {lineHeadline}
          </p>
          <div className="mt-4 grid gap-3">
            <MetricCard
              label="Port-End Bearing"
              value={formatDeg(board.startLine.portEndBearingDeg)}
              help="The direction from your position to the port end of the line."
            />
            <MetricCard
              label="Starboard-End Bearing"
              value={formatDeg(board.startLine.starboardEndBearingDeg)}
              help="The direction from your position to the committee-boat end of the line."
            />
            <MetricCard
              label="Bias"
              value={formatSignedDeg(board.startLine.biasDeg)}
              help="This measures how tilted the line is relative to the wind. Positive favors the starboard end, negative favors the port end, and small numbers mean the line is close to square."
            />
            <MetricCard
              label="Favored End"
              value={getSideCopy(board.startLine.favoredEnd)}
              help="This is the simple answer to which end of the line has the angle advantage right now."
            />
          </div>
        </section>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{content}</div>;
  }

  return (
    <main
      className={[
        "mx-auto w-full space-y-5 px-4 pb-8 pt-4",
        isDesktopLayout ? "max-w-[96rem]" : "max-w-5xl",
      ].join(" ")}
    >
      {content}
    </main>
  );
}

function AngleInput(props: {
  label: string;
  value: string;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium">
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
      </span>
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
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-medium">
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
      </span>
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

function HeroMetric({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
        <span>{label}</span>
        {help ? (
          <InlineExplain
            label={`Explain ${label}`}
            title={label}
            widthClassName="w-80"
          >
            {help}
          </InlineExplain>
        ) : null}
      </div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
    </div>
  );
}

function HeadingCalloutCard(props: {
  tackLabel: string;
  heading: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--divider)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.78))] p-5 shadow-[0_18px_44px_rgba(2,6,23,0.24)]">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {props.tackLabel}
      </div>
      <div className="mt-3 text-4xl font-black tracking-tight text-[color:var(--text)]">
        {props.heading}
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
        {props.description}
      </p>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
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
      <div className="mt-1 text-xl font-black text-[color:var(--text)]">{props.value}</div>
    </div>
  );
}
