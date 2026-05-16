import type { CourseSummary } from "@/data/race/getCourseData";
import type { PlanValidityResult, RouteBiasSnapshot } from "@/lib/race/checkPlanValidity";
import type { RaceSessionReview } from "@/lib/raceSessionStore";
import type { RaceState } from "@/lib/race/state/types";
import type { DerivedLiveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoardFromRaceState";
import type { TacticalBoardStatus } from "@/lib/race/tacticalBoard/types";

export type AiCoachBrief = {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  footer: string;
  tone: "neutral" | "focus" | "warning" | "positive";
  readiness: "ready" | "needs_setup" | "watch";
};

function formatDecision(
  decision: RouteBiasSnapshot["decision"] | null | undefined,
) {
  switch (decision) {
    case "shore_first":
      return "Favor shore early";
    case "bay_first":
      return "Favor bay early";
    case "neutral":
      return "Stay central";
    case "mixed_signal":
      return "Mixed signal";
    default:
      return "No call yet";
  }
}

function boardStatusCopy(status: DerivedLiveTacticalBoard["board"]["readiness"]["status"]) {
  switch (status) {
    case "ready":
      return "Board geometry is locked in.";
    case "partial":
      return "Board is usable, but some geometry is still missing.";
    default:
      return "Board setup still needs baseline inputs.";
  }
}

export function buildPreRaceCoachBrief(params: {
  course: CourseSummary;
  boardStatus: TacticalBoardStatus;
  openingPlan: RouteBiasSnapshot | null;
  latestUpdate: PlanValidityResult | null;
}): AiCoachBrief {
  const constraintCount = params.course.specialRoutingConstraints.length;

  if (!params.openingPlan) {
    return {
      eyebrow: "AI Coach Lane",
      title: "Lock the opening picture first",
      summary:
        "The best next move is still human setup: choose the course, save the opening-bias plan, and finish the tactical-board baseline before asking for a synthesized recommendation.",
      bullets: [
        boardStatusCopy(params.boardStatus),
        constraintCount > 0
          ? `${constraintCount} routing constraint${constraintCount === 1 ? "" : "s"} still need to stay visible in the plan.`
          : "No special routing constraints are attached to this course.",
      ],
      footer:
        "This advisory lane is structured now so a real model can take the same inputs later without changing the UI again.",
      tone: "neutral",
      readiness: "needs_setup",
    };
  }

  if (params.latestUpdate) {
    const actionTone =
      params.latestUpdate.action === "change_side_bias"
        ? "warning"
        : params.latestUpdate.action === "prepare_to_change_side_bias" ||
            params.latestUpdate.action === "stay_flexible"
          ? "focus"
          : "positive";

    return {
      eyebrow: "AI Coach Lane",
      title:
        params.latestUpdate.action === "hold_course"
          ? "Opening plan still holds"
          : params.latestUpdate.action === "stay_flexible"
            ? "Keep the plan, but soften the commitment"
            : params.latestUpdate.action === "prepare_to_change_side_bias"
              ? "Bias may be moving"
              : "Opening side likely changed",
      summary:
        params.latestUpdate.reasons[0] ??
        `Current route-bias check is reading ${formatDecision(params.openingPlan.decision)}.`,
      bullets: [
        `Baseline call: ${formatDecision(params.openingPlan.decision)}.`,
        boardStatusCopy(params.boardStatus),
        constraintCount > 0
          ? `Keep ${constraintCount} channel-side reference mark${constraintCount === 1 ? "" : "s"} in the opening mental picture.`
          : "No extra routing restrictions are changing the opening picture.",
      ],
      footer:
        "When a real model is connected, this lane should synthesize weather, plan validity, and board setup into one launch-ready briefing.",
      tone: actionTone,
      readiness: "ready",
    };
  }

  return {
    eyebrow: "AI Coach Lane",
    title: "Plan is ready for the gun",
    summary:
      "You have a saved opening-bias plan and enough board setup to leave the dock with one clear first-leg picture instead of a scattered checklist.",
    bullets: [
      `Baseline call: ${formatDecision(params.openingPlan.decision)}.`,
      boardStatusCopy(params.boardStatus),
      constraintCount > 0
        ? `${constraintCount} routing constraint${constraintCount === 1 ? "" : "s"} are already attached to the course context.`
        : "No extra routing restrictions are attached to this course.",
    ],
    footer:
      "This is the spot where a future model can turn the saved plan into a single pre-start briefing.",
    tone: "positive",
    readiness: "ready",
  };
}

export function buildLiveCoachBrief(params: {
  raceState: RaceState;
  liveBoard: DerivedLiveTacticalBoard;
  action: string;
  line: string;
  why: string;
  fix: string;
}): AiCoachBrief {
  const overallConfidence = params.raceState.confidence.overall;
  const topSignal = params.raceState.confidence.signals[0]?.message ?? null;

  return {
    eyebrow: "AI Coach Lane",
    title:
      overallConfidence === "low" || overallConfidence === "none"
        ? "Call is usable, but inputs are fragile"
        : `${params.action} with one clear next check`,
    summary:
      overallConfidence === "low" || overallConfidence === "none"
        ? "The live call still has value, but the first job is checking whether the wind source and GPS picture are stable enough to trust for another move."
        : `${params.line}. ${params.why}`,
    bullets: [
      params.fix,
      `Live board mode: ${
        params.liveBoard.activeLegLabel ?? params.liveBoard.legMode
      } with ${params.liveBoard.currentWindSource} wind context.`,
      topSignal ??
        `Overall app confidence is ${overallConfidence}, sourced from ${params.raceState.wind.sourceLabel}.`,
    ],
    footer:
      "This is an AI-ready advisory lane. Right now it is deterministic and state-driven, so a real model can slot in later without stealing focus from the primary race call.",
    tone:
      overallConfidence === "low" || overallConfidence === "none"
        ? "warning"
        : overallConfidence === "medium"
          ? "focus"
          : "positive",
    readiness: overallConfidence === "none" ? "watch" : "ready",
  };
}

export function buildReviewCoachBrief(review: RaceSessionReview | null): AiCoachBrief {
  if (!review) {
    return {
      eyebrow: "AI Coach Lane",
      title: "Recover one session first",
      summary:
        "Review becomes more useful once a race session is loaded, because the advisory lane can anchor itself to real decisions, pace, weather, and board snapshots instead of general tips.",
      bullets: [
        "Recover today from the race phone, or start recording from Race Live on the next session.",
      ],
      footer:
        "This lane is meant to become the one-paragraph debrief a future model writes after the race.",
      tone: "neutral",
      readiness: "needs_setup",
    };
  }

  const firstSignal = review.coachingSignals[0] ?? "No coaching signals were generated yet.";
  const nextItems = review.workOnNext.slice(0, 3);
  const scoreCopy =
    review.decisionScorePct == null
      ? "Decision score still needs outcome data."
      : `Decision score is ${review.decisionScorePct}% with a ${review.decisionGrade.replace(/_/g, " ")} read.`;

  return {
    eyebrow: "AI Coach Lane",
    title:
      review.decisionGrade === "sharp"
        ? "Protect what worked"
        : review.decisionGrade === "solid"
          ? "Tighten a few repeatable edges"
          : review.decisionGrade === "mixed"
            ? "Good day to reduce decision churn"
            : "Debrief should focus on the biggest misses",
    summary: `${scoreCopy} ${firstSignal}`,
    bullets:
      nextItems.length > 0
        ? nextItems
        : ["Keep logging and rating decisions so the next review has cleaner evidence."],
    footer:
      "This is the review-side AI lane. A future model can use the same structured review data to generate a cleaner post-race debrief without changing the screen layout.",
    tone:
      review.decisionGrade === "sharp" || review.decisionGrade === "solid"
        ? "positive"
        : review.decisionGrade === "mixed"
          ? "focus"
          : "warning",
    readiness: review.decisionCount > 0 ? "ready" : "watch",
  };
}
