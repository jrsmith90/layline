

import { checkPlanValidity, type RouteBiasSnapshot } from "@/lib/race/checkPlanValidity";
import { scoreRouteBias, type RouteBiasAnswers } from "@/lib/race/scoreRouteBias";

export type LiveRouteUpdateInput = {
  originalPlan: RouteBiasSnapshot;
  latestAnswers: RouteBiasAnswers;
};

export function getLiveRouteUpdate(input: LiveRouteUpdateInput) {
  const latestPlan = scoreRouteBias(input.latestAnswers);

  return checkPlanValidity({
    originalPlan: input.originalPlan,
    latestPlan
  });
}