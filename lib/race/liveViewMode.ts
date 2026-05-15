import type { AppMode } from "@/lib/appMode";
import type { MarkProgressCall, MarkProgressResult } from "@/lib/race/courseTracker";
import type { RaceStateConfidenceSignal } from "@/lib/race/state/types";

type ConfidencePanelCopy = {
  body: string;
  visibleSignals: RaceStateConfidenceSignal[];
  fallback: string;
};

type CockpitModeCopy = {
  primaryDetail: string;
  showWhy: boolean;
  showFix: boolean;
  teachingNote: string | null;
  visibleWarnings: string[];
};

type TrackerRecommendationCopy = {
  detail: string;
  teachingNote: string | null;
  visibleWarnings: string[];
};

function getTeachingNote(call: MarkProgressCall) {
  switch (call) {
    case "need_gps":
      return "Layline needs live position and course over ground so it can compare your real track against the next mark.";
    case "set_wind":
      return "Wind direction turns raw GPS progress into a tack-choice and layline problem instead of just a bearing problem.";
    case "hold":
      return "A hold call means this tack is still earning distance or VMG without forcing a lower-value maneuver yet.";
    case "prepare_tack":
      return "Prepare means the geometry is trending away before the tack becomes urgent, giving you time to protect lane and speed.";
    case "tack_now":
      return "Tack now means the opposite tack has become the cleaner geometric answer or your current heading has drifted too far off target.";
    case "overstood":
      return "Overstood means the mark is inside your layline but your actual path is now longer than the fast route.";
    case "not_progressing":
      return "Not progressing means your course over ground is no longer converting boat speed into mark progress.";
    default:
      return null;
  }
}

function getRaceActionSummary(result: MarkProgressResult) {
  switch (result.call) {
    case "need_gps":
      return "Turn GPS on and build speed for a stable COG.";
    case "set_wind":
      return "Add wind direction to unlock layline and tack calls.";
    case "hold":
      return "Stay on this tack and re-check as bearing moves.";
    case "prepare_tack":
      return "Build speed, find a clear lane, and get ready to tack.";
    case "tack_now":
      return "Tack while you still have room and speed.";
    case "overstood":
      return "Foot fast and stop adding distance.";
    case "not_progressing":
      return "Bear away for speed or tack if the opposite tack is clear.";
    default:
      return result.detail;
  }
}

export function getConfidencePanelCopy(params: {
  mode: AppMode;
  lowConfidence: boolean;
  signals: RaceStateConfidenceSignal[];
}) {
  if (params.mode === "race") {
    return {
      body: params.lowConfidence
        ? "Treat the live call as provisional until the weakest input improves."
        : "Inputs are usable.",
      visibleSignals: params.lowConfidence ? params.signals.slice(0, 1) : [],
      fallback: "GPS, course, and wind inputs are aligned.",
    } satisfies ConfidencePanelCopy;
  }

  return {
    body: params.lowConfidence
      ? "Treat this live call as provisional until the weakest inputs improve."
      : "Live inputs are usable, with a couple of caveats worth tracking.",
    visibleSignals: params.signals.slice(0, 3),
    fallback: "GPS, course, and wind inputs are aligned right now.",
  } satisfies ConfidencePanelCopy;
}

export function getCockpitModeCopy(params: {
  mode: AppMode;
  why: string;
  fix: string;
  result: MarkProgressResult | null;
}) {
  if (params.mode === "race") {
    return {
      primaryDetail: params.fix,
      showWhy: false,
      showFix: false,
      teachingNote: null,
      visibleWarnings: params.result?.warnings.slice(0, 1) ?? [],
    } satisfies CockpitModeCopy;
  }

  return {
    primaryDetail: params.fix,
    showWhy: true,
    showFix: true,
    teachingNote: params.result ? getTeachingNote(params.result.call) : null,
    visibleWarnings: params.result?.warnings ?? [],
  } satisfies CockpitModeCopy;
}

export function getTrackerRecommendationCopy(params: {
  mode: AppMode;
  result: MarkProgressResult;
}) {
  if (params.mode === "race") {
    return {
      detail: getRaceActionSummary(params.result),
      teachingNote: null,
      visibleWarnings: params.result.warnings.slice(0, 1),
    } satisfies TrackerRecommendationCopy;
  }

  return {
    detail: params.result.detail,
    teachingNote: getTeachingNote(params.result.call),
    visibleWarnings: params.result.warnings,
  } satisfies TrackerRecommendationCopy;
}

export function getMarkApproachCopy(mode: AppMode, distanceNm: number) {
  if (mode === "race") {
    return `Inside the ${distanceNm.toFixed(2)} nm approach circle. Round cleanly, let auto-advance catch the new leg, and use manual advance only if it stays behind.`;
  }

  return `You are within about ${distanceNm.toFixed(2)} nm of the next mark. The app will try to auto-advance after the rounding, and the manual control is still there if it stays on the old leg.`;
}
