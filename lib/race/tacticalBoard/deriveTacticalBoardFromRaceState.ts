import { angleDiffDeg, wrap360 } from "@/lib/race/courseTracker";
import type { RaceState } from "@/lib/race/state/types";
import { deriveTacticalBoard } from "./deriveTacticalBoard";
import type { TacticalBoardDraft } from "./store";
import type {
  TacticalBoard,
  TacticalBoardCurrentWindSource,
  TacticalBoardLiveLegMode,
} from "./types";

const LEG_ALIGNMENT_WINDOW_DEG = 70;

export type DerivedLiveTacticalBoard = {
  board: TacticalBoard;
  legMode: TacticalBoardLiveLegMode;
  activeLegLabel: string | null;
  currentWindSource: TacticalBoardCurrentWindSource;
  usesActiveLegBearing: boolean;
};

function parseAngle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? wrap360(parsed) : null;
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyLegMode(params: {
  activeLegBearingDeg: number | null;
  windFromDeg: number | null;
}): TacticalBoardLiveLegMode {
  if (params.activeLegBearingDeg == null || params.windFromDeg == null) {
    return "unknown";
  }

  const upwindOffset = Math.abs(angleDiffDeg(params.windFromDeg, params.activeLegBearingDeg));
  const downwindOffset = Math.abs(
    angleDiffDeg(wrap360(params.windFromDeg + 180), params.activeLegBearingDeg),
  );

  if (upwindOffset <= LEG_ALIGNMENT_WINDOW_DEG && upwindOffset < downwindOffset) {
    return "upwind";
  }

  if (downwindOffset <= LEG_ALIGNMENT_WINDOW_DEG && downwindOffset < upwindOffset) {
    return "downwind";
  }

  return "reach";
}

export function deriveTacticalBoardFromRaceState(params: {
  raceState: RaceState;
  draft: TacticalBoardDraft;
}): DerivedLiveTacticalBoard {
  const manualCurrentWindDeg = parseAngle(params.draft.currentWindDirectionDeg);
  const liveCurrentWindDeg = params.raceState.wind.directionFromDeg;
  const currentWindSource: TacticalBoardCurrentWindSource =
    liveCurrentWindDeg != null
      ? "live"
      : manualCurrentWindDeg != null
        ? "setup"
        : "missing";
  const activeLeg = params.raceState.course.activeLeg;
  const activeLegBearingDeg = activeLeg?.bearingDeg ?? null;
  const legMode = classifyLegMode({
    activeLegBearingDeg,
    windFromDeg: liveCurrentWindDeg ?? manualCurrentWindDeg,
  });
  const usesActiveLegBearing =
    activeLegBearingDeg != null && (legMode === "upwind" || legMode === "downwind");

  const board = deriveTacticalBoard({
    courseId: params.raceState.course.selectedCourseId,
    courseData: params.raceState.course.summary,
    meanWindDirectionDeg: parseAngle(params.draft.meanWindDirectionDeg),
    currentWindDirectionDeg: liveCurrentWindDeg ?? manualCurrentWindDeg,
    tackAngleDeg: params.raceState.performance.tackAngleDeg,
    windwardMarkBearingDeg:
      legMode === "upwind"
        ? activeLegBearingDeg
        : parseAngle(params.draft.windwardMarkBearingDeg),
    downwindMarkBearingDeg:
      legMode === "downwind"
        ? activeLegBearingDeg
        : parseAngle(params.draft.downwindMarkBearingDeg),
    linePortEndBearingDeg: parseAngle(params.draft.linePortEndBearingDeg),
    lineStarboardEndBearingDeg: parseAngle(params.draft.lineStarboardEndBearingDeg),
    downwindTrueWindAngleDeg: parseNumber(params.draft.downwindTrueWindAngleDeg) ?? 135,
    windTrend: params.draft.windTrend,
    now: params.raceState.generatedAt,
  });

  return {
    board,
    legMode,
    activeLegLabel: activeLeg ? `${activeLeg.fromMark} to ${activeLeg.toMark}` : null,
    currentWindSource,
    usesActiveLegBearing,
  };
}
