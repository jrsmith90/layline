"use client";

import type {
  CrewCount,
  HikingLevel,
  LegType,
  RiskMode,
  SeaState,
} from "@/data/logic/sailSelectionLogic";
import { getCourseCode, type CourseSummary } from "@/data/race/getCourseData";
import { getCourseStrategyDefaults } from "@/data/race/getCourseStrategyInputs";
import type { AiCoachBrief } from "@/lib/ai/coach";
import type { CourseZone } from "@/lib/race/courseStrategy/types";
import { wrap360 } from "@/lib/race/courseTracker";
import { formatPlannedRaceStartLabel } from "@/lib/race/plannedRaceStart";
import {
  getCoachReferencePolicy,
  getCourseStrategyReferencePolicy,
} from "@/lib/reference/decisionBasis";
import { buildWaterSetupAssessment } from "@/lib/weather/logic/waterSetup";
import type { CurrentReading, TideReading } from "@/types/current";

export type WeatherTrend = "building" | "easing" | "steady" | "unknown";
export type CurrentEffectLevel = "high" | "medium" | "low" | "unknown";

export type ConfirmedSailSelectionSummary = {
  courseId: string;
  confirmedAtISO: string;
  forecastWindKt: number;
  seaState: SeaState;
  crewCount: CrewCount;
  hikingLevel: HikingLevel;
  legType: LegType;
  riskMode: RiskMode;
  confidence: "High" | "Medium" | "Low";
  finalCall: string;
  mainChoice: string;
  headsailChoice?: string;
  spinnakerChoice?: string;
  reefCall: string;
  coachSummary?: string;
  forecastSummary?: string;
  currentEffectSummary?: string;
  currentEffectLevel?: CurrentEffectLevel;
};

export type LiveWeatherPayload = {
  stationName?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  historyTrend?: {
    trend: WeatherTrend;
  };
  cbibsAnnapolis?: {
    platformName?: string;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
    waveHeightFt?: number;
    wavePeriodSec?: number;
  };
  thomasPoint?: {
    stationName?: string;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
    trend?: {
      trend: WeatherTrend;
    };
  };
  error?: string;
};

export type CourseWindRead = {
  sourceId: "thomas_point_wind" | "annapolis_buoy_wind" | "naval_academy_wind";
  sourceLabel: string;
  courseFit: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  trend?: WeatherTrend;
  waveHeightFt?: number;
};

export type PointForecastPayload = {
  available: boolean;
  lat: number;
  lon: number;
  fetchedAt?: string;
  current?: {
    windAvgKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
  } | null;
  hourly?: Array<{
    timeISO: string;
    windAvgKts?: number;
    windGustKts?: number;
    windDirectionDeg?: number;
  }>;
  error?: string;
};

type CurrentDirection = "flood" | "ebb" | "slack" | "unknown";

export type CurrentStationSnapshot = {
  stationId: string;
  label: string;
  lat: number;
  lon: number;
  role: string;
  time: string;
  displayTime: string;
  direction: CurrentDirection;
  directionDeg: number | null;
  speedKt: number;
  signedVelocityKt: number | null;
  strength: "weak" | "moderate" | "strong";
  nextSlackTime: string | null;
  source: string;
};

export type TideCurrentPayload = {
  date: string;
  eventId?: string;
  generatedAt: string;
  source?: string;
  tide: {
    stage?: string;
    heightFt?: number | null;
    displayTime?: string;
  };
  currentStations: CurrentStationSnapshot[];
  snapshots?: Array<{
    time: string;
    displayTime: string;
    tide: {
      heightFt?: number | null;
    };
    currents: CurrentStationSnapshot[];
  }>;
  error?: string;
};

export type CurrentImpactDecision = {
  level: CurrentEffectLevel;
  hasMeaningfulEffect: boolean;
  summary: string;
  reasoning: string[];
  betterWaterSide: "left" | "right" | "even" | "unknown";
  stationLabel?: string;
  stationDisplayTime?: string;
  stationSpeedKt?: number | null;
  tideStage?: string | null;
};

export type ForecastDecision = {
  available: boolean;
  sourceLabel: string;
  recommendedWindKt: number | null;
  recommendedWindDirectionDeg: number | null;
  nextThreeHourAvgWindKt: number | null;
  nextThreeHourMaxGustKt: number | null;
  directionSpreadDeg: number | null;
  directionShiftDeg: number | null;
  trend: WeatherTrend;
  confidence: "high" | "medium" | "low";
  summary: string;
};

export type StrategyAutofill = {
  zones: CourseZone[];
  strategyNotes: string;
  referenceBasis: string[];
};

export type ZoneCurrentDecision = {
  zoneId: string;
  currentEffect: CourseZone["currentEffect"];
  summary: string;
  stationLabels: string[];
  timeWindowLabel: string | null;
  averageAssistKt: number | null;
};

export type ZoneCurrentDecisionMap = Record<string, ZoneCurrentDecision>;

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function circularAverageDeg(values: number[]) {
  if (values.length === 0) return null;

  const radians = values.map((value) => (value * Math.PI) / 180);
  const vector = radians.reduce(
    (accumulator, value) => ({
      x: accumulator.x + Math.cos(value),
      y: accumulator.y + Math.sin(value),
    }),
    { x: 0, y: 0 },
  );

  if (Math.abs(vector.x) < 0.0001 && Math.abs(vector.y) < 0.0001) {
    return null;
  }

  return wrap360((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
}

function angleDiffDeg(fromDeg: number, toDeg: number) {
  let diff = wrap360(toDeg - fromDeg);
  if (diff > 180) diff -= 360;
  return diff;
}

function formatSignedDegrees(value: number | null) {
  if (value == null) return null;
  const rounded = Math.round(value);
  if (rounded === 0) return "steady direction";
  return `${rounded > 0 ? "+" : ""}${rounded} deg`;
}

function directionLabel(direction: CurrentDirection) {
  if (direction === "flood") return "flood";
  if (direction === "ebb") return "ebb";
  if (direction === "slack") return "slack";
  return "unknown";
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function parseClockMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function toLocalNm(origin: { lat: number; lon: number }, point: { lat: number; lon: number }) {
  return {
    x: (point.lon - origin.lon) * 60 * Math.cos(toRadians(origin.lat)),
    y: (point.lat - origin.lat) * 60,
  };
}

function haversineNm(
  pointA: { lat: number; lon: number },
  pointB: { lat: number; lon: number },
) {
  const earthRadiusNm = 3440.065;
  const latDiff = toRadians(pointB.lat - pointA.lat);
  const lonDiff = toRadians(pointB.lon - pointA.lon);
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRadians(pointA.lat)) *
      Math.cos(toRadians(pointB.lat)) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2);
  return earthRadiusNm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function alongTrackAssistKt(legBearingDeg: number, directionDeg: number, speedKt: number) {
  return speedKt * Math.cos(toRadians(angleDiffDeg(legBearingDeg, directionDeg)));
}

export function getSeaStateFromWind(wind: number): SeaState {
  if (wind <= 0) return "calm_0";
  if (wind <= 3) return "light_air_1_3";
  if (wind <= 6) return "light_breeze_4_6";
  if (wind <= 10) return "gentle_breeze_7_10";
  if (wind <= 16) return "moderate_breeze_11_16";
  if (wind <= 21) return "fresh_breeze_17_21";
  return "strong_breeze_22_27";
}

export function getLegTypeFromCourseWind(
  firstLegBearingDeg: number | null,
  windDirectionDeg?: number,
): LegType {
  if (firstLegBearingDeg == null || typeof windDirectionDeg !== "number") {
    return "upwind";
  }

  const angle = Math.abs(((firstLegBearingDeg - windDirectionDeg + 540) % 360) - 180);
  return angle >= 105 ? "downwind" : "upwind";
}

export function mapWeatherTrendToPlanningText(trend?: WeatherTrend): string {
  if (trend === "building") return "Building";
  if (trend === "easing") return "Easing";
  if (trend === "steady") return "Steady";
  return "Unclear";
}

export function getPlanningWindFromTrend(windAvgKt?: number, trend?: WeatherTrend) {
  if (typeof windAvgKt !== "number") return undefined;

  const trendOffset = trend === "building" ? 1.5 : trend === "easing" ? -1 : 0;
  return Number(Math.max(0, windAvgKt + trendOffset).toFixed(1));
}

function getCourseWindSourceId(courseId: string): CourseWindRead["sourceId"] {
  const courseCode = getCourseCode(courseId);

  if (courseCode === "1" || courseCode === "1R") return "thomas_point_wind";
  if (courseCode === "99") return "naval_academy_wind";
  return "annapolis_buoy_wind";
}

export function getCourseWindRead(
  courseId: string,
  weather: LiveWeatherPayload | null,
): CourseWindRead {
  const sourceId = getCourseWindSourceId(courseId);

  if (sourceId === "annapolis_buoy_wind") {
    return {
      sourceId,
      sourceLabel: weather?.cbibsAnnapolis?.platformName ?? "Annapolis CBIBS Buoy",
      courseFit:
        "Closest default for top-of-course pressure, Annapolis buoy wind, and wave state.",
      windAvgKt: weather?.cbibsAnnapolis?.windAvgKt,
      windGustKt: weather?.cbibsAnnapolis?.windGustKt,
      windDirectionDeg: weather?.cbibsAnnapolis?.windDirectionDeg,
      trend: weather?.historyTrend?.trend,
      waveHeightFt: weather?.cbibsAnnapolis?.waveHeightFt,
    };
  }

  if (sourceId === "naval_academy_wind") {
    return {
      sourceId,
      sourceLabel: weather?.stationName ?? "Naval Academy / KNAK",
      courseFit:
        "Best available default for custom or river-influenced racing until a closer source is selected.",
      windAvgKt: weather?.windAvgKt,
      windGustKt: weather?.windGustKt,
      windDirectionDeg: weather?.windDirectionDeg,
      trend: weather?.historyTrend?.trend,
    };
  }

  return {
    sourceId,
    sourceLabel: weather?.thomasPoint?.stationName ?? "Thomas Point / TPLM2",
    courseFit: "Closest default for bottom-of-course open-Bay pressure.",
    windAvgKt: weather?.thomasPoint?.windAvgKt,
    windGustKt: weather?.thomasPoint?.windGustKt,
    windDirectionDeg: weather?.thomasPoint?.windDirectionDeg,
    trend: weather?.thomasPoint?.trend?.trend,
  };
}

export function formatCourseWindRead(read: CourseWindRead) {
  if (typeof read.windAvgKt !== "number") return "Live wind loading...";

  return `${read.sourceLabel}: ${read.windAvgKt.toFixed(1)} kt${
    read.windGustKt != null ? `, gust ${read.windGustKt.toFixed(1)} kt` : ""
  }${
    read.windDirectionDeg != null ? ` from ${Math.round(read.windDirectionDeg)} deg` : ""
  } · ${mapWeatherTrendToPlanningText(read.trend)}`;
}

export function getFirstLegSamplePoint(courseData: CourseSummary) {
  const firstLeg = courseData.firstLeg;
  if (!firstLeg) return null;

  const fromMark = courseData.marks[firstLeg.fromMark];
  const toMark = courseData.marks[firstLeg.toMark];

  if (
    !fromMark ||
    !toMark ||
    typeof fromMark.lat !== "number" ||
    typeof fromMark.lon !== "number" ||
    typeof toMark.lat !== "number" ||
    typeof toMark.lon !== "number"
  ) {
    return null;
  }

  return {
    lat: Number(((fromMark.lat + toMark.lat) / 2).toFixed(6)),
    lon: Number(((fromMark.lon + toMark.lon) / 2).toFixed(6)),
    label: `${firstLeg.fromMark}-${firstLeg.toMark} midpoint`,
  };
}

export function buildForecastDecision(params: {
  courseWindRead: CourseWindRead;
  pointForecast: PointForecastPayload | null;
  plannedStartISO?: string | null;
  plannedStartDate?: string | null;
  plannedStartTime?: string | null;
}): ForecastDecision {
  const livePlanningWind = getPlanningWindFromTrend(
    params.courseWindRead.windAvgKt,
    params.courseWindRead.trend,
  );

  const hourly = (params.pointForecast?.hourly ?? [])
    .filter(
      (entry) =>
        typeof entry.windAvgKts === "number" ||
        typeof entry.windGustKts === "number" ||
        typeof entry.windDirectionDeg === "number",
    )
    .sort((left, right) => left.timeISO.localeCompare(right.timeISO));
  const plannedStartLabel = formatPlannedRaceStartLabel(
    params.plannedStartDate,
    params.plannedStartTime,
  );
  const plannedStartMs =
    typeof params.plannedStartISO === "string" ? Date.parse(params.plannedStartISO) : NaN;
  const hasPlannedStart = Number.isFinite(plannedStartMs);
  const lastForecastMs = hourly.length > 0 ? Date.parse(hourly[hourly.length - 1].timeISO) : NaN;
  const firstForecastIndexAtOrAfter =
    hasPlannedStart
      ? hourly.findIndex((entry) => {
          const entryMs = Date.parse(entry.timeISO);
          return Number.isFinite(entryMs) && entryMs >= plannedStartMs;
        })
      : -1;
  const forecastWindow =
    hasPlannedStart && firstForecastIndexAtOrAfter !== -1
      ? hourly.slice(firstForecastIndexAtOrAfter, firstForecastIndexAtOrAfter + 3)
      : hasPlannedStart && hourly.length > 0
        ? hourly.slice(Math.max(0, hourly.length - 3))
        : hourly.slice(0, 3);
  const avgWind = average(
    forecastWindow
      .map((entry) => entry.windAvgKts)
      .filter((value): value is number => typeof value === "number"),
  );
  const maxGust = forecastWindow.reduce<number | null>((highest, entry) => {
    if (typeof entry.windGustKts !== "number") return highest;
    return highest == null ? entry.windGustKts : Math.max(highest, entry.windGustKts);
  }, null);
  const directionValues = forecastWindow
    .map((entry) => entry.windDirectionDeg)
    .filter((value): value is number => typeof value === "number");
  const prevailingDirection = circularAverageDeg(directionValues);
  const directionSpread =
    prevailingDirection == null || directionValues.length === 0
      ? null
      : Math.max(
          ...directionValues.map((value) =>
            Math.abs(angleDiffDeg(prevailingDirection, value)),
          ),
        );
  const directionShift =
    prevailingDirection != null && typeof params.courseWindRead.windDirectionDeg === "number"
      ? angleDiffDeg(params.courseWindRead.windDirectionDeg, prevailingDirection)
      : null;

  const recommendedWind =
    livePlanningWind != null && avgWind != null
      ? Number(((livePlanningWind * 0.6 + avgWind * 0.4)).toFixed(1))
      : avgWind != null
        ? Number(avgWind.toFixed(1))
        : livePlanningWind != null
          ? livePlanningWind
          : null;

  const trend: WeatherTrend =
    recommendedWind != null && typeof params.courseWindRead.windAvgKt === "number"
      ? recommendedWind >= params.courseWindRead.windAvgKt + 1.5
        ? "building"
        : recommendedWind <= params.courseWindRead.windAvgKt - 1
          ? "easing"
          : params.courseWindRead.trend ?? "steady"
      : params.courseWindRead.trend ?? "unknown";

  const confidence: ForecastDecision["confidence"] =
    recommendedWind == null
      ? "low"
      : avgWind != null && directionSpread != null
        ? directionSpread > 20
          ? "low"
          : directionSpread > 12
            ? "medium"
            : "high"
        : "medium";

  if (!params.pointForecast?.available || hourly.length === 0) {
    return {
      available: false,
      sourceLabel: "Live wind only",
      recommendedWindKt: recommendedWind,
      recommendedWindDirectionDeg: params.courseWindRead.windDirectionDeg ?? null,
      nextThreeHourAvgWindKt: null,
      nextThreeHourMaxGustKt: null,
      directionSpreadDeg: null,
      directionShiftDeg: null,
      trend,
      confidence: recommendedWind == null ? "low" : "medium",
      summary:
        recommendedWind == null
          ? plannedStartLabel
            ? `Forecast assist is unavailable for the planned start at ${plannedStartLabel}, so the coach only has the live course wind read.`
            : "Forecast assist is unavailable, so the coach only has the live course wind read."
          : plannedStartLabel
            ? `Forecast assist is unavailable for the planned start at ${plannedStartLabel}, so the coach is leaning on the live course wind read only: plan around about ${recommendedWind.toFixed(
                1,
              )} kt and keep the broader picture flexible.`
            : `Using the live course wind read only: plan around about ${recommendedWind.toFixed(
                1,
              )} kt and keep the broader picture flexible.`,
    };
  }

  const shiftCopy = formatSignedDegrees(directionShift);
  const plannedStartBeyondForecastRange =
    hasPlannedStart &&
    Number.isFinite(lastForecastMs) &&
    plannedStartMs > lastForecastMs + 60 * 60 * 1000;
  const summaryLead = plannedStartLabel
    ? plannedStartBeyondForecastRange
      ? `The planned start at ${plannedStartLabel} sits beyond the detailed hourly forecast, so this uses the latest available forecast window.`
      : `For the planned start at ${plannedStartLabel},`
    : null;

  return {
    available: true,
    sourceLabel: "Live wind + NOAA/NWS hourly first-leg forecast",
    recommendedWindKt: recommendedWind,
    recommendedWindDirectionDeg: prevailingDirection ?? params.courseWindRead.windDirectionDeg ?? null,
    nextThreeHourAvgWindKt: avgWind == null ? null : Number(avgWind.toFixed(1)),
    nextThreeHourMaxGustKt: maxGust == null ? null : Number(maxGust.toFixed(1)),
    directionSpreadDeg: directionSpread == null ? null : Number(directionSpread.toFixed(0)),
    directionShiftDeg: directionShift == null ? null : Number(directionShift.toFixed(0)),
    trend,
    confidence,
    summary: [
      summaryLead,
      recommendedWind != null
        ? `Plan around about ${recommendedWind.toFixed(1)} kt`
        : "Planning wind is still unclear",
      avgWind != null ? `with the forecast window averaging ${avgWind.toFixed(1)} kt` : null,
      maxGust != null ? `and gusts reaching ${maxGust.toFixed(1)} kt` : null,
      shiftCopy ? `while the direction bias looks ${shiftCopy}` : null,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" "),
  };
}

function pickNearestCurrentStation(
  courseData: CourseSummary,
  tideCurrent: TideCurrentPayload | null,
) {
  const samplePoint = getFirstLegSamplePoint(courseData);
  if (!samplePoint || !tideCurrent || tideCurrent.currentStations.length === 0) {
    return null;
  }

  return [...tideCurrent.currentStations]
    .map((station) => ({
      station,
      distanceNm: haversineNm(samplePoint, station),
    }))
    .sort((left, right) => left.distanceNm - right.distanceNm)[0]?.station ?? null;
}

export function buildCurrentImpactDecision(params: {
  courseData: CourseSummary;
  tideCurrent: TideCurrentPayload | null;
  windDirectionDeg?: number | null;
}): CurrentImpactDecision {
  const station = pickNearestCurrentStation(params.courseData, params.tideCurrent);
  const tideStage = params.tideCurrent?.tide.stage ?? null;

  if (!station) {
    return {
      level: "unknown",
      hasMeaningfulEffect: false,
      summary: "Current effect is still unclear because no nearby prediction is loaded yet.",
      reasoning: ["No nearby NOAA current station could be matched to the first leg."],
      betterWaterSide: "unknown",
      tideStage,
    };
  }

  const currentReading: CurrentReading = {
    sourceId: station.stationId,
    stationId: station.stationId,
    direction: station.direction,
    speedKt: station.speedKt,
    strength: station.strength,
    nextSlackTime: station.nextSlackTime ?? undefined,
    notes: station.role,
  };

  const tideReading: TideReading = {
    sourceId: "noaa-tide",
    stationId: "8575512",
    stage:
      tideStage === "rising" ||
      tideStage === "falling" ||
      tideStage === "high" ||
      tideStage === "low"
        ? tideStage
        : undefined,
    heightFt: params.tideCurrent?.tide.heightFt ?? undefined,
  };

  const assessment = buildWaterSetupAssessment({
    currentReading,
    tideReading,
    windDirectionDeg:
      typeof params.windDirectionDeg === "number" ? params.windDirectionDeg : undefined,
  });

  const speed = station.speedKt;
  const level: CurrentEffectLevel =
    station.direction === "unknown"
      ? "unknown"
      : speed >= 1.2 || assessment.edgeStrength === "strong"
        ? "high"
        : speed >= 0.7 || assessment.edgeStrength === "medium"
          ? "medium"
          : speed >= 0.15 || assessment.edgeStrength === "small"
            ? "low"
            : "unknown";

  const hasMeaningfulEffect = level === "high" || level === "medium";
  const summary =
    level === "high"
      ? `Current is likely to matter on the first leg near ${station.label}: ${directionLabel(
          station.direction,
        )} flow around ${station.speedKt.toFixed(1)} kt.`
      : level === "medium"
        ? `Current could shape lanes and water texture near ${station.label}: ${directionLabel(
            station.direction,
          )} flow around ${station.speedKt.toFixed(1)} kt.`
        : level === "low"
          ? `Current looks minor right now near ${station.label}, so pressure and angle should carry more weight.`
          : `Current effect is still unclear near ${station.label}.`;

  return {
    level,
    hasMeaningfulEffect,
    summary,
    reasoning: assessment.reasoning.slice(0, 3),
    betterWaterSide: assessment.betterWaterSide,
    stationLabel: station.label,
    stationDisplayTime: station.displayTime,
    stationSpeedKt: station.speedKt,
    tideStage,
  };
}

export function getSuggestedRiskMode(params: {
  forecastDecision: ForecastDecision;
  currentImpact: CurrentImpactDecision;
  waveHeightFt?: number;
}): RiskMode {
  const coachPolicy = getCoachReferencePolicy({
    mode: "pre_race",
    action:
      params.currentImpact.level === "high" || params.forecastDecision.confidence === "low"
        ? "stay_flexible"
        : "hold_course",
    hasDirectionalPlan:
      params.forecastDecision.confidence === "high" && params.currentImpact.level !== "high",
    confidenceFragile:
      params.forecastDecision.confidence !== "high" || params.currentImpact.level === "high",
  });

  if (
    params.currentImpact.level === "high" ||
    (params.forecastDecision.nextThreeHourMaxGustKt ?? 0) >= 22 ||
    (params.forecastDecision.directionSpreadDeg ?? 0) >= 18 ||
    (params.waveHeightFt ?? 0) >= 2.5 ||
    (coachPolicy.preferFlexibility &&
      (params.forecastDecision.confidence === "low" ||
        params.currentImpact.level === "medium"))
  ) {
    return "conservative";
  }

  return "max_performance";
}

function selectCurrentSnapshotWindow(tideCurrent: TideCurrentPayload | null) {
  const snapshots = tideCurrent?.snapshots ?? [];
  if (snapshots.length === 0) return [];

  const targetTime = tideCurrent?.currentStations[0]?.time ?? snapshots[0]?.time ?? null;
  const targetMinutes = parseClockMinutes(targetTime);

  if (targetMinutes == null) {
    return snapshots.slice(0, Math.min(3, snapshots.length));
  }

  const withDistance = snapshots.map((snapshot, index) => ({
    snapshot,
    index,
    distance:
      Math.abs((parseClockMinutes(snapshot.time) ?? targetMinutes) - targetMinutes),
  }));
  const nearest = [...withDistance].sort((left, right) => left.distance - right.distance)[0];
  const startIndex = nearest?.index ?? 0;

  if (startIndex <= snapshots.length - 3) {
    return snapshots.slice(startIndex, startIndex + 3);
  }

  return snapshots.slice(Math.max(0, snapshots.length - 3));
}

function zoneCurrentEffectFromScores(params: {
  zoneId: string;
  ownScore: number | null;
  otherScore: number | null;
  currentImpact: CurrentImpactDecision;
}) {
  const ownScore = params.ownScore;
  const otherScore = params.otherScore;
  const scoreDiff =
    ownScore != null && otherScore != null ? Number((ownScore - otherScore).toFixed(2)) : null;

  if (scoreDiff != null) {
    if (scoreDiff >= 0.12) return "favorable" as const;
    if (scoreDiff <= -0.12) return "adverse" as const;
  }

  if (params.currentImpact.level === "low") {
    return "neutral" as const;
  }

  const betterWaterSide = params.currentImpact.betterWaterSide;
  if (
    (betterWaterSide === "left" && params.zoneId === "port") ||
    (betterWaterSide === "right" && params.zoneId === "starboard")
  ) {
    return "favorable" as const;
  }

  if (
    (betterWaterSide === "left" && params.zoneId === "starboard") ||
    (betterWaterSide === "right" && params.zoneId === "port")
  ) {
    return "adverse" as const;
  }

  return params.currentImpact.level === "unknown" ? "unknown" : "neutral";
}

export function buildZoneCurrentDecisions(params: {
  courseData: CourseSummary;
  tideCurrent: TideCurrentPayload | null;
  currentImpact: CurrentImpactDecision;
}): ZoneCurrentDecisionMap {
  const decisions: ZoneCurrentDecisionMap = {};
  const firstLeg = params.courseData.firstLeg;

  const fallbackWindowLabel = params.currentImpact.stationDisplayTime ?? null;
  const fallbackSummary = params.currentImpact.summary;

  if (!firstLeg) {
    for (const zoneId of ["port", "starboard"]) {
      decisions[zoneId] = {
        zoneId,
        currentEffect: zoneCurrentEffectForSide(zoneId, params.currentImpact),
        summary: fallbackSummary,
        stationLabels: params.currentImpact.stationLabel ? [params.currentImpact.stationLabel] : [],
        timeWindowLabel: fallbackWindowLabel,
        averageAssistKt: null,
      };
    }

    return decisions;
  }

  const fromMark = params.courseData.marks[firstLeg.fromMark];
  const toMark = params.courseData.marks[firstLeg.toMark];

  if (
    !fromMark ||
    !toMark ||
    typeof fromMark.lat !== "number" ||
    typeof fromMark.lon !== "number" ||
    typeof toMark.lat !== "number" ||
    typeof toMark.lon !== "number"
  ) {
    for (const zoneId of ["port", "starboard"]) {
      decisions[zoneId] = {
        zoneId,
        currentEffect: zoneCurrentEffectForSide(zoneId, params.currentImpact),
        summary: fallbackSummary,
        stationLabels: params.currentImpact.stationLabel ? [params.currentImpact.stationLabel] : [],
        timeWindowLabel: fallbackWindowLabel,
        averageAssistKt: null,
      };
    }

    return decisions;
  }

  const snapshots = selectCurrentSnapshotWindow(params.tideCurrent);
  if (snapshots.length === 0) {
    for (const zoneId of ["port", "starboard"]) {
      decisions[zoneId] = {
        zoneId,
        currentEffect: zoneCurrentEffectForSide(zoneId, params.currentImpact),
        summary: fallbackSummary,
        stationLabels: params.currentImpact.stationLabel ? [params.currentImpact.stationLabel] : [],
        timeWindowLabel: fallbackWindowLabel,
        averageAssistKt: null,
      };
    }

    return decisions;
  }

  const start = { lat: fromMark.lat, lon: fromMark.lon };
  const finish = { lat: toMark.lat, lon: toMark.lon };
  const legVector = toLocalNm(start, finish);
  const legLength = Math.max(0.001, Math.hypot(legVector.x, legVector.y));
  const midPoint = {
    lat: Number(((fromMark.lat + toMark.lat) / 2).toFixed(6)),
    lon: Number(((fromMark.lon + toMark.lon) / 2).toFixed(6)),
  };

  const aggregates: Record<
    "port" | "starboard",
    {
      scoreSum: number;
      weightSum: number;
      stations: Set<string>;
    }
  > = {
    port: { scoreSum: 0, weightSum: 0, stations: new Set<string>() },
    starboard: { scoreSum: 0, weightSum: 0, stations: new Set<string>() },
  };

  for (const snapshot of snapshots) {
    for (const station of snapshot.currents) {
      if (
        typeof station.lat !== "number" ||
        typeof station.lon !== "number" ||
        typeof station.directionDeg !== "number" ||
        !Number.isFinite(station.speedKt)
      ) {
        continue;
      }

      const stationVector = toLocalNm(start, station);
      const cross = legVector.x * stationVector.y - legVector.y * stationVector.x;
      const crossTrackNm = cross / legLength;
      const side =
        Math.abs(crossTrackNm) <= 0.2
          ? "center"
          : crossTrackNm > 0
            ? "port"
            : "starboard";
      const distanceWeight = 1 / Math.max(0.35, haversineNm(midPoint, station));
      const assistKt = alongTrackAssistKt(firstLeg.bearingDeg, station.directionDeg, station.speedKt);

      if (side === "center" || side === "port") {
        aggregates.port.scoreSum += assistKt * distanceWeight;
        aggregates.port.weightSum += distanceWeight;
        aggregates.port.stations.add(station.label);
      }

      if (side === "center" || side === "starboard") {
        aggregates.starboard.scoreSum += assistKt * distanceWeight;
        aggregates.starboard.weightSum += distanceWeight;
        aggregates.starboard.stations.add(station.label);
      }
    }
  }

  const portScore =
    aggregates.port.weightSum > 0 ? Number((aggregates.port.scoreSum / aggregates.port.weightSum).toFixed(2)) : null;
  const starboardScore =
    aggregates.starboard.weightSum > 0
      ? Number((aggregates.starboard.scoreSum / aggregates.starboard.weightSum).toFixed(2))
      : null;
  const timeWindowLabel =
    snapshots.length > 1
      ? `${snapshots[0]?.displayTime ?? snapshots[0]?.time} to ${
          snapshots[snapshots.length - 1]?.displayTime ?? snapshots[snapshots.length - 1]?.time
        }`
      : snapshots[0]?.displayTime ?? snapshots[0]?.time ?? null;

  for (const zoneId of ["port", "starboard"] as const) {
    const ownScore = zoneId === "port" ? portScore : starboardScore;
    const otherScore = zoneId === "port" ? starboardScore : portScore;
    const stationLabels = [...aggregates[zoneId].stations];
    const currentEffect = zoneCurrentEffectFromScores({
      zoneId,
      ownScore,
      otherScore,
      currentImpact: params.currentImpact,
    });

    const comparativeCopy =
      ownScore != null && otherScore != null
        ? `Average along-leg current is ${
            ownScore >= 0 ? "+" : ""
          }${ownScore.toFixed(2)} kt here versus ${
            otherScore >= 0 ? "+" : ""
          }${otherScore.toFixed(2)} kt on the opposite side.`
        : fallbackSummary;

    const decisionCopy =
      currentEffect === "favorable"
        ? "Current table edge favors this zone if the wind picture stays close."
        : currentEffect === "adverse"
          ? "Current table edge works against this zone if the wind picture stays close."
          : currentEffect === "neutral"
            ? "Current table spread does not separate the zones much right now."
            : "Current table decision is still too soft to separate the zones cleanly.";

    decisions[zoneId] = {
      zoneId,
      currentEffect,
      summary: [
        timeWindowLabel ? `NOAA current table ${timeWindowLabel}.` : null,
        stationLabels.length > 0 ? `Using ${stationLabels.slice(0, 3).join(", ")}.` : null,
        comparativeCopy,
        decisionCopy,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" "),
      stationLabels,
      timeWindowLabel,
      averageAssistKt: ownScore,
    };
  }

  return decisions;
}

function zoneCurrentEffectForSide(
  sideId: string,
  currentImpact: CurrentImpactDecision,
): CourseZone["currentEffect"] {
  if (!currentImpact.hasMeaningfulEffect) {
    return currentImpact.level === "low" ? "neutral" : "unknown";
  }

  const prefersStarboard = currentImpact.betterWaterSide === "right";
  const prefersPort = currentImpact.betterWaterSide === "left";

  if (prefersStarboard) {
    return sideId === "starboard" ? "favorable" : "adverse";
  }

  if (prefersPort) {
    return sideId === "port" ? "favorable" : "adverse";
  }

  return "neutral";
}

export function buildStrategyAutofill(params: {
  courseId: string;
  courseData: CourseSummary;
  windDirectionDeg: number | null;
  tackAngleDeg: number;
  forecastDecision: ForecastDecision;
  currentImpact: CurrentImpactDecision;
  zoneCurrentDecisions: ZoneCurrentDecisionMap;
  confirmedSailSelection?: ConfirmedSailSelectionSummary | null;
}): StrategyAutofill {
  const defaults = getCourseStrategyDefaults(
    params.courseId,
    params.courseData,
    params.windDirectionDeg,
    params.tackAngleDeg,
  );

  const windShiftRisk: CourseZone["windShiftRisk"] =
    params.forecastDecision.directionSpreadDeg == null
      ? "unknown"
      : params.forecastDecision.directionSpreadDeg >= 20
        ? "high"
        : params.forecastDecision.directionSpreadDeg >= 12
          ? "moderate"
          : "low";

  const zones = defaults.zones.map((zone) => {
    const zoneId = zone.id.toLowerCase();
    const sideLabel =
      zoneId === "port"
        ? "Watch the left-side lane for local bends, holes, and rebound."
        : "Watch the right-side lane for cleaner pressure and persistent shift shape.";

    const currentDecision = params.zoneCurrentDecisions[zoneId];
    const currentEffect =
      currentDecision?.currentEffect ?? zoneCurrentEffectForSide(zoneId, params.currentImpact);
    const currentNote =
      currentDecision?.summary ??
      (currentEffect === "favorable"
        ? "Current likely helps this side break ties if the wind picture is close."
        : currentEffect === "adverse"
          ? "Current likely taxes this side if the wind picture is close."
          : params.currentImpact.level === "low"
            ? "Current looks secondary here unless the lane picture gets very even."
            : "Current effect still needs visual confirmation on this side.");

    return {
      ...zone,
      windShiftRisk,
      windShiftLocation: sideLabel,
      currentEffect,
      notes: `${currentNote} ${params.forecastDecision.summary}`.trim(),
    };
  });

  const strategyNotes = [
    params.confirmedSailSelection
      ? `Confirmed sail call: ${params.confirmedSailSelection.finalCall}`
      : null,
    params.forecastDecision.summary,
    params.currentImpact.summary,
  ];
  const referencePolicy = getCourseStrategyReferencePolicy(zones);

  strategyNotes.push(
    referencePolicy.preferFlexibility
      ? "Reference playbook says to keep the first move flexible until the real lane picture confirms the edge."
      : referencePolicy.phaseOverCorners
        ? "Reference playbook says to stay in phase with the shifts before stretching leverage."
        : "If the first few minutes match this picture, commit earlier to the cleaner lane.",
  );

  if (referencePolicy.currentBreaksTies) {
    strategyNotes.push("If both lanes stay close in pressure, let current break the tie.");
  }

  return {
    zones,
    strategyNotes: strategyNotes
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    referenceBasis: referencePolicy.basis,
  };
}

export function buildSailSelectionAssistBrief(params: {
  forecastDecision: ForecastDecision;
  currentImpact: CurrentImpactDecision;
  suggestedRiskMode: RiskMode;
  suggestedLegType: LegType;
}): AiCoachBrief {
  const fragile =
    params.forecastDecision.confidence !== "high" || params.currentImpact.level === "high";
  const coachPolicy = getCoachReferencePolicy({
    mode: "pre_race",
    action: fragile ? "stay_flexible" : "hold_course",
    hasDirectionalPlan: !fragile,
    confidenceFragile: fragile,
  });

  return {
    eyebrow: "AI Coach Lane",
    title:
      params.suggestedRiskMode === "conservative"
        ? "Protect the setup before you lock the sail call"
        : "The sail call picture looks stable enough to confirm",
    summary: params.forecastDecision.summary,
    bullets: [
      `Opening leg read: ${params.suggestedLegType === "upwind" ? "Upwind" : "Downwind"}.`,
      `Suggested mode: ${
        params.suggestedRiskMode === "conservative" ? "Conservative" : "Max performance"
      }.`,
      params.currentImpact.summary,
    ],
    footer:
      "Apply the coach autofill if this matches what you are seeing, then confirm the sail package and move straight into Step 3.",
    tone:
      params.currentImpact.level === "high" || params.forecastDecision.confidence === "low"
        ? "warning"
        : params.suggestedRiskMode === "conservative"
          ? "focus"
          : "positive",
    readiness: params.forecastDecision.recommendedWindKt == null ? "watch" : "ready",
    referenceBasis: coachPolicy.basis,
  };
}

export function buildCourseStrategyAssistBrief(params: {
  forecastDecision: ForecastDecision;
  currentImpact: CurrentImpactDecision;
  strategyAutofill: StrategyAutofill;
  confirmedSailSelection?: ConfirmedSailSelectionSummary | null;
}): AiCoachBrief {
  const fragile =
    params.forecastDecision.confidence !== "high" ||
    params.currentImpact.level === "high" ||
    params.strategyAutofill.zones.some((zone) => zone.windShiftRisk === "high");
  const coachPolicy = getCoachReferencePolicy({
    mode: "pre_race",
    action: fragile ? "stay_flexible" : "hold_course",
    hasDirectionalPlan: !fragile,
    confidenceFragile: fragile,
  });

  return {
    eyebrow: "AI Coach Lane",
    title: fragile
      ? "Auto-fill the opening plan, but keep your first move adjustable"
      : "Auto-fill is ready for a cleaner Step 3 lock-in",
    summary: params.forecastDecision.summary,
    bullets: [
      params.currentImpact.summary,
      params.confirmedSailSelection
        ? `Confirmed sail package: ${params.confirmedSailSelection.finalCall}`
        : "No sail package is confirmed yet, so keep the strategy broad enough to survive a setup change.",
      fragile
        ? "The coach will seed headings, current tags, and notes, but the first few minutes still need human confirmation."
        : "The coach sees a stable enough picture to prefill the zone plan before you save it.",
    ],
    footer:
      "Use the auto-fill to seed Step 3, then review the zone notes and lock the strategy that still matches the real course-side picture.",
    tone: fragile ? "focus" : "positive",
    readiness: params.forecastDecision.recommendedWindKt == null ? "watch" : "ready",
    referenceBasis:
      params.strategyAutofill.referenceBasis.length > 0
        ? params.strategyAutofill.referenceBasis
        : coachPolicy.basis,
  };
}
