"use client";

import { useEffect, useMemo, useState } from "react";
import type { LegType, RiskMode } from "@/data/logic/sailSelectionLogic";
import type { CourseSummary } from "@/data/race/getCourseData";
import { readJsonResponse } from "@/lib/readJsonResponse";
import {
  buildCourseStrategyAssistBrief,
  buildCurrentImpactDecision,
  buildForecastDecision,
  buildSailSelectionAssistBrief,
  buildStrategyAutofill,
  getCourseWindRead,
  getFirstLegSamplePoint,
  getLegTypeFromCourseWind,
  getSeaStateFromWind,
  getSuggestedRiskMode,
  type ConfirmedSailSelectionSummary,
  type CurrentImpactDecision,
  type ForecastDecision,
  type LiveWeatherPayload,
  type PointForecastPayload,
  type TideCurrentPayload,
} from "@/lib/race/preRaceCoachAssist";

type UsePreRaceCoachAssistParams = {
  courseId: string;
  courseData: CourseSummary;
  tackAngleDeg: number;
  confirmedSailSelection?: ConfirmedSailSelectionSummary | null;
};

export function usePreRaceCoachAssist(params: UsePreRaceCoachAssistParams) {
  const [liveWeather, setLiveWeather] = useState<LiveWeatherPayload | null>(null);
  const [liveWeatherError, setLiveWeatherError] = useState<string | null>(null);
  const [liveWeatherLoading, setLiveWeatherLoading] = useState(true);
  const [tideCurrent, setTideCurrent] = useState<TideCurrentPayload | null>(null);
  const [tideCurrentError, setTideCurrentError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<PointForecastPayload | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveWeather() {
      try {
        setLiveWeatherLoading(true);
        setLiveWeatherError(null);
        const response = await fetch("/api/weather/noaa-wind", { cache: "no-store" });
        const data = await readJsonResponse<LiveWeatherPayload>(response);

        if (cancelled) return;

        if (!response.ok || data.error) {
          setLiveWeather(null);
          setLiveWeatherError(data.error ?? "Live course conditions unavailable.");
          return;
        }

        setLiveWeather(data);
      } catch (error) {
        if (!cancelled) {
          setLiveWeather(null);
          setLiveWeatherError(
            error instanceof Error ? error.message : "Live course conditions unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setLiveWeatherLoading(false);
        }
      }
    }

    loadLiveWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTideCurrent() {
      try {
        setTideCurrentError(null);
        const query = new URLSearchParams({
          eventId: params.courseData.eventId,
          date: params.courseData.raceDate,
        });
        const response = await fetch(`/api/weather/tide-current?${query.toString()}`, {
          cache: "no-store",
        });
        const data = await readJsonResponse<TideCurrentPayload>(response);

        if (cancelled) return;

        if (!response.ok || data.error) {
          setTideCurrent(null);
          setTideCurrentError(data.error ?? "Unable to load tide/current predictions.");
          return;
        }

        setTideCurrent(data);
      } catch (error) {
        if (!cancelled) {
          setTideCurrent(null);
          setTideCurrentError(
            error instanceof Error ? error.message : "Unable to load tide/current predictions.",
          );
        }
      }
    }

    loadTideCurrent();

    return () => {
      cancelled = true;
    };
  }, [params.courseData.eventId, params.courseData.raceDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      const samplePoint = getFirstLegSamplePoint(params.courseData);

      if (!samplePoint) {
        if (!cancelled) {
          setForecast(null);
          setForecastError("First-leg geometry is missing, so forecast sampling is unavailable.");
          setForecastLoading(false);
        }
        return;
      }

      try {
        setForecastLoading(true);
        setForecastError(null);
        const query = new URLSearchParams({
          lat: String(samplePoint.lat),
          lon: String(samplePoint.lon),
        });
        const response = await fetch(`/api/weather/point-forecast?${query.toString()}`, {
          cache: "no-store",
        });
        const data = await readJsonResponse<PointForecastPayload>(response);

        if (cancelled) return;

        setForecast(data);
        if (data.error) {
          setForecastError(data.error);
        }
      } catch (error) {
        if (!cancelled) {
          setForecast(null);
          setForecastError(error instanceof Error ? error.message : "Forecast assist unavailable.");
        }
      } finally {
        if (!cancelled) {
          setForecastLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, [params.courseData]);

  const courseWindRead = useMemo(
    () => getCourseWindRead(params.courseId, liveWeather),
    [liveWeather, params.courseId],
  );

  const forecastDecision = useMemo<ForecastDecision>(
    () =>
      buildForecastDecision({
        courseWindRead,
        pointForecast: forecast,
      }),
    [courseWindRead, forecast],
  );

  const currentImpact = useMemo<CurrentImpactDecision>(
    () =>
      buildCurrentImpactDecision({
        courseData: params.courseData,
        tideCurrent,
        windDirectionDeg: forecastDecision.recommendedWindDirectionDeg,
      }),
    [forecastDecision.recommendedWindDirectionDeg, params.courseData, tideCurrent],
  );

  const suggestedRiskMode = useMemo<RiskMode>(
    () =>
      getSuggestedRiskMode({
        forecastDecision,
        currentImpact,
        waveHeightFt: courseWindRead.waveHeightFt,
      }),
    [courseWindRead.waveHeightFt, currentImpact, forecastDecision],
  );

  const suggestedLegType = useMemo<LegType>(
    () =>
      getLegTypeFromCourseWind(
        params.courseData.firstLeg?.bearingDeg ?? null,
        forecastDecision.recommendedWindDirectionDeg ?? undefined,
      ),
    [forecastDecision.recommendedWindDirectionDeg, params.courseData.firstLeg?.bearingDeg],
  );

  const suggestedSeaState = useMemo(
    () =>
      getSeaStateFromWind(
        Math.max(
          forecastDecision.recommendedWindKt ?? 0,
          (forecastDecision.nextThreeHourMaxGustKt ?? 0) - 2,
        ),
      ),
    [forecastDecision.nextThreeHourMaxGustKt, forecastDecision.recommendedWindKt],
  );

  const strategyAutofill = useMemo(
    () =>
      buildStrategyAutofill({
        courseId: params.courseId,
        courseData: params.courseData,
        windDirectionDeg: forecastDecision.recommendedWindDirectionDeg,
        tackAngleDeg: params.tackAngleDeg,
        forecastDecision,
        currentImpact,
        confirmedSailSelection: params.confirmedSailSelection ?? null,
      }),
    [
      currentImpact,
      forecastDecision,
      params.confirmedSailSelection,
      params.courseData,
      params.courseId,
      params.tackAngleDeg,
    ],
  );

  const sailBrief = useMemo(
    () =>
      buildSailSelectionAssistBrief({
        forecastDecision,
        currentImpact,
        suggestedRiskMode,
        suggestedLegType,
      }),
    [currentImpact, forecastDecision, suggestedLegType, suggestedRiskMode],
  );

  const strategyBrief = useMemo(
    () =>
      buildCourseStrategyAssistBrief({
        forecastDecision,
        currentImpact,
        strategyAutofill,
        confirmedSailSelection: params.confirmedSailSelection ?? null,
      }),
    [currentImpact, forecastDecision, params.confirmedSailSelection, strategyAutofill],
  );

  return {
    liveWeather,
    liveWeatherError,
    liveWeatherLoading,
    tideCurrent,
    tideCurrentError,
    forecast,
    forecastError,
    forecastLoading,
    courseWindRead,
    forecastDecision,
    currentImpact,
    suggestedRiskMode,
    suggestedLegType,
    suggestedSeaState,
    strategyAutofill,
    sailBrief,
    strategyBrief,
    isLoading: liveWeatherLoading || forecastLoading,
  };
}
