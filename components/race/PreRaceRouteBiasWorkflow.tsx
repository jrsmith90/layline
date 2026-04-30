"use client";

import { useEffect, useMemo, useState } from "react";
import { getRouteBiasInputs } from "@/data/race/getRouteBiasInputs";
import PreRaceRouteBiasForm from "@/components/race/PreRaceRouteBiasForm";
import LiveRouteUpdateCard from "@/components/race/LiveRouteUpdateCard";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";
import { TroubleshootLiveContextPanel } from "@/components/troubleshoot/TroubleshootLiveContextPanel";
import { getLiveRouteUpdate } from "@/lib/race/getLiveRouteUpdate";
import type { RouteBiasSnapshot } from "@/lib/race/checkPlanValidity";
import type { RouteBiasAnswers } from "@/lib/race/scoreRouteBias";
import type { OpeningLegType, WindTrend, PressureSide, CurrentSide, EdgeStrength } from "@/data/race/getRouteBiasInputs";

type RouteBiasResult = RouteBiasSnapshot;

type LiveWeatherSource = {
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  trend?: {
    trend: "building" | "easing" | "steady" | "unknown";
  };
};

type LiveWeatherContext = {
  stationName?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  thomasPoint?: LiveWeatherSource & {
    stationName?: string;
  };
  cbibsAnnapolis?: LiveWeatherSource & {
    platformName?: string;
    waveHeightFt?: number;
    wavePeriodSec?: number;
  };
  historyTrend?: {
    trend: "building" | "easing" | "steady" | "unknown";
  };
};

type LatestConditionsValues = {
  courseId: string;
  openingLegType: OpeningLegType;
  windDirectionDeg: string;
  windSpeedKt: string;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
};

const initialLatestValues: LatestConditionsValues = {
  courseId: "1",
  openingLegType: "unknown",
  windDirectionDeg: "",
  windSpeedKt: "",
  windTrend: "unknown",
  pressureSide: "unclear",
  currentSide: "unclear",
  edgeStrength: "unclear"
};

function formatDecision(decision: string): string {
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

function formatConfidence(confidence: string): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function mapLiveTrendToRouteTrend(
  trend?: "building" | "easing" | "steady" | "unknown"
): WindTrend {
  if (trend === "building") return "building";
  if (trend === "easing") return "fading";
  if (trend === "steady") return "steady";
  return "unknown";
}

function getPrimaryLiveWind(context: LiveWeatherContext | null) {
  if (!context) return null;

  if (context.thomasPoint?.windAvgKt != null) {
    return {
      label: context.thomasPoint.stationName ?? "Thomas Point",
      windAvgKt: context.thomasPoint.windAvgKt,
      windGustKt: context.thomasPoint.windGustKt,
      windDirectionDeg: context.thomasPoint.windDirectionDeg,
      trend: context.thomasPoint.trend?.trend,
    };
  }

  if (context.cbibsAnnapolis?.windAvgKt != null) {
    return {
      label: context.cbibsAnnapolis.platformName ?? "Annapolis buoy",
      windAvgKt: context.cbibsAnnapolis.windAvgKt,
      windGustKt: context.cbibsAnnapolis.windGustKt,
      windDirectionDeg: context.cbibsAnnapolis.windDirectionDeg,
      trend: context.historyTrend?.trend,
    };
  }

  if (context.windAvgKt != null) {
    return {
      label: context.stationName ?? "KNAK",
      windAvgKt: context.windAvgKt,
      windGustKt: context.windGustKt,
      windDirectionDeg: context.windDirectionDeg,
      trend: context.historyTrend?.trend,
    };
  }

  return null;
}

export default function PreRaceRouteBiasWorkflow() {
  const [originalPlan, setOriginalPlan] = useState<RouteBiasResult | null>(null);
  const [latestValues, setLatestValues] = useState<LatestConditionsValues>(initialLatestValues);
  const [liveUpdate, setLiveUpdate] = useState<ReturnType<typeof getLiveRouteUpdate> | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherContext | null>(null);
  const [liveWeatherError, setLiveWeatherError] = useState<string | null>(null);

  const latestConfig = useMemo(
    () => getRouteBiasInputs(latestValues.courseId),
    [latestValues.courseId]
  );
  const primaryLiveWind = useMemo(() => getPrimaryLiveWind(liveWeather), [liveWeather]);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveWeather() {
      try {
        setLiveWeatherError(null);
        const response = await fetch("/api/weather/noaa-wind", {
          cache: "no-store",
        });
        const data = (await response.json()) as LiveWeatherContext & { error?: string };

        if (cancelled) return;

        if (!response.ok || data.error) {
          setLiveWeatherError(data.error ?? "Live weather unavailable.");
          setLiveWeather(null);
          return;
        }

        setLiveWeather(data);
      } catch (error) {
        if (!cancelled) {
          setLiveWeatherError(error instanceof Error ? error.message : "Live weather unavailable.");
          setLiveWeather(null);
        }
      }
    }

    loadLiveWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateLatestField<K extends keyof LatestConditionsValues>(
    key: K,
    value: LatestConditionsValues[K]
  ) {
    setLatestValues((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function seedLatestValuesFromOriginal(plan: RouteBiasResult, answers: RouteBiasAnswers) {
    setOriginalPlan(plan);
    setLatestValues({
      courseId: answers.courseId,
      openingLegType: answers.openingLegType,
      windDirectionDeg: String(answers.windDirectionDeg),
      windSpeedKt: String(answers.windSpeedKt),
      windTrend: answers.windTrend,
      pressureSide: answers.pressureSide,
      currentSide: answers.currentSide,
      edgeStrength: answers.edgeStrength
    });
    setLiveUpdate(null);
    setLatestError(null);
  }

  function handleOriginalPlanReady(payload: {
    result: RouteBiasResult;
    answers: RouteBiasAnswers;
  }) {
    seedLatestValuesFromOriginal(payload.result, payload.answers);
  }

  function buildLatestAnswers(): RouteBiasAnswers {
    const windDirectionDeg = latestValues.windDirectionDeg.trim();
    const windSpeedKt = latestValues.windSpeedKt.trim();

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

    return {
      courseId: latestValues.courseId,
      openingLegType: latestValues.openingLegType,
      windDirectionDeg: parsedWindDirectionDeg,
      windSpeedKt: parsedWindSpeedKt,
      windTrend: latestValues.windTrend,
      pressureSide: latestValues.pressureSide,
      currentSide: latestValues.currentSide,
      edgeStrength: latestValues.edgeStrength
    };
  }

  function handleLatestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLatestError(null);

    if (!originalPlan) {
      setLatestError("Create the original pre-race plan first.");
      return;
    }

    try {
      const latestAnswers = buildLatestAnswers();
      const update = getLiveRouteUpdate({
        originalPlan,
        latestAnswers
      });

      setLiveUpdate(update);
    } catch (error) {
      setLatestError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  function applyLiveWindToLatest() {
    if (!primaryLiveWind) {
      setLatestError("No live wind source is available yet.");
      return;
    }

    setLatestError(null);
    setLatestValues((prev) => ({
      ...prev,
      windDirectionDeg:
        primaryLiveWind.windDirectionDeg == null
          ? prev.windDirectionDeg
          : String(Math.round(primaryLiveWind.windDirectionDeg)),
      windSpeedKt: String(primaryLiveWind.windAvgKt.toFixed(1)),
      windTrend: mapLiveTrendToRouteTrend(primaryLiveWind.trend),
    }));
  }

  return (
    <div className="space-y-6">
      <LiveInstrumentsPanel context="route" />
      <TroubleshootLiveContextPanel />

      <PreRaceRouteBiasForm onPlanReady={handleOriginalPlanReady} />

      {originalPlan && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Original plan locked</h2>
            <p className="mt-1 text-sm text-white/70">
              Use the latest conditions below to check whether the original route bias still holds.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-white/60">Original decision</div>
                <div className="text-lg font-semibold">{formatDecision(originalPlan.decision)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/60">Confidence</div>
                <div className="font-medium">{formatConfidence(originalPlan.confidence)}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleLatestSubmit} className="mt-5 space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Live route seed
                  </div>
                  <p className="mt-1 text-sm text-white/75">
                    {primaryLiveWind
                      ? `${primaryLiveWind.label}: ${primaryLiveWind.windAvgKt.toFixed(1)} kt${primaryLiveWind.windGustKt != null ? `, gust ${primaryLiveWind.windGustKt.toFixed(1)} kt` : ""}${primaryLiveWind.windDirectionDeg != null ? ` from ${Math.round(primaryLiveWind.windDirectionDeg)} deg` : ""}`
                      : liveWeatherError ?? "Loading live wind context..."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyLiveWindToLatest}
                  disabled={!primaryLiveWind}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-40"
                >
                  Use live wind
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Which course is active now?</span>
                <select
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                  value={latestValues.courseId}
                  onChange={(e) => updateLatestField("courseId", e.target.value)}
                >
                  {latestConfig.prompts.announcedCourse.options?.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.openingLegType.label}
                </span>
                <select
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                  value={latestValues.openingLegType}
                  onChange={(e) =>
                    updateLatestField("openingLegType", e.target.value as OpeningLegType)
                  }
                >
                  {latestConfig.prompts.openingLegType.options?.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.windDirectionDeg.label}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                    placeholder={latestConfig.prompts.windDirectionDeg.placeholder}
                    value={latestValues.windDirectionDeg}
                    onChange={(e) => updateLatestField("windDirectionDeg", e.target.value)}
                  />
                  <span className="text-sm text-white/60">
                    {latestConfig.prompts.windDirectionDeg.unit}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.windSpeedKt.label}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                    placeholder={latestConfig.prompts.windSpeedKt.placeholder}
                    value={latestValues.windSpeedKt}
                    onChange={(e) => updateLatestField("windSpeedKt", e.target.value)}
                  />
                  <span className="text-sm text-white/60">
                    {latestConfig.prompts.windSpeedKt.unit}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.windTrend.label}
                </span>
                <select
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                  value={latestValues.windTrend}
                  onChange={(e) => updateLatestField("windTrend", e.target.value as WindTrend)}
                >
                  {latestConfig.prompts.windTrend.options?.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.pressureSide.label}
                </span>
                <select
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                  value={latestValues.pressureSide}
                  onChange={(e) => updateLatestField("pressureSide", e.target.value as PressureSide)}
                >
                  {latestConfig.prompts.pressureSide.options?.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.currentSide.label}
                </span>
                <select
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                  value={latestValues.currentSide}
                  onChange={(e) => updateLatestField("currentSide", e.target.value as CurrentSide)}
                >
                  {latestConfig.prompts.currentSide.options?.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {latestConfig.prompts.edgeStrength.label}
                </span>
                <select
                  className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
                  value={latestValues.edgeStrength}
                  onChange={(e) => updateLatestField("edgeStrength", e.target.value as EdgeStrength)}
                >
                  {latestConfig.prompts.edgeStrength.options?.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              Check live update
            </button>
          </form>

          {latestError && (
            <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              {latestError}
            </div>
          )}
        </div>
      )}

      <LiveRouteUpdateCard update={liveUpdate} />
    </div>
  );
}
