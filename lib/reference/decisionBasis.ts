import type {
  CurrentSide,
  EdgeStrength,
  OpeningLegType,
  PressureSide,
  WindTrend,
} from "@/data/race/getRouteBiasInputs";
import type { CourseZone } from "@/lib/race/courseStrategy/types";

type ReferenceBasisKey =
  | "start_side_alignment"
  | "start_execution"
  | "upwind_core"
  | "oscillating_shift"
  | "current_and_sailing_wind"
  | "forecast_confidence"
  | "keep_options_open"
  | "tactical_observation"
  | "tactical_risk_control";

const REFERENCE_BASIS: Record<ReferenceBasisKey, string> = {
  start_side_alignment:
    "Use first-leg strategy to choose the line section: start right to go right, start left to go left, and stay midline when the side call is not clear. (Starting Strategy, Chapter 3 p.15)",
  start_execution:
    "A good start preserves clear air, acceleration room, and freedom to maneuver after the gun; near the favored end but clear of the crowd is usually better than winning the crowd. (Starting Strategy, Chapter 3 pp.14, 19-22)",
  upwind_core:
    "Base upwind strategy on better wind, wind shifts, and current, and match your level of commitment to how predictable those factors really are. (Upwind Strategy, Chapter 7 p.54)",
  oscillating_shift:
    "In oscillating breeze, stay in phase by tacking on the headers and sailing the lifted tack rather than forcing one corner. (Upwind Strategy, Chapter 7 pp.58-60)",
  current_and_sailing_wind:
    "Current is strategic twice over: it changes your path through the course and it can shift or strengthen the sailing wind, especially around deep runs, points, shallows, and constraints. (Weather, Chapter 13 pp.184-185)",
  forecast_confidence:
    "Your own observations during the hour before the race are the best predictor of local race conditions; use the broader forecast to frame expectations, then sail the wind you actually have. (Weather, Chapter 13 pp.178, 185)",
  keep_options_open:
    "When the side call or shift pattern is mixed, unstable, or low-confidence, preserve flexibility instead of forcing a corner. (Starting Strategy, Chapter 3 p.15; Upwind Strategy, Chapter 7 p.54; Weather, Chapter 13 p.182)",
  tactical_observation:
    "Tactical decisions get sharper when you describe course position clearly, track how much of each tack remains, and ask concrete questions about nearby boats' speed, lane, and leverage. (Skill Building, Performance Racing Tactics p.114)",
  tactical_risk_control:
    "When the picture is uncertain, reduce tactical risk by staying near the fleet, relying on boat speed and handling, and taking only the shifts you can read with confidence. (Upwind Tactics, Chapter 8 pp.110-112)",
};

function uniqueBasis(keys: ReferenceBasisKey[], limit: number) {
  const basis: string[] = [];
  const seen = new Set<ReferenceBasisKey>();

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    basis.push(REFERENCE_BASIS[key]);
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

export function getRouteBiasReferenceBasis(params: {
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

  return uniqueBasis(keys, 3);
}

export function getCourseStrategyReferenceBasis(zones: CourseZone[]) {
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

  return uniqueBasis(keys, 3);
}

export function getCoachReferenceBasis(params: {
  mode: "pre_race" | "live" | "review";
  action?: string | null;
  hasDirectionalPlan?: boolean;
  confidenceFragile?: boolean;
}) {
  if (params.mode === "pre_race") {
    return uniqueBasis(
      params.hasDirectionalPlan && params.action !== "stay_flexible"
        ? ["start_side_alignment", "start_execution", "forecast_confidence"]
        : ["keep_options_open", "start_execution", "forecast_confidence"],
      3,
    );
  }

  if (params.mode === "live") {
    return uniqueBasis(
      params.confidenceFragile || params.action === "stay_flexible"
        ? ["keep_options_open", "tactical_risk_control", "forecast_confidence"]
        : ["upwind_core", "tactical_risk_control", "forecast_confidence"],
      3,
    );
  }

  return uniqueBasis(
    ["tactical_observation", "tactical_risk_control", "forecast_confidence"],
    3,
  );
}
