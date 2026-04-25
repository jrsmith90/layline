
"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  getRouteBiasInputs,
  type EdgeStrength,
  type CurrentSide,
  type OpeningLegType,
  type PressureSide,
  type WindTrend
} from "@/data/Race/getRouteBiasInputs";

type RouteBiasDecision =
  | "shore_first"
  | "bay_first"
  | "neutral"
  | "mixed_signal";

type RouteBiasConfidence = "low" | "medium" | "high";

type RouteBiasResult = {
  decision: RouteBiasDecision;
  confidence: RouteBiasConfidence;
  shoreScore: number;
  bayScore: number;
  reasons: string[];
  warnings: string[];
};

type RouteBiasAnswers = {
  courseId: string;
  openingLegType: OpeningLegType;
  windDirectionDeg: number;
  windSpeedKt: number;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
};

type PreRaceRouteBiasFormProps = {
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

const initialValues: FormValues = {
  courseId: "1",
  openingLegType: "unknown",
  windDirectionDeg: "",
  windSpeedKt: "",
  windTrend: "unknown",
  pressureSide: "unclear",
  currentSide: "unclear",
  edgeStrength: "unclear"
};

function formatDecision(decision: RouteBiasDecision): string {
  switch (decision) {
    case "shore_first":
      return "Favor shore early";
    case "bay_first":
      return "Favor bay early";
    case "neutral":
      return "Stay central and flexible";
    case "mixed_signal":
      return "Mixed signal";
    default:
      return decision;
  }
}

function formatConfidence(confidence: RouteBiasConfidence): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export default function PreRaceRouteBiasForm({ onPlanReady }: PreRaceRouteBiasFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RouteBiasResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => getRouteBiasInputs(values.courseId), [values.courseId]);

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const windDirectionDeg = values.windDirectionDeg.trim();
      const windSpeedKt = values.windSpeedKt.trim();

      if (!windDirectionDeg || !windSpeedKt) {
        throw new Error("Wind direction and wind speed are required.");
      }

      const parsedWindDirectionDeg = Number(windDirectionDeg);
      const parsedWindSpeedKt = Number(windSpeedKt);

      if (
        Number.isNaN(parsedWindDirectionDeg) ||
        parsedWindDirectionDeg < 0 ||
        parsedWindDirectionDeg > 360
      ) {
        throw new Error("Wind direction must be between 0 and 360.");
      }

      if (Number.isNaN(parsedWindSpeedKt) || parsedWindSpeedKt < 0) {
        throw new Error("Wind speed must be 0 or greater.");
      }

      const response = await fetch("/api/race-bias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId: values.courseId,
          openingLegType: values.openingLegType,
          windDirectionDeg: parsedWindDirectionDeg,
          windSpeedKt: parsedWindSpeedKt,
          windTrend: values.windTrend,
          pressureSide: values.pressureSide,
          currentSide: values.currentSide,
          edgeStrength: values.edgeStrength
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.details || data?.error || "Request failed");
      }

      setResult(data as RouteBiasResult);

      onPlanReady?.({
        result: data as RouteBiasResult,
        answers: {
          courseId: values.courseId,
          openingLegType: values.openingLegType,
          windDirectionDeg: parsedWindDirectionDeg,
          windSpeedKt: parsedWindSpeedKt,
          windTrend: values.windTrend,
          pressureSide: values.pressureSide,
          currentSide: values.currentSide,
          edgeStrength: values.edgeStrength
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
        <h2 className="text-xl font-semibold">Pre-Race Route Bias</h2>
        <p className="mt-1 text-sm text-white/70">
          Select the announced course, enter the expected weather and current read, and get an
          opening route bias.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {config.prompts.announcedCourse.label}
            </span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
              value={values.courseId}
              onChange={(e) => updateField("courseId", e.target.value)}
            >
              {config.prompts.announcedCourse.options?.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {config.prompts.openingLegType.label}
            </span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
              value={values.openingLegType}
              onChange={(e) => updateField("openingLegType", e.target.value as OpeningLegType)}
            >
              {config.prompts.openingLegType.options?.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
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
          </label>

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

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
          <div className="font-medium">Course context</div>
          <div className="mt-2 space-y-1 text-white/75">
            <div>Course type: {config.courseType}</div>
            <div>First mark: {config.firstMark ?? "Unknown"}</div>
            <div>
              First-leg bearing:{" "}
              {config.firstLegBearingDeg != null ? `${config.firstLegBearingDeg}°` : "Unknown"}
            </div>
            <div>
              Total distance: {config.totalDistanceNm != null ? `${config.totalDistanceNm} nm` : "Unknown"}
            </div>
          </div>

          {config.notes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-white/65">
              {config.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
        >
          {isSubmitting ? "Scoring..." : "Score route bias"}
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
              <div className="text-sm text-white/60">Decision</div>
              <div className="text-lg font-semibold">{formatDecision(result.decision)}</div>
            </div>

            <div className="text-right">
              <div className="text-sm text-white/60">Confidence</div>
              <div className="font-medium">{formatConfidence(result.confidence)}</div>
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
              <div className="text-sm font-medium">Reasons</div>
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
        </div>
      )}
    </div>
  );
}