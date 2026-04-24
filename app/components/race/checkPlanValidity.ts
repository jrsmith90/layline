

export type RouteBiasDecision =
  | "shore_first"
  | "bay_first"
  | "neutral"
  | "mixed_signal";

export type RouteBiasConfidence = "low" | "medium" | "high";

export type PlanValidityState =
  | "on_plan"
  | "plan_weakening"
  | "plan_invalidated"
  | "new_edge_detected";

export type TacticalUpdateAction =
  | "hold_course"
  | "stay_flexible"
  | "prepare_to_change_side_bias"
  | "change_side_bias";

export type RouteBiasSnapshot = {
  decision: RouteBiasDecision;
  confidence: RouteBiasConfidence;
  shoreScore: number;
  bayScore: number;
  reasons: string[];
  warnings: string[];
};

export type PlanValidityInput = {
  originalPlan: RouteBiasSnapshot;
  latestPlan: RouteBiasSnapshot;
};

export type PlanValidityResult = {
  validityState: PlanValidityState;
  action: TacticalUpdateAction;
  confidence: RouteBiasConfidence;
  reasons: string[];
  warnings: string[];
  scoreDelta: {
    shore: number;
    bay: number;
  };
};

function confidenceRank(confidence: RouteBiasConfidence): number {
  switch (confidence) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

function worseConfidence(
  a: RouteBiasConfidence,
  b: RouteBiasConfidence
): RouteBiasConfidence {
  return confidenceRank(a) <= confidenceRank(b) ? a : b;
}

function isDirectionalDecision(decision: RouteBiasDecision): boolean {
  return decision === "shore_first" || decision === "bay_first";
}

export function checkPlanValidity(
  input: PlanValidityInput
): PlanValidityResult {
  const { originalPlan, latestPlan } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const scoreDelta = {
    shore: Number((latestPlan.shoreScore - originalPlan.shoreScore).toFixed(2)),
    bay: Number((latestPlan.bayScore - originalPlan.bayScore).toFixed(2))
  };

  const outputConfidence = worseConfidence(
    originalPlan.confidence,
    latestPlan.confidence
  );

  const originalDecision = originalPlan.decision;
  const latestDecision = latestPlan.decision;

  const originalDirectional = isDirectionalDecision(originalDecision);
  const latestDirectional = isDirectionalDecision(latestDecision);

  if (originalDecision === latestDecision) {
    if (latestPlan.confidence === originalPlan.confidence) {
      reasons.push("Latest sampled bias still matches the original plan.");
    } else if (confidenceRank(latestPlan.confidence) < confidenceRank(originalPlan.confidence)) {
      reasons.push("The same side still looks favored, but confidence has weakened.");
      warnings.push("Edge is weaker than it was pre-race.");
      return {
        validityState: "plan_weakening",
        action: "stay_flexible",
        confidence: outputConfidence,
        reasons,
        warnings,
        scoreDelta
      };
    } else {
      reasons.push("The original side bias is still supported and confidence has improved.");
    }

    return {
      validityState: "on_plan",
      action: "hold_course",
      confidence: outputConfidence,
      reasons,
      warnings,
      scoreDelta
    };
  }

  if (latestDecision === "neutral") {
    reasons.push("The latest read no longer shows a clear side advantage.");
    warnings.push("Original edge appears to be fading.");

    return {
      validityState: "plan_weakening",
      action: "stay_flexible",
      confidence: outputConfidence,
      reasons,
      warnings,
      scoreDelta
    };
  }

  if (latestDecision === "mixed_signal") {
    reasons.push("Latest inputs show wind and current pointing to different sides.");
    warnings.push("Do not commit too hard until the picture becomes clearer.");

    return {
      validityState: "plan_weakening",
      action: "stay_flexible",
      confidence: outputConfidence,
      reasons,
      warnings,
      scoreDelta
    };
  }

  if (!originalDirectional && latestDirectional) {
    reasons.push("A new directional edge has emerged since the original plan was made.");

    if (latestPlan.confidence === "high") {
      reasons.push("The new edge is strong enough to justify a directional change.");
      return {
        validityState: "new_edge_detected",
        action: "change_side_bias",
        confidence: outputConfidence,
        reasons,
        warnings,
        scoreDelta
      };
    }

    warnings.push("A new side may be forming, but it is not strong enough yet to force a full commitment.");
    return {
      validityState: "new_edge_detected",
      action: "prepare_to_change_side_bias",
      confidence: outputConfidence,
      reasons,
      warnings,
      scoreDelta
    };
  }

  if (originalDirectional && latestDirectional && originalDecision !== latestDecision) {
    reasons.push("The latest sampled bias points to the opposite side from the original plan.");

    if (latestPlan.confidence === "high") {
      warnings.push("Original plan appears invalidated by the latest conditions.");
      return {
        validityState: "plan_invalidated",
        action: "change_side_bias",
        confidence: outputConfidence,
        reasons,
        warnings,
        scoreDelta
      };
    }

    warnings.push("The opposite side is improving, but confidence is not high enough for a full flip yet.");
    return {
      validityState: "plan_invalidated",
      action: "prepare_to_change_side_bias",
      confidence: outputConfidence,
      reasons,
      warnings,
      scoreDelta
    };
  }

  reasons.push("Conditions have changed, but not enough to force a hard update yet.");
  warnings.push("Keep checking the live weather picture.");

  return {
    validityState: "plan_weakening",
    action: "stay_flexible",
    confidence: outputConfidence,
    reasons,
    warnings,
    scoreDelta
  };
}