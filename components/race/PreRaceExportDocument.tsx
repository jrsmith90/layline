"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import {
  formatCourseLabel,
  getCourseData,
  getDefaultCourseId,
} from "@/data/race/getCourseData";
import {
  type CurrentSide,
  type EdgeStrength,
  type PressureSide,
  type WindTrend,
} from "@/data/race/getRouteBiasInputs";
import { roundUpLaylineHeadingDeg } from "@/lib/race/courseStrategy/laylineHeading";
import { wrap360 } from "@/lib/race/courseTracker";
import {
  formatOpeningBiasAction,
  formatOpeningBiasConfidence,
  formatOpeningBiasLabel,
  formatOpeningLegTypeShort,
} from "@/lib/race/openingBias";
import { formatMarkSequence, getMarkShortLabel } from "@/lib/race/markLabels";
import { formatPlannedRaceStartLabel } from "@/lib/race/plannedRaceStart";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import {
  getConstraintActionCopy,
  getConstraintHeadline,
  getConstraintSecondaryDetail,
} from "@/lib/race/instructionConstraints";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function readNumber(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDegrees(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(wrap360(value))} deg`
    : "--";
}

function formatDistance(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2)} nm`
    : "--";
}

function formatTitleCase(value: string | null | undefined) {
  if (!value) return "--";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatWindTrend(value: WindTrend | null | undefined) {
  if (!value || value === "unknown") return "--";
  return formatTitleCase(value);
}

function formatPressureSide(value: PressureSide | null | undefined) {
  switch (value) {
    case "shore":
      return "Shore";
    case "bay":
      return "Bay";
    case "even":
      return "Even";
    case "unclear":
      return "Unclear";
    default:
      return "--";
  }
}

function formatCurrentSide(value: CurrentSide | null | undefined) {
  switch (value) {
    case "shore_less_adverse":
      return "Shore less adverse";
    case "bay_less_adverse":
      return "Bay less adverse";
    case "shore_more_favorable":
      return "Shore more favorable";
    case "bay_more_favorable":
      return "Bay more favorable";
    case "even":
      return "Even";
    case "unclear":
      return "Unclear";
    default:
      return "--";
  }
}

function formatEdgeStrength(value: EdgeStrength | null | undefined) {
  if (!value || value === "unclear") return "--";
  return formatTitleCase(value);
}

function formatSignedRisk(value: string | null | undefined) {
  if (!value || value === "unknown") return "--";
  return formatTitleCase(value);
}

function formatGeneratedLabel(date: Date) {
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard(props: {
  title: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="print-avoid-break rounded-[1.25rem] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            Pre-Race Export
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {props.title}
          </h2>
          {props.detail ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{props.detail}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <div className="text-sm leading-6 text-slate-500">No saved detail yet.</div>;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PreRaceExportDocument() {
  const { effectiveMode } = useDisplayMode();
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseData = useMemo(() => getCourseData(draft.courseId), [draft.courseId]);
  const generatedAt = useMemo(() => new Date(), []);
  const plannedStartLabel = formatPlannedRaceStartLabel(draft.raceStartDate, draft.raceStartTime);
  const tackAngleDeg = readNumber(draft.tackAngleDeg) ?? 42;
  const courseSequence =
    courseData.course.sequence ??
    courseData.course.previewSequence ??
    [];
  const headingRows = useMemo(
    () =>
      courseData.course.legs.map((leg) => ({
        key: `${leg.legNumber}-${leg.fromMark}-${leg.toMark}`,
        legNumber: leg.legNumber,
        from: getMarkShortLabel(leg.fromMark, courseData.marks[leg.fromMark]),
        to: getMarkShortLabel(leg.toMark, courseData.marks[leg.toMark]),
        bearingDeg: leg.bearingDeg,
        portHeadingDeg: wrap360(leg.bearingDeg + tackAngleDeg),
        starboardHeadingDeg: wrap360(leg.bearingDeg - tackAngleDeg),
        distanceNm: leg.distanceNmCalculated,
      })),
    [courseData.course.legs, courseData.marks, tackAngleDeg],
  );
  const originalRouteBias = draft.routeBias.originalPlan;
  const originalRouteBiasAnswers = draft.routeBias.originalAnswers;
  const latestRouteBias = draft.routeBias.latestUpdate;
  const confirmedSailSelection = draft.confirmedSailSelection;
  const courseStrategyAnswers = draft.courseStrategy;
  const courseStrategyResult = draft.courseStrategyResult;

  if (effectiveMode !== "desktop") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
        <section className="layline-panel p-5">
          <div className="layline-kicker">Desktop Only</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-[color:var(--text)]">
            PDF export is formatted for desktop mode.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">
            Switch the display control to <strong>Desktop</strong> or open this page on a wider
            screen, then come back to export the pre-race document.
          </p>
          <div className="mt-4">
            <Link
              href="/race/pre-race"
              className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
            >
              Return To Pre-Race
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pdf-export-page mx-auto w-full max-w-[8.8in] px-4 pb-10 pt-4">
      <div className="pdf-export-toolbar mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            Desktop PDF View
          </div>
          <div className="mt-1 text-sm text-slate-700">
            Use your browser destination set to <strong>Save as PDF</strong> before emailing.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/race/pre-race"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-900"
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
            Back To Pre-Race
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
          >
            <Printer size={16} strokeWidth={2.4} />
            Print / Save As PDF
          </button>
        </div>
      </div>

      <article className="pdf-export-sheet rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <header className="print-avoid-break border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Layline Pre-Race Brief
              </div>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {formatCourseLabel(draft.courseId)}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Desktop export of the saved course read, sail call, opening-bias plan, and Step 3
                opening-leg strategy.
              </p>
            </div>

            <div className="min-w-[14rem] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Document Timing
              </div>
              <div className="mt-2 space-y-1">
                <div>
                  <span className="font-semibold text-slate-950">Planned start:</span>{" "}
                  {plannedStartLabel ?? "Not set"}
                </div>
                <div>
                  <span className="font-semibold text-slate-950">Generated:</span>{" "}
                  {formatGeneratedLabel(generatedAt)}
                </div>
                <div>
                  <span className="font-semibold text-slate-950">Event:</span>{" "}
                  {courseData.eventName}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Location" value={courseData.eventLocation} />
            <MetricCard
              label="Course Sequence"
              value={
                courseSequence.length > 0
                  ? formatMarkSequence(courseSequence, courseData.marks)
                  : "Not loaded"
              }
            />
            <MetricCard
              label="First Leg Bearing"
              value={formatDegrees(courseData.firstLeg?.bearingDeg)}
            />
            <MetricCard
              label="Total Distance"
              value={formatDistance(
                courseData.totalDistanceNmSI ?? courseData.totalDistanceNmCalculated,
              )}
            />
          </div>
        </header>

        <div className="mt-6 space-y-5">
          <SectionCard
            title="Core Setup"
            detail="This is the same planning baseline used to drive the rest of the pre-race flow."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Planned Start" value={plannedStartLabel ?? "Not set"} />
              <MetricCard label="Tack Angle" value={formatDegrees(tackAngleDeg)} />
              <MetricCard
                label="Mean Wind Dir"
                value={formatDegrees(readNumber(draft.meanWindDirectionDeg))}
              />
              <MetricCard
                label="Current Wind Dir"
                value={formatDegrees(readNumber(draft.currentWindDirectionDeg))}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Course Read"
            detail="Use this as the dockside reference for course order, first-mark geometry, and hard routing limits."
          >
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                {courseData.course.textSummary?.length ? (
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Course In Text
                    </div>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                      {courseData.course.textSummary.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {courseData.course.notes ? (
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Course Definition
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {courseData.course.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Geometry
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <MetricCard
                      label="First Mark"
                      value={
                        courseData.firstMark
                          ? getMarkShortLabel(courseData.firstMark, courseData.marks[courseData.firstMark])
                          : "Unknown"
                      }
                    />
                    <MetricCard
                      label="First Mark Distance"
                      value={formatDistance(courseData.firstLeg?.distanceNmCalculated)}
                    />
                  </div>
                </div>

                {courseData.specialRoutingConstraints.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Hard Constraints
                    </div>
                    <div className="mt-3 space-y-3">
                      {courseData.specialRoutingConstraints.map((constraint) => (
                        <div
                          key={constraint.id}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            {getConstraintActionCopy(constraint)}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">
                            {getConstraintHeadline(constraint)}
                          </div>
                          {getConstraintSecondaryDetail(constraint) ? (
                            <div className="mt-1 text-sm leading-6 text-slate-600">
                              {getConstraintSecondaryDetail(constraint)}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    No special routing constraints are attached to this course.
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Step 2 Sail Package"
            detail="This pulls the confirmed sail call from the pre-race sail selection workflow."
          >
            {confirmedSailSelection ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Final Call" value={confirmedSailSelection.finalCall} />
                  <MetricCard label="Confidence" value={confirmedSailSelection.confidence} />
                  <MetricCard
                    label="Forecast Wind"
                    value={`${confirmedSailSelection.forecastWindKt.toFixed(1)} kt`}
                  />
                  <MetricCard label="Sea State" value={formatTitleCase(confirmedSailSelection.seaState)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Main" value={confirmedSailSelection.mainChoice} />
                  <MetricCard
                    label="Headsail"
                    value={confirmedSailSelection.headsailChoice ?? "None selected"}
                  />
                  <MetricCard
                    label="Spinnaker"
                    value={confirmedSailSelection.spinnakerChoice ?? "None selected"}
                  />
                  <MetricCard label="Reef Call" value={confirmedSailSelection.reefCall} />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Crew / Risk Setup
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-950">Crew count:</span>{" "}
                        {confirmedSailSelection.crewCount}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-950">Hiking:</span>{" "}
                        {formatTitleCase(confirmedSailSelection.hikingLevel)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-950">Leg type:</span>{" "}
                        {formatTitleCase(confirmedSailSelection.legType)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-950">Risk mode:</span>{" "}
                        {formatTitleCase(confirmedSailSelection.riskMode)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-950">Current effect:</span>{" "}
                        {formatSignedRisk(confirmedSailSelection.currentEffectLevel)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Coach Summary
                    </div>
                    <div className="mt-3 whitespace-pre-line">
                      {confirmedSailSelection.coachSummary ?? "No coach summary saved yet."}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Forecast / Current
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>{confirmedSailSelection.forecastSummary ?? "No forecast summary saved yet."}</div>
                      <div>{confirmedSailSelection.currentEffectSummary ?? "No current summary saved yet."}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No confirmed sail package is saved yet. Complete Step 2 first if you want this
                section to print with a final sail call.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Step 4 Opening Bias"
            detail="This documents the saved first-leg side call, the signals behind it, and any latest re-check."
          >
            {originalRouteBias && originalRouteBiasAnswers ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Pick" value={formatOpeningBiasLabel(originalRouteBias.decision)} />
                  <MetricCard
                    label="Confidence"
                    value={formatOpeningBiasConfidence(originalRouteBias.confidence)}
                  />
                  <MetricCard
                    label="Opening Leg"
                    value={formatOpeningLegTypeShort(originalRouteBiasAnswers.openingLegType)}
                  />
                  <MetricCard
                    label="Wind At Start"
                    value={`${formatDegrees(originalRouteBiasAnswers.windDirectionDeg)} · ${originalRouteBiasAnswers.windSpeedKt.toFixed(1)} kt`}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Wind Trend" value={formatWindTrend(originalRouteBiasAnswers.windTrend)} />
                  <MetricCard
                    label="Pressure Side"
                    value={formatPressureSide(originalRouteBiasAnswers.pressureSide)}
                  />
                  <MetricCard
                    label="Current Side"
                    value={formatCurrentSide(originalRouteBiasAnswers.currentSide)}
                  />
                  <MetricCard
                    label="Edge Strength"
                    value={formatEdgeStrength(originalRouteBiasAnswers.edgeStrength)}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Saved Reasoning
                    </div>
                    <div className="mt-3">
                      <DetailList items={originalRouteBias.reasons} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Warnings
                    </div>
                    <div className="mt-3">
                      <DetailList items={originalRouteBias.warnings} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Reference Basis
                    </div>
                    <div className="mt-3">
                      <DetailList items={originalRouteBias.referenceBasis} />
                    </div>
                  </div>
                </div>

                {latestRouteBias ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Latest Re-Check
                        </div>
                        <div className="mt-1 text-lg font-black text-slate-950">
                          {formatOpeningBiasAction(latestRouteBias.action) ?? "Re-check update"}
                        </div>
                      </div>
                      <div className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                        {formatOpeningBiasConfidence(latestRouteBias.confidence)}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Reasons
                        </div>
                        <div className="mt-3">
                          <DetailList items={latestRouteBias.reasons} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Warnings
                        </div>
                        <div className="mt-3">
                          <DetailList items={latestRouteBias.warnings} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No opening-bias plan is saved yet. Complete Step 4 if you want the first-leg side
                call and its reasoning included in the PDF.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Step 3 Course Strategy"
            detail="This section carries the saved zone-by-zone opening-leg plan and the reference-backed recommendations."
          >
            {courseStrategyAnswers && courseStrategyResult ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Opening Bearing"
                    value={formatDegrees(courseStrategyAnswers.openingLegBearingDeg)}
                  />
                  <MetricCard
                    label="First Mark Distance"
                    value={formatDistance(courseStrategyAnswers.firstMarkDistance)}
                  />
                  <MetricCard
                    label="Zone Count"
                    value={String(courseStrategyResult.zoneAnalysis.length)}
                  />
                  <MetricCard
                    label="Key Risks"
                    value={String(courseStrategyResult.keyRisks.length)}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 xl:col-span-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Strategy Notes
                    </div>
                    <div className="mt-3 whitespace-pre-line">
                      {courseStrategyAnswers.strategyNotes.trim() || "No strategy notes saved yet."}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:col-span-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Key Risks
                    </div>
                    <div className="mt-3">
                      <DetailList items={courseStrategyResult.keyRisks} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:col-span-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Recommendations
                    </div>
                    <div className="mt-3">
                      <DetailList items={courseStrategyResult.recommendations} />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full border-collapse text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Zone
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Heading
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Layline
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Wind Risk
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Current
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseStrategyResult.zoneAnalysis.map((zone, index) => (
                        <tr
                          key={zone.id}
                          className={index === courseStrategyResult.zoneAnalysis.length - 1 ? "" : "border-b border-slate-200"}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-slate-950">
                            {zone.label}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatDegrees(zone.headingDeg)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {roundUpLaylineHeadingDeg(zone.laylineHeadingDeg) == null
                              ? "--"
                              : `${roundUpLaylineHeadingDeg(zone.laylineHeadingDeg)} deg`}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatSignedRisk(zone.windShiftRisk)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatSignedRisk(zone.currentEffect)}
                          </td>
                          <td className="px-4 py-3 text-sm leading-6 text-slate-600">
                            {[zone.windShiftLocation, zone.notes].filter(Boolean).join(" ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Reference Basis
                  </div>
                  <div className="mt-3">
                    <DetailList items={courseStrategyResult.referenceBasis} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No course-strategy plan is saved yet. Complete Step 3 if you want the opening-leg
                zone analysis included in the PDF.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Mark-To-Mark Heading Chart"
            detail="Each leg shows the published bearing plus quick port and starboard heading targets using the saved tack angle."
          >
            {headingRows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Leg
                      </th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        From
                      </th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        To
                      </th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Bearing
                      </th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Port
                      </th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Starboard
                      </th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Distance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headingRows.map((row, index) => (
                      <tr
                        key={row.key}
                        className={index === headingRows.length - 1 ? "" : "border-b border-slate-200"}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-950">
                          {row.legNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.from}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.to}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDegrees(row.bearingDeg)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDegrees(row.portHeadingDeg)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDegrees(row.starboardHeadingDeg)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDistance(row.distanceNm)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No leg geometry is loaded for this course yet.
              </div>
            )}
          </SectionCard>
        </div>
      </article>
    </main>
  );
}
