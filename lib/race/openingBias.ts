import type {
  OpeningLegType,
  WindTrend,
} from "@/data/race/getRouteBiasInputs";
import type {
  PlanValidityResult,
  RouteBiasSnapshot,
  TacticalUpdateAction,
} from "@/lib/race/checkPlanValidity";
import type { RouteBiasAnswers } from "@/lib/race/scoreRouteBias";

export type OpeningBiasSide = "shore" | "bay" | "center" | "mixed";

export type OpeningBiasRecord = {
  pickedAtISO: string;
  courseId: string;
  side: OpeningBiasSide;
  label: string;
  confidence: RouteBiasSnapshot["confidence"];
  reason: string | null;
  reasons: string[];
  warnings: string[];
  referenceBasis: string[];
  windDirectionDeg: number | null;
  windSpeedKt: number | null;
  windTrend: WindTrend | null;
  openingLegType: OpeningLegType | null;
  latestAction: TacticalUpdateAction | null;
  latestActionLabel: string | null;
  latestReason: string | null;
  latestReasons: string[];
  latestWarnings: string[];
};

export function formatOpeningBiasLabel(
  decision: RouteBiasSnapshot["decision"] | null | undefined,
) {
  switch (decision) {
    case "shore_first":
      return "Shore first";
    case "bay_first":
      return "Bay first";
    case "neutral":
      return "Center first";
    case "mixed_signal":
      return "Mixed";
    default:
      return "No pick";
  }
}

export function openingBiasSideFromDecision(
  decision: RouteBiasSnapshot["decision"] | null | undefined,
): OpeningBiasSide {
  switch (decision) {
    case "shore_first":
      return "shore";
    case "bay_first":
      return "bay";
    case "neutral":
      return "center";
    default:
      return "mixed";
  }
}

export function formatOpeningBiasConfidence(
  confidence: RouteBiasSnapshot["confidence"] | null | undefined,
) {
  switch (confidence) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "--";
  }
}

export function formatOpeningBiasAction(
  action: TacticalUpdateAction | null | undefined,
) {
  switch (action) {
    case "hold_course":
      return "Hold";
    case "stay_flexible":
      return "Stay flexible";
    case "prepare_to_change_side_bias":
      return "Prepare to switch";
    case "change_side_bias":
      return "Switch";
    default:
      return null;
  }
}

export function formatOpeningLegTypeShort(value: OpeningLegType | null | undefined) {
  switch (value) {
    case "mostly_upwind":
      return "Upwind";
    case "close_reach":
      return "Close reach";
    case "beam_reach":
      return "Beam reach";
    case "broad_reach":
      return "Broad reach";
    default:
      return "--";
  }
}

export function buildOpeningBiasRecord(params: {
  answers: RouteBiasAnswers;
  plan: RouteBiasSnapshot;
  latestUpdate?: PlanValidityResult | null;
  pickedAtISO?: string;
}): OpeningBiasRecord {
  return {
    pickedAtISO: params.pickedAtISO ?? new Date().toISOString(),
    courseId: params.answers.courseId,
    side: openingBiasSideFromDecision(params.plan.decision),
    label: formatOpeningBiasLabel(params.plan.decision),
    confidence: params.plan.confidence,
    reason: params.plan.reasons[0] ?? null,
    reasons: params.plan.reasons,
    warnings: params.plan.warnings,
    referenceBasis: params.plan.referenceBasis,
    windDirectionDeg: params.answers.windDirectionDeg,
    windSpeedKt: params.answers.windSpeedKt,
    windTrend: params.answers.windTrend,
    openingLegType: params.answers.openingLegType,
    latestAction: params.latestUpdate?.action ?? null,
    latestActionLabel: formatOpeningBiasAction(params.latestUpdate?.action),
    latestReason: params.latestUpdate?.reasons[0] ?? null,
    latestReasons: params.latestUpdate?.reasons ?? [],
    latestWarnings: params.latestUpdate?.warnings ?? [],
  };
}
