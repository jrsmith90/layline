import { angleDiffDeg, wrap360 } from "@/lib/race/courseTracker";
import type { TacticalBoard, TacticalBoardInput, TacticalBoardLineEnd, TacticalBoardSide } from "./types";

const DEFAULT_DOWNWIND_TRUE_WIND_ANGLE_DEG = 135;
const LINE_BIAS_SQUARE_WINDOW_DEG = 2;
const EVEN_REACH_WINDOW_DEG = 4;
const EVEN_TACK_WINDOW_DEG = 4;

function resolveNow(value?: Date | string | number) {
  if (value instanceof Date) return value;
  return value == null ? new Date() : new Date(value);
}

function normalizeNullableAngle(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? wrap360(value) : null;
}

function clampTackAngle(value: number) {
  if (!Number.isFinite(value)) return 45;
  return Math.min(60, Math.max(30, value));
}

function clampDownwindAngle(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DOWNWIND_TRUE_WIND_ANGLE_DEG;
  }

  return Math.min(170, Math.max(110, value));
}

function getResolvedDownwindMarkBearing(params: {
  explicitBearing: number | null;
  windwardBearing: number | null;
}) {
  if (params.explicitBearing != null) {
    return params.explicitBearing;
  }

  return params.windwardBearing == null ? null : wrap360(params.windwardBearing + 180);
}

function getLineBearing(params: {
  portEndBearingDeg: number | null;
  starboardEndBearingDeg: number | null;
}) {
  if (params.portEndBearingDeg != null) {
    return params.portEndBearingDeg;
  }

  return params.starboardEndBearingDeg == null
    ? null
    : wrap360(params.starboardEndBearingDeg + 180);
}

function getUpwindNormalDeg(lineBearingDeg: number | null, currentWindDirectionDeg: number | null) {
  if (lineBearingDeg == null || currentWindDirectionDeg == null) {
    return null;
  }

  const candidateA = wrap360(lineBearingDeg - 90);
  const candidateB = wrap360(lineBearingDeg + 90);

  return Math.abs(angleDiffDeg(candidateA, currentWindDirectionDeg)) <=
    Math.abs(angleDiffDeg(candidateB, currentWindDirectionDeg))
    ? candidateA
    : candidateB;
}

function getFavoredTack(windwardMarkOffsetDeg: number | null): TacticalBoardSide {
  if (windwardMarkOffsetDeg == null) return "unknown";
  if (Math.abs(windwardMarkOffsetDeg) <= EVEN_TACK_WINDOW_DEG) return "even";
  return windwardMarkOffsetDeg > 0 ? "starboard" : "port";
}

function getDominantReach(markOffsetFromJibeDeg: number | null): TacticalBoardSide {
  if (markOffsetFromJibeDeg == null) return "unknown";
  if (Math.abs(markOffsetFromJibeDeg) <= EVEN_REACH_WINDOW_DEG) return "even";
  return markOffsetFromJibeDeg > 0 ? "starboard" : "port";
}

function getFavoredEnd(biasDeg: number | null): TacticalBoardLineEnd {
  if (biasDeg == null) return "unknown";
  if (Math.abs(biasDeg) <= LINE_BIAS_SQUARE_WINDOW_DEG) return "square";
  return biasDeg > 0 ? "starboard" : "port";
}

export function deriveTacticalBoard(input: TacticalBoardInput): TacticalBoard {
  const generatedAt = resolveNow(input.now).toISOString();
  const meanWindDirectionDeg = normalizeNullableAngle(input.meanWindDirectionDeg);
  const currentWindDirectionDeg = normalizeNullableAngle(
    input.currentWindDirectionDeg ?? input.meanWindDirectionDeg,
  );
  const tackAngleDeg = clampTackAngle(input.tackAngleDeg);
  const downwindTrueWindAngleDeg = clampDownwindAngle(input.downwindTrueWindAngleDeg);
  const windwardMarkBearingDeg = normalizeNullableAngle(
    input.windwardMarkBearingDeg ?? input.courseData.firstLeg?.bearingDeg ?? null,
  );
  const downwindMarkBearingDeg = getResolvedDownwindMarkBearing({
    explicitBearing: normalizeNullableAngle(input.downwindMarkBearingDeg),
    windwardBearing: windwardMarkBearingDeg,
  });
  const linePortEndBearingDeg = normalizeNullableAngle(input.linePortEndBearingDeg);
  const lineStarboardEndBearingDeg = normalizeNullableAngle(input.lineStarboardEndBearingDeg);
  const lineBearingDeg = getLineBearing({
    portEndBearingDeg: linePortEndBearingDeg,
    starboardEndBearingDeg: lineStarboardEndBearingDeg,
  });
  const upwindNormalDeg = getUpwindNormalDeg(lineBearingDeg, currentWindDirectionDeg);
  const biasDeg =
    upwindNormalDeg == null || currentWindDirectionDeg == null
      ? null
      : angleDiffDeg(upwindNormalDeg, currentWindDirectionDeg);
  const deltaDeg =
    meanWindDirectionDeg == null || currentWindDirectionDeg == null
      ? null
      : angleDiffDeg(meanWindDirectionDeg, currentWindDirectionDeg);
  const absoluteDeltaDeg = deltaDeg == null ? null : Math.abs(deltaDeg);
  const starboardTackHeadingDeg =
    currentWindDirectionDeg == null ? null : wrap360(currentWindDirectionDeg - tackAngleDeg);
  const portTackHeadingDeg =
    currentWindDirectionDeg == null ? null : wrap360(currentWindDirectionDeg + tackAngleDeg);
  const baselineStarboardTackHeadingDeg =
    meanWindDirectionDeg == null ? null : wrap360(meanWindDirectionDeg - tackAngleDeg);
  const baselinePortTackHeadingDeg =
    meanWindDirectionDeg == null ? null : wrap360(meanWindDirectionDeg + tackAngleDeg);
  const windwardMarkOffsetDeg =
    currentWindDirectionDeg == null || windwardMarkBearingDeg == null
      ? null
      : angleDiffDeg(currentWindDirectionDeg, windwardMarkBearingDeg);
  const jibeBearingDeg =
    currentWindDirectionDeg == null ? null : wrap360(currentWindDirectionDeg + 180);
  const starboardGybeHeadingDeg =
    currentWindDirectionDeg == null
      ? null
      : wrap360(currentWindDirectionDeg + downwindTrueWindAngleDeg);
  const portGybeHeadingDeg =
    currentWindDirectionDeg == null
      ? null
      : wrap360(currentWindDirectionDeg - downwindTrueWindAngleDeg);
  const markOffsetFromJibeDeg =
    jibeBearingDeg == null || downwindMarkBearingDeg == null
      ? null
      : angleDiffDeg(jibeBearingDeg, downwindMarkBearingDeg);
  const missingInputs = [
    meanWindDirectionDeg == null ? "meanWindDirectionDeg" : null,
    Number.isFinite(tackAngleDeg) ? null : "tackAngleDeg",
    windwardMarkBearingDeg == null ? "windwardMarkBearingDeg" : null,
  ].filter(Boolean) as TacticalBoard["readiness"]["missingInputs"];
  const readinessStatus =
    missingInputs.length >= 3
      ? "setup_needed"
      : missingInputs.length > 0
        ? "partial"
        : "ready";

  return {
    generatedAt,
    course: {
      selectedCourseId: input.courseId,
      summary: input.courseData,
      firstMark: input.courseData.firstMark,
      firstLegBearingDeg: input.courseData.firstLeg?.bearingDeg ?? null,
      totalDistanceNm:
        input.courseData.totalDistanceNmSI ?? input.courseData.totalDistanceNmCalculated,
      totalLegs: input.courseData.totalLegs,
    },
    setup: {
      meanWindDirectionDeg,
      currentWindDirectionDeg,
      tackAngleDeg,
      downwindTrueWindAngleDeg,
      windwardMarkBearingDeg,
      downwindMarkBearingDeg,
      linePortEndBearingDeg,
      lineStarboardEndBearingDeg,
      windTrend: input.windTrend ?? "unknown",
    },
    readiness: {
      status: readinessStatus,
      missingInputs,
    },
    shift: {
      referenceFromDeg: meanWindDirectionDeg,
      currentFromDeg: currentWindDirectionDeg,
      deltaDeg,
      absoluteDeltaDeg,
      direction:
        deltaDeg == null
          ? "unknown"
          : absoluteDeltaDeg == null || absoluteDeltaDeg < 1
            ? "neutral"
            : deltaDeg > 0
              ? "starboard"
              : "port",
      memoryColor:
        deltaDeg == null
          ? "muted"
          : absoluteDeltaDeg == null || absoluteDeltaDeg < 1
            ? "neutral"
            : deltaDeg > 0
              ? "green"
              : "red",
    },
    upwind: {
      starboardTackHeadingDeg,
      portTackHeadingDeg,
      baselineStarboardTackHeadingDeg,
      baselinePortTackHeadingDeg,
      windwardMarkBearingDeg,
      windwardMarkOffsetDeg,
      favoredTack: getFavoredTack(windwardMarkOffsetDeg),
    },
    downwind: {
      downwindMarkBearingDeg,
      jibeBearingDeg,
      starboardGybeHeadingDeg,
      portGybeHeadingDeg,
      markOffsetFromJibeDeg,
      dominantReach: getDominantReach(markOffsetFromJibeDeg),
    },
    startLine: {
      portEndBearingDeg: linePortEndBearingDeg,
      starboardEndBearingDeg: lineStarboardEndBearingDeg,
      lineBearingDeg,
      upwindNormalDeg,
      biasDeg,
      favoredEnd: getFavoredEnd(biasDeg),
    },
  };
}
