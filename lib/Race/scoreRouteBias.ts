import type {
  CurrentSide,
  EdgeStrength,
  OpeningLegType,
  PressureSide,
  WindTrend
} from "@/data/Race/getRouteBiasInputs";

export type RouteBiasDecision =
  | "shore_first"
  | "bay_first"
  | "neutral"
  | "mixed_signal";

export type RouteBiasConfidence = "low" | "medium" | "high";

export type RouteBiasAnswers = {
  courseId: string;
  openingLegType: OpeningLegType;
  windDirectionDeg: number;
  windSpeedKt: number;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
};

export type RouteBiasResult = {
  decision: RouteBiasDecision;
  confidence: RouteBiasConfidence;
  shoreScore: number;
  bayScore: number;
  reasons: string[];
  warnings: string[];
};

function edgeWeight(edgeStrength: EdgeStrength): number {
  switch (edgeStrength) {
    case "strong":
      return 3;
    case "moderate":
      return 2;
    case "weak":
      return 1;
    default:
      return 0;
  }
}

function confidenceFromDelta(delta: number, edgeStrength: EdgeStrength): RouteBiasConfidence {
  if (edgeStrength === "unclear") return "low";
  if (delta >= 4) return "high";
  if (delta >= 2) return "medium";
  return "low";
}

export function scoreRouteBias(input: RouteBiasAnswers): RouteBiasResult {
  let shoreScore = 0;
  let bayScore = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const ew = edgeWeight(input.edgeStrength);

  // Pressure side
  if (input.pressureSide === "shore") {
    shoreScore += ew;
    reasons.push("Pressure appears stronger closer to shore.");
  } else if (input.pressureSide === "bay") {
    bayScore += ew;
    reasons.push("Pressure appears stronger out in the bay.");
  }

  // Current side
  if (
    input.currentSide === "shore_less_adverse" ||
    input.currentSide === "shore_more_favorable"
  ) {
    shoreScore += ew;
    reasons.push("Current setup looks better near shore.");
  } else if (
    input.currentSide === "bay_less_adverse" ||
    input.currentSide === "bay_more_favorable"
  ) {
    bayScore += ew;
    reasons.push("Current setup looks better out in the bay.");
  }

  // Wind trend
  if (input.windTrend === "oscillating" || input.windTrend === "unstable") {
    warnings.push("Wind looks unstable. Avoid committing too early.");
    shoreScore -= 1;
    bayScore -= 1;
  }

  if (input.windTrend === "building" && input.windSpeedKt >= 10) {
    reasons.push("Building breeze may make pressure lanes more important.");
  }

  if (input.windTrend === "fading" || input.windSpeedKt <= 8) {
    reasons.push("Lighter conditions increase the value of current relief.");
  }

  // Opening leg angle
  if (input.openingLegType === "mostly_upwind") {
    reasons.push("Opening leg is mostly upwind, so route bias matters more.");
  } else if (
    input.openingLegType === "beam_reach" ||
    input.openingLegType === "broad_reach"
  ) {
    warnings.push("Opening leg is freer, so route bias may matter less than pressure and lane management.");
    shoreScore -= 1;
    bayScore -= 1;
  }

  // Mixed signal detection
  const windFavorsShore = input.pressureSide === "shore";
  const windFavorsBay = input.pressureSide === "bay";
  const currentFavorsShore =
    input.currentSide === "shore_less_adverse" ||
    input.currentSide === "shore_more_favorable";
  const currentFavorsBay =
    input.currentSide === "bay_less_adverse" ||
    input.currentSide === "bay_more_favorable";

  if ((windFavorsShore && currentFavorsBay) || (windFavorsBay && currentFavorsShore)) {
    warnings.push("Wind and current are pointing to different sides.");
  }

  const delta = Math.abs(shoreScore - bayScore);

  if ((windFavorsShore && currentFavorsBay) || (windFavorsBay && currentFavorsShore)) {
    return {
      decision: "mixed_signal",
      confidence: confidenceFromDelta(delta, input.edgeStrength),
      shoreScore,
      bayScore,
      reasons,
      warnings
    };
  }

  if (shoreScore >= bayScore + 2) {
    return {
      decision: "shore_first",
      confidence: confidenceFromDelta(delta, input.edgeStrength),
      shoreScore,
      bayScore,
      reasons,
      warnings
    };
  }

  if (bayScore >= shoreScore + 2) {
    return {
      decision: "bay_first",
      confidence: confidenceFromDelta(delta, input.edgeStrength),
      shoreScore,
      bayScore,
      reasons,
      warnings
    };
  }

  return {
    decision: "neutral",
    confidence: confidenceFromDelta(delta, input.edgeStrength),
    shoreScore,
    bayScore,
    reasons,
    warnings
  };
}