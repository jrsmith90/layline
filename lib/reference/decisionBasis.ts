import type {
  CurrentSide,
  EdgeStrength,
  OpeningLegType,
  PressureSide,
  WindTrend,
} from "@/data/race/getRouteBiasInputs";
import type { CourseZone } from "@/lib/race/courseStrategy/types";
import {
  STRATEGY_REFERENCE_CATALOG,
  type ReferenceBasisKey,
} from "@/lib/reference/generatedStrategyReferences";

function formatCitation(key: ReferenceBasisKey) {
  const entry = STRATEGY_REFERENCE_CATALOG[key];
  return entry.sources
    .map((source) => {
      const referenceLabel = /^Chapter\s/iu.test(source.sourceFile) ? "NS" : "DDB";
      return `${referenceLabel} p.${source.page}`;
    })
    .join("; ");
}

function uniqueBasis(keys: ReferenceBasisKey[], limit: number) {
  const basis: string[] = [];
  const seen = new Set<ReferenceBasisKey>();

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    basis.push(`${STRATEGY_REFERENCE_CATALOG[key].summary} (${formatCitation(key)})`);
    if (basis.length >= limit) break;
  }

  return basis;
}

function hasClearCurrentSignal(currentSide: CurrentSide) {
  return currentSide !== "even" && currentSide !== "unclear";
}

function isUnclearPressure(pressureSide: PressureSide) {
  return pressureSide === "even" || pressureSide === "unclear";
}

function buildRouteBiasReferenceKeys(params: {
  openingLegType: OpeningLegType;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
}) {
  const keys: ReferenceBasisKey[] = [];

  if (
    params.edgeStrength === "unclear" ||
    params.windTrend === "unstable" ||
    params.windTrend === "unknown" ||
    (isUnclearPressure(params.pressureSide) && !hasClearCurrentSignal(params.currentSide))
  ) {
    keys.push("keep_options_open");
  }

  if (params.openingLegType === "mostly_upwind") {
    keys.push("start_side_alignment");
  }

  keys.push("upwind_core");

  if (hasClearCurrentSignal(params.currentSide)) {
    keys.push("current_and_sailing_wind");
  }

  if (params.windTrend === "oscillating") {
    keys.push("oscillating_shift");
  }

  keys.push("forecast_confidence");

  return keys;
}

function firstHeadingDiff(zones: CourseZone[]) {
  const headings = zones
    .map((zone) => zone.headingDeg)
    .filter((heading): heading is number => heading != null);

  if (headings.length < 2) return null;
  return Math.abs(headings[0] - headings[1]);
}

function buildCourseStrategyReferenceKeys(zones: CourseZone[]) {
  const keys: ReferenceBasisKey[] = [];

  if (
    zones.some(
      (zone) => zone.windShiftRisk === "unknown" || zone.currentEffect === "unknown",
    )
  ) {
    keys.push("keep_options_open");
  }

  keys.push("upwind_core");

  if (
    zones.some((zone) => zone.windShiftRisk === "high" || zone.windShiftRisk === "moderate")
  ) {
    keys.push("oscillating_shift");
  }

  if (
    zones.some(
      (zone) => zone.currentEffect === "favorable" || zone.currentEffect === "adverse",
    )
  ) {
    keys.push("current_and_sailing_wind");
  }

  keys.push("forecast_confidence");

  return keys;
}

function buildCoachReferenceKeys(params: {
  mode: "pre_race" | "live" | "review";
  action?: string | null;
  hasDirectionalPlan?: boolean;
  confidenceFragile?: boolean;
}) {
  if (params.mode === "pre_race") {
    return params.hasDirectionalPlan && params.action !== "stay_flexible"
      ? (["start_side_alignment", "start_execution", "forecast_confidence"] as const)
      : (["keep_options_open", "start_execution", "forecast_confidence"] as const);
  }

  if (params.mode === "live") {
    return params.confidenceFragile || params.action === "stay_flexible"
      ? (["keep_options_open", "tactical_risk_control", "forecast_confidence"] as const)
      : (["upwind_core", "tactical_risk_control", "forecast_confidence"] as const);
  }

  return [
    "tactical_observation",
    "tactical_risk_control",
    "forecast_confidence",
  ] as const;
}

export function getRouteBiasReferenceBasis(params: {
  openingLegType: OpeningLegType;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
}) {
  return uniqueBasis(buildRouteBiasReferenceKeys(params), 3);
}

export function getRouteBiasReferencePolicy(params: {
  openingLegType: OpeningLegType;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
  windSpeedKt: number;
}) {
  const keys = buildRouteBiasReferenceKeys(params);
  const preferFlexibility = keys.includes("keep_options_open");
  const phaseOverCorners =
    keys.includes("oscillating_shift") && params.openingLegType === "mostly_upwind";

  return {
    basis: uniqueBasis(keys, 3),
    preferFlexibility,
    phaseOverCorners,
    emphasizeCurrentRelief:
      hasClearCurrentSignal(params.currentSide) &&
      (params.windSpeedKt <= 8 ||
        params.windTrend === "fading" ||
        isUnclearPressure(params.pressureSide)),
    emphasizePressureLane:
      !isUnclearPressure(params.pressureSide) &&
      params.windTrend === "building" &&
      params.windSpeedKt >= 10,
    confidencePenalty: preferFlexibility ? 1 : 0,
    commitmentMargin: preferFlexibility || phaseOverCorners ? 3 : 2,
  };
}

export function getCourseStrategyReferenceBasis(zones: CourseZone[]) {
  return uniqueBasis(buildCourseStrategyReferenceKeys(zones), 3);
}

export function getCourseStrategyReferencePolicy(zones: CourseZone[]) {
  const keys = buildCourseStrategyReferenceKeys(zones);
  const headingDiff = firstHeadingDiff(zones);
  const preferFlexibility = keys.includes("keep_options_open");
  const phaseOverCorners = keys.includes("oscillating_shift");
  const currentBreaksTies =
    keys.includes("current_and_sailing_wind") && headingDiff != null && headingDiff < 30;

  return {
    basis: uniqueBasis(keys, 3),
    preferFlexibility,
    phaseOverCorners,
    currentBreaksTies,
    headingDiffDeg: headingDiff,
  };
}

export function getCoachReferenceBasis(params: {
  mode: "pre_race" | "live" | "review";
  action?: string | null;
  hasDirectionalPlan?: boolean;
  confidenceFragile?: boolean;
}) {
  return uniqueBasis([...buildCoachReferenceKeys(params)], 3);
}

export function getCoachReferencePolicy(params: {
  mode: "pre_race" | "live" | "review";
  action?: string | null;
  hasDirectionalPlan?: boolean;
  confidenceFragile?: boolean;
}) {
  const keys = [...buildCoachReferenceKeys(params)];

  return {
    basis: uniqueBasis(keys, 3),
    preferFlexibility: keys.includes("keep_options_open"),
    preferKnownControls: keys.includes("tactical_risk_control"),
  };
}
