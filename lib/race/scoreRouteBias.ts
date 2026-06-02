import type {
  CurrentSide,
  EdgeStrength,
  OpeningLegType,
  PressureSide,
  WindTrend,
} from "@/data/race/getRouteBiasInputs";
import { getCourseData, type CourseSummary } from "@/data/race/getCourseData";
import { getRouteBiasReferencePolicy } from "@/lib/reference/decisionBasis";
import { summarizeConstraintImpact } from "@/lib/race/instructionConstraints";

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
  referenceBasis: string[];
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

function applyConfidencePenalty(
  confidence: RouteBiasConfidence,
  penalty: number,
): RouteBiasConfidence {
  if (penalty <= 0) return confidence;
  if (confidence === "high") return "medium";
  return "low";
}

export function scoreRouteBias(
  input: RouteBiasAnswers,
  options: {
    courseData?: CourseSummary;
  } = {},
): RouteBiasResult {
  let shoreScore = 0;
  let bayScore = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const course = options.courseData ?? getCourseData(input.courseId);
  const constraintImpact = summarizeConstraintImpact(course, input.openingLegType);

  const ew = edgeWeight(input.edgeStrength);
  const referencePolicy = getRouteBiasReferencePolicy({
    openingLegType: input.openingLegType,
    windTrend: input.windTrend,
    pressureSide: input.pressureSide,
    currentSide: input.currentSide,
    edgeStrength: input.edgeStrength,
    windSpeedKt: input.windSpeedKt,
  });
  const pressureWeight =
    ew > 0 ? ew + (referencePolicy.emphasizePressureLane ? 1 : 0) : 0;
  const currentWeight = ew > 0 ? ew + (referencePolicy.emphasizeCurrentRelief ? 1 : 0) : 0;

  // Pressure side
  if (input.pressureSide === "shore") {
    shoreScore += pressureWeight;
    reasons.push("Pressure appears stronger closer to shore.");
  } else if (input.pressureSide === "bay") {
    bayScore += pressureWeight;
    reasons.push("Pressure appears stronger out in the bay.");
  }

  // Current side
  if (
    input.currentSide === "shore_less_adverse" ||
    input.currentSide === "shore_more_favorable"
  ) {
    shoreScore += currentWeight;
    reasons.push("Current setup looks better near shore.");
  } else if (
    input.currentSide === "bay_less_adverse" ||
    input.currentSide === "bay_more_favorable"
  ) {
    bayScore += currentWeight;
    reasons.push("Current setup looks better out in the bay.");
  }

  // Wind trend
  if (input.windTrend === "oscillating" || input.windTrend === "unstable") {
    warnings.push("Wind looks unstable. Avoid committing too early.");
    shoreScore -= 1;
    bayScore -= 1;
  }

  if (input.windTrend === "oscillating" && input.openingLegType === "mostly_upwind") {
    warnings.push(
      "Oscillating breeze favors staying in phase more than forcing an early corner.",
    );
  }

  if (referencePolicy.preferFlexibility) {
    warnings.push(
      "Reference guidance favors preserving options until wind and current align more cleanly.",
    );
  }

  if (referencePolicy.phaseOverCorners) {
    warnings.push("Reference guidance says to stay in phase before stretching leverage.");
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
    warnings.push(
      "Opening leg is freer, so route bias may matter less than pressure and lane management.",
    );
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

  if (
    input.openingLegType === "mostly_upwind" &&
    (input.edgeStrength === "unclear" ||
      ((input.pressureSide === "even" || input.pressureSide === "unclear") &&
        (input.currentSide === "even" || input.currentSide === "unclear")))
  ) {
    warnings.push(
      "No clean opening edge yet. Keep the first beat flexible instead of forcing a corner.",
    );
  }

  reasons.push(...constraintImpact.reasons);
  warnings.push(...constraintImpact.warnings);

  const delta = Math.abs(shoreScore - bayScore);
  const confidence = applyConfidencePenalty(
    confidenceFromDelta(delta, input.edgeStrength),
    constraintImpact.confidencePenalty + referencePolicy.confidencePenalty,
  );

  if ((windFavorsShore && currentFavorsBay) || (windFavorsBay && currentFavorsShore)) {
    return {
      decision: "mixed_signal",
      confidence,
      shoreScore,
      bayScore,
      reasons,
      warnings,
      referenceBasis: referencePolicy.basis,
    };
  }

  if (shoreScore >= bayScore + referencePolicy.commitmentMargin) {
    return {
      decision: "shore_first",
      confidence,
      shoreScore,
      bayScore,
      reasons,
      warnings,
      referenceBasis: referencePolicy.basis,
    };
  }

  if (bayScore >= shoreScore + referencePolicy.commitmentMargin) {
    return {
      decision: "bay_first",
      confidence,
      shoreScore,
      bayScore,
      reasons,
      warnings,
      referenceBasis: referencePolicy.basis,
    };
  }

  return {
    decision: "neutral",
    confidence,
    shoreScore,
    bayScore,
    reasons,
    warnings,
    referenceBasis: referencePolicy.basis,
  };
}
