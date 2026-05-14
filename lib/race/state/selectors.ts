import {
  calculateMarkProgress,
  type MarkProgressCall,
  type MarkProgressInput,
  type MarkProgressResult,
} from "@/lib/race/courseTracker";
import type {
  RaceState,
  RaceStateConfidenceLevel,
  RaceStateConfidenceSignal,
} from "./types";

const CONFIDENCE_SCORE: Record<RaceStateConfidenceLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function selectActiveLeg(state: RaceState) {
  return state.course.activeLeg;
}

export function selectActiveMarks(state: RaceState) {
  return {
    fromMark: state.course.fromMark,
    toMark: state.course.toMark,
  };
}

export function selectCourseLabel(state: RaceState) {
  return `${state.course.summary.eventName}: ${state.course.summary.courseId}`;
}

export function selectHasUsablePosition(state: RaceState) {
  return state.boat.position != null && state.boat.cogDeg != null;
}

export function selectHasUsableWind(state: RaceState) {
  return state.wind.directionFromDeg != null;
}

export function selectMarkProgressInput(
  state: RaceState,
): MarkProgressInput | null {
  if (!state.course.activeLeg || !state.course.fromMark || !state.course.toMark) {
    return null;
  }

  return {
    position: state.boat.position,
    cogDeg: state.boat.cogDeg,
    sogMps: state.boat.sogMps,
    accuracyM: state.boat.accuracyM,
    windFromDeg: state.wind.directionFromDeg,
    tackAngleDeg: state.performance.tackAngleDeg,
    leg: state.course.activeLeg,
    fromMark: state.course.fromMark,
    toMark: state.course.toMark,
  };
}

export function selectMarkProgress(state: RaceState): MarkProgressResult | null {
  const input = selectMarkProgressInput(state);
  return input ? calculateMarkProgress(input) : null;
}

export function selectIsApproachingMark(
  state: RaceState,
  progress: MarkProgressResult | null = selectMarkProgress(state),
) {
  return (
    progress?.distanceToMarkNm != null &&
    progress.distanceToMarkNm <= state.course.markApproachDistanceNm
  );
}

export function selectPrimaryMarkCall(
  state: RaceState,
  progress: MarkProgressResult | null = selectMarkProgress(state),
): MarkProgressCall | "approach" {
  if (selectIsApproachingMark(state, progress)) return "approach";
  return progress?.call ?? "need_gps";
}

export function selectConfidenceSignals(state: RaceState) {
  return [...state.confidence.signals].sort(
    (left, right) => CONFIDENCE_SCORE[left.level] - CONFIDENCE_SCORE[right.level],
  );
}

export function selectConfidenceSignalsAtOrBelow(
  state: RaceState,
  maxLevel: RaceStateConfidenceLevel,
): RaceStateConfidenceSignal[] {
  return selectConfidenceSignals(state).filter(
    (signal) => CONFIDENCE_SCORE[signal.level] <= CONFIDENCE_SCORE[maxLevel],
  );
}

export function selectHasLowConfidence(state: RaceState) {
  return CONFIDENCE_SCORE[state.confidence.overall] <= CONFIDENCE_SCORE.low;
}
