"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { getCustomCourseRecord } from "@/data/race/customCourses";
import {
  getRouteBiasInputs,
  type RouteBiasPrompt,
  type CurrentSide,
  type EdgeStrength,
  type OpeningLegType,
  type PressureSide,
  type WindTrend
} from "@/data/race/getRouteBiasInputs";
import { getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import {
  formatOpeningBiasConfidence,
  formatOpeningBiasLabel,
} from "@/lib/race/openingBias";
import {
  detectOpeningLegType,
  getOpeningLegTypeLabel,
} from "@/lib/race/openingLegType";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { usePreRaceCoachAssist } from "@/lib/race/usePreRaceCoachAssist";
import { useCourseCatalogVersion } from "@/lib/race/useCourseCatalogVersion";
import { RoutingConstraintsList } from "@/components/race/RoutingConstraintsList";
import { readJsonResponse } from "@/lib/readJsonResponse";
import { buildRouteBiasCoachAutofill } from "@/lib/race/routeBiasCoachAssist";
import type { RouteBiasAnswers, RouteBiasResult } from "@/lib/race/scoreRouteBias";

type PreRaceRouteBiasFormProps = {
  defaultCourseId?: string;
  initialAnswers?: RouteBiasAnswers | null;
  initialResult?: RouteBiasResult | null;
  showCourseField?: boolean;
  onPlanReady?: (payload: {
    result: RouteBiasResult;
    answers: RouteBiasAnswers;
  }) => void;
};

type FormValues = {
  courseId: string;
  openingLegType: OpeningLegType;
  windDirectionDeg: string;
  windSpeedKt: string;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
};

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function createInitialValues(courseId: string): FormValues {
  return {
    courseId,
    openingLegType: "unknown",
    windDirectionDeg: "",
    windSpeedKt: "",
    windTrend: "unknown",
    pressureSide: "unclear",
    currentSide: "unclear",
    edgeStrength: "unclear",
  };
}

function toFormValues(
  initialAnswers?: RouteBiasAnswers | null,
  defaultCourseId = getDefaultCourseId(),
): FormValues {
  if (!initialAnswers) return createInitialValues(defaultCourseId);

  return {
    courseId: initialAnswers.courseId,
    openingLegType: initialAnswers.openingLegType,
    windDirectionDeg: String(initialAnswers.windDirectionDeg),
    windSpeedKt: String(initialAnswers.windSpeedKt),
    windTrend: initialAnswers.windTrend,
    pressureSide: initialAnswers.pressureSide,
    currentSide: initialAnswers.currentSide,
    edgeStrength: initialAnswers.edgeStrength,
  };
}

function findPromptOptionLabel<T extends string>(
  prompt: RouteBiasPrompt<T>,
  value: T,
) {
  return prompt.options?.find((option) => option.value === value)?.label ?? value;
}

export default function PreRaceRouteBiasForm({
  defaultCourseId = getDefaultCourseId(),
  initialAnswers,
  initialResult,
  showCourseField = true,
  onPlanReady,
}: PreRaceRouteBiasFormProps) {
  const [values, setValues] = useState<FormValues>(() =>
    toFormValues(initialAnswers, defaultCourseId),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RouteBiasResult | null>(() => initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [openingLegManualOverride, setOpeningLegManualOverride] = useState(false);
  const [showManualBiasOverrides, setShowManualBiasOverrides] = useState(false);
  useCourseCatalogVersion();
  const tacticalBoardDraft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );

  const config = getRouteBiasInputs(values.courseId);
  const courseData = useMemo(() => getCourseData(values.courseId), [values.courseId]);
  const tackAngleDeg = useMemo(() => {
    const parsed = Number(tacticalBoardDraft.tackAngleDeg);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 42;
  }, [tacticalBoardDraft.tackAngleDeg]);
  const coachAssist = usePreRaceCoachAssist({
    courseId: values.courseId,
    courseData,
    tackAngleDeg,
    plannedRaceStartDate: tacticalBoardDraft.raceStartDate,
    plannedRaceStartTime: tacticalBoardDraft.raceStartTime,
  });
  const openingLegAutoRead = useMemo(
    () =>
      detectOpeningLegType({
        windDirectionDeg: values.windDirectionDeg.trim()
          ? Number(values.windDirectionDeg)
          : null,
        firstLegBearingDeg: config.firstLegBearingDeg,
        laylineDeg: tackAngleDeg,
      }),
    [config.firstLegBearingDeg, tackAngleDeg, values.windDirectionDeg],
  );
  const shouldShowOpeningLegAutoRead = openingLegAutoRead.openingLegType !== "unknown";
  const effectiveOpeningLegType = openingLegManualOverride
    ? values.openingLegType
    : openingLegAutoRead.openingLegType;
  const coachBiasRead = useMemo(
    () =>
      buildRouteBiasCoachAutofill({
        courseData,
        courseWindRead: coachAssist.courseWindRead,
        forecastDecision: coachAssist.forecastDecision,
        currentImpact: coachAssist.currentImpact,
      }),
    [coachAssist.courseWindRead, coachAssist.currentImpact, coachAssist.forecastDecision, courseData],
  );
  const effectiveWindTrend =
    values.windTrend !== "unknown" ? values.windTrend : coachBiasRead.windTrend;
  const effectivePressureSide = showManualBiasOverrides
    ? values.pressureSide
    : coachBiasRead.pressureSide;
  const effectiveCurrentSide = showManualBiasOverrides
    ? values.currentSide
    : coachBiasRead.currentSide;
  const effectiveEdgeStrength = showManualBiasOverrides
    ? values.edgeStrength
    : coachBiasRead.edgeStrength;

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function handleCourseChange(nextCourseId: string) {
    setOpeningLegManualOverride(false);
    setValues((prev) => ({
      ...prev,
      courseId: nextCourseId,
      openingLegType: "unknown",
    }));
  }

  function handleOpeningLegTypeChange(nextOpeningLegType: OpeningLegType) {
    setOpeningLegManualOverride(true);
    updateField("openingLegType", nextOpeningLegType);
  }

  function restoreOpeningLegAutoRead() {
    setOpeningLegManualOverride(false);
    updateField("openingLegType", openingLegAutoRead.openingLegType);
  }

  function applyAiCoachWindRead() {
    setError(null);
    setValues((prev) => ({
      ...prev,
      windDirectionDeg:
        coachBiasRead.windDirectionDeg == null
          ? prev.windDirectionDeg
          : String(Math.round(coachBiasRead.windDirectionDeg)),
      windSpeedKt:
        coachBiasRead.windSpeedKt == null
          ? prev.windSpeedKt
          : coachBiasRead.windSpeedKt.toFixed(1),
      windTrend: coachBiasRead.windTrend,
    }));
    setShowManualBiasOverrides(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const windDirectionDeg =
        values.windDirectionDeg.trim().length > 0
          ? Number(values.windDirectionDeg.trim())
          : coachBiasRead.windDirectionDeg;
      const windSpeedKt =
        values.windSpeedKt.trim().length > 0
          ? Number(values.windSpeedKt.trim())
          : coachBiasRead.windSpeedKt;

      if (windDirectionDeg == null || windSpeedKt == null) {
        throw new Error("Wind direction and wind speed are required. Use the AI coach fill or enter them manually.");
      }

      if (
        Number.isNaN(windDirectionDeg) ||
        windDirectionDeg < 0 ||
        windDirectionDeg > 360
      ) {
        throw new Error("Wind direction must be between 0 and 360.");
      }

      if (Number.isNaN(windSpeedKt) || windSpeedKt < 0) {
        throw new Error("Wind speed must be 0 or greater.");
      }

      const response = await fetch("/api/race-bias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId: values.courseId,
          customCourse: getCustomCourseRecord(values.courseId),
          routingConstraints: config.routingConstraints,
          openingLegType: effectiveOpeningLegType,
          windDirectionDeg,
          windSpeedKt,
          windTrend: effectiveWindTrend,
          pressureSide: effectivePressureSide,
          currentSide: effectiveCurrentSide,
          edgeStrength: effectiveEdgeStrength
        })
      });

      const data = await readJsonResponse<RouteBiasResult & { details?: string; error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Request failed");
      }

      setResult(data as RouteBiasResult);

      onPlanReady?.({
        result: data as RouteBiasResult,
        answers: {
          courseId: values.courseId,
          openingLegType: effectiveOpeningLegType,
          windDirectionDeg,
          windSpeedKt,
          windTrend: effectiveWindTrend,
          pressureSide: effectivePressureSide,
          currentSide: effectiveCurrentSide,
          edgeStrength: effectiveEdgeStrength
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Opening Bias</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {showCourseField ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                {config.prompts.announcedCourse.label}
              </span>
              <select
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                value={values.courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
              >
                {config.prompts.announcedCourse.options?.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {config.prompts.openingLegType.label}
            </span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
              value={effectiveOpeningLegType}
              onChange={(e) => handleOpeningLegTypeChange(e.target.value as OpeningLegType)}
            >
              {config.prompts.openingLegType.options?.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-2 space-y-2 text-xs leading-5 text-white/65">
              <div>
                {openingLegManualOverride && shouldShowOpeningLegAutoRead
                  ? `Manual override is on. Auto-read would call this ${getOpeningLegTypeLabel(openingLegAutoRead.openingLegType)}.`
                  : openingLegAutoRead.summary}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                  Wind angle {openingLegAutoRead.windAngleDeg != null ? `${openingLegAutoRead.windAngleDeg}°` : "--"}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                  Layline {Math.round(tackAngleDeg)}°
                </span>
                {openingLegManualOverride ? (
                  <button
                    type="button"
                    onClick={restoreOpeningLegAutoRead}
                    className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100"
                  >
                    Use auto-read
                  </button>
                ) : null}
              </div>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {config.prompts.windDirectionDeg.label}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                placeholder={config.prompts.windDirectionDeg.placeholder}
                value={values.windDirectionDeg}
                onChange={(e) => updateField("windDirectionDeg", e.target.value)}
              />
              <span className="text-sm text-white/60">{config.prompts.windDirectionDeg.unit}</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-white/65">
              {coachBiasRead.windDirectionDeg != null
                ? `AI coach projects about ${Math.round(coachBiasRead.windDirectionDeg)} deg at the start.`
                : "AI coach is still waiting on enough wind data to project direction."}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">{config.prompts.windSpeedKt.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                placeholder={config.prompts.windSpeedKt.placeholder}
                value={values.windSpeedKt}
                onChange={(e) => updateField("windSpeedKt", e.target.value)}
              />
              <span className="text-sm text-white/60">{config.prompts.windSpeedKt.unit}</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-white/65">
              {coachBiasRead.windSpeedKt != null
                ? `AI coach projects about ${coachBiasRead.windSpeedKt.toFixed(1)} kt for the start window.`
                : "AI coach is still waiting on enough forecast data to project speed."}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">{config.prompts.windTrend.label}</span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
              value={values.windTrend}
              onChange={(e) => updateField("windTrend", e.target.value as WindTrend)}
            >
              {config.prompts.windTrend.options?.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs leading-5 text-white/65">
              {values.windTrend === "unknown"
                ? `If you leave this on Unclear, the opening-bias coach will use ${findPromptOptionLabel(
                    config.prompts.windTrend,
                    coachBiasRead.windTrend,
                  )}.`
                : "Manual wind-trend override is active for this save."}
            </div>
          </label>
        </div>

        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/75">
                AI Coach Bias Read
              </div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">
                {coachBiasRead.summary}
              </div>
              <div className="mt-2 text-xs leading-5 text-cyan-50/80">
                {coachAssist.currentImpact.summary}
              </div>
            </div>

            <button
              type="button"
              onClick={applyAiCoachWindRead}
              disabled={coachBiasRead.windDirectionDeg == null || coachBiasRead.windSpeedKt == null}
              className="rounded-xl border border-cyan-200/30 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-50 disabled:opacity-40"
            >
              Use AI Wind
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ContextMetric
              label="Wind Direction"
              value={
                coachBiasRead.windDirectionDeg != null
                  ? `${Math.round(coachBiasRead.windDirectionDeg)} deg`
                  : "Waiting"
              }
            />
            <ContextMetric
              label="Pressure Side"
              value={findPromptOptionLabel(config.prompts.pressureSide, effectivePressureSide)}
            />
            <ContextMetric
              label="Current Setup"
              value={findPromptOptionLabel(config.prompts.currentSide, effectiveCurrentSide)}
            />
            <ContextMetric
              label="Edge Strength"
              value={findPromptOptionLabel(config.prompts.edgeStrength, effectiveEdgeStrength)}
            />
          </div>

          <div className="mt-3 space-y-2 text-xs leading-5 text-cyan-50/80">
            {coachBiasRead.reasoning.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>

          <div className="mt-4 border-t border-cyan-200/15 pt-4">
            <button
              type="button"
              onClick={() => setShowManualBiasOverrides((prev) => !prev)}
              className="rounded-xl border border-cyan-200/25 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-50"
            >
              {showManualBiasOverrides ? "Hide Manual Bias Overrides" : "Show Manual Bias Overrides"}
            </button>
          </div>
        </div>

        {showManualBiasOverrides ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{config.prompts.pressureSide.label}</span>
              <select
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                value={values.pressureSide}
                onChange={(e) => updateField("pressureSide", e.target.value as PressureSide)}
              >
                {config.prompts.pressureSide.options?.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium">{config.prompts.currentSide.label}</span>
              <select
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                value={values.currentSide}
                onChange={(e) => updateField("currentSide", e.target.value as CurrentSide)}
              >
                {config.prompts.currentSide.options?.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">{config.prompts.edgeStrength.label}</span>
              <select
                className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                value={values.edgeStrength}
                onChange={(e) => updateField("edgeStrength", e.target.value as EdgeStrength)}
              >
                {config.prompts.edgeStrength.options?.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ContextMetric label="Type" value={config.courseType} />
            <ContextMetric label="First mark" value={config.firstMark ?? "Unknown"} />
            <ContextMetric
              label="Bearing"
              value={
                config.firstLegBearingDeg != null ? `${config.firstLegBearingDeg}°` : "Unknown"
              }
            />
            <ContextMetric
              label="Distance"
              value={config.totalDistanceNm != null ? `${config.totalDistanceNm} nm` : "Unknown"}
            />
          </div>

          {config.notes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {config.notes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white/70"
                >
                  {note}
                </span>
              ))}
            </div>
          )}

          {config.routingConstraints.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                Instruction limits
              </div>
              <div className="mt-2">
                <RoutingConstraintsList constraints={config.routingConstraints} compact />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="layline-pill px-4 py-2 text-sm font-bold text-[color:var(--text)] disabled:opacity-60"
        >
          {isSubmitting ? "Scoring..." : "Save Opening Bias"}
        </button>
      </form>

      {error && (
        <div className="mt-5 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-white/60">Saved opening pick</div>
              <div className="text-lg font-semibold">
                {formatOpeningBiasLabel(result.decision)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-white/60">Confidence</div>
              <div className="font-medium">
                {formatOpeningBiasConfidence(result.confidence)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <div className="text-sm text-white/60">Shore score</div>
              <div className="text-lg font-semibold">{result.shoreScore}</div>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <div className="text-sm text-white/60">Bay score</div>
              <div className="text-lg font-semibold">{result.bayScore}</div>
            </div>
          </div>

          {result.reasons.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium">Why this side</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-amber-300">Warnings</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {result.referenceBasis.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-cyan-200">Reference basis</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cyan-50/90">
                {result.referenceBasis.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white/85">{value}</div>
    </div>
  );
}
