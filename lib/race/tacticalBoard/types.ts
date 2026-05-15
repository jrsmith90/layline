import type { WindTrend } from "@/data/race/getRouteBiasInputs";
import type { CourseSummary } from "@/data/race/getCourseData";

export type TacticalBoardStatus = "ready" | "partial" | "setup_needed";
export type TacticalBoardShiftDirection = "starboard" | "port" | "neutral" | "unknown";
export type TacticalBoardMemoryColor = "green" | "red" | "neutral" | "muted";
export type TacticalBoardSide = "starboard" | "port" | "even" | "unknown";
export type TacticalBoardLineEnd = "starboard" | "port" | "square" | "unknown";
export type TacticalBoardInputKey =
  | "meanWindDirectionDeg"
  | "tackAngleDeg"
  | "windwardMarkBearingDeg";

export type TacticalBoardInput = {
  courseId: string;
  courseData: CourseSummary;
  meanWindDirectionDeg: number | null;
  currentWindDirectionDeg?: number | null;
  tackAngleDeg: number;
  downwindTrueWindAngleDeg?: number | null;
  windwardMarkBearingDeg?: number | null;
  downwindMarkBearingDeg?: number | null;
  linePortEndBearingDeg?: number | null;
  lineStarboardEndBearingDeg?: number | null;
  windTrend?: WindTrend;
  now?: Date | string | number;
};

export type TacticalBoardSetup = {
  meanWindDirectionDeg: number | null;
  currentWindDirectionDeg: number | null;
  tackAngleDeg: number;
  downwindTrueWindAngleDeg: number;
  windwardMarkBearingDeg: number | null;
  downwindMarkBearingDeg: number | null;
  linePortEndBearingDeg: number | null;
  lineStarboardEndBearingDeg: number | null;
  windTrend: WindTrend;
};

export type TacticalBoardShift = {
  referenceFromDeg: number | null;
  currentFromDeg: number | null;
  deltaDeg: number | null;
  absoluteDeltaDeg: number | null;
  direction: TacticalBoardShiftDirection;
  memoryColor: TacticalBoardMemoryColor;
};

export type TacticalBoardUpwind = {
  starboardTackHeadingDeg: number | null;
  portTackHeadingDeg: number | null;
  baselineStarboardTackHeadingDeg: number | null;
  baselinePortTackHeadingDeg: number | null;
  windwardMarkBearingDeg: number | null;
  windwardMarkOffsetDeg: number | null;
  favoredTack: TacticalBoardSide;
};

export type TacticalBoardDownwind = {
  downwindMarkBearingDeg: number | null;
  jibeBearingDeg: number | null;
  starboardGybeHeadingDeg: number | null;
  portGybeHeadingDeg: number | null;
  markOffsetFromJibeDeg: number | null;
  dominantReach: TacticalBoardSide;
};

export type TacticalBoardStartLine = {
  portEndBearingDeg: number | null;
  starboardEndBearingDeg: number | null;
  lineBearingDeg: number | null;
  upwindNormalDeg: number | null;
  biasDeg: number | null;
  favoredEnd: TacticalBoardLineEnd;
};

export type TacticalBoardCourseContext = {
  selectedCourseId: string;
  summary: CourseSummary;
  firstMark: string | null;
  firstLegBearingDeg: number | null;
  totalDistanceNm: number | null;
  totalLegs: number;
};

export type TacticalBoardReadiness = {
  status: TacticalBoardStatus;
  missingInputs: TacticalBoardInputKey[];
};

export type TacticalBoard = {
  generatedAt: string;
  course: TacticalBoardCourseContext;
  setup: TacticalBoardSetup;
  readiness: TacticalBoardReadiness;
  shift: TacticalBoardShift;
  upwind: TacticalBoardUpwind;
  downwind: TacticalBoardDownwind;
  startLine: TacticalBoardStartLine;
};
