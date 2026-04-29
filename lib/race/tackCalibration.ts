import { absAngleDiffDeg, angleDiffDeg, wrap360 } from "@/lib/race/courseTracker";

export type TackCalibrationTrackPoint = {
  at: string;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
};

export type TackCalibrationResult = {
  id: string;
  at: string;
  beforeCogDeg: number;
  afterCogDeg: number;
  tackThroughDeg: number;
  halfAngleDeg: number;
  confidence: "low" | "medium" | "high";
  beforeSamples: number;
  afterSamples: number;
};

export const TACK_CALIBRATION_STORAGE_KEY = "layline-tack-calibrations-v1";

const BEFORE_WINDOW_MS = 20_000;
const AFTER_SETTLE_MS = 10_000;
const AFTER_WINDOW_MS = 25_000;
const MIN_SETTLED_SPEED_MPS = 1.3;
const MAX_SETTLED_ACCURACY_M = 35;
const MIN_REASONABLE_TACK_DEG = 65;
const MAX_REASONABLE_TACK_DEG = 125;

function circularMeanDeg(values: number[]) {
  const vector = values.reduce(
    (acc, value) => {
      const rad = (value * Math.PI) / 180;
      return {
        x: acc.x + Math.cos(rad),
        y: acc.y + Math.sin(rad),
      };
    },
    { x: 0, y: 0 }
  );

  return wrap360((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
}

function pointsInWindow(
  track: TackCalibrationTrackPoint[],
  startMs: number,
  endMs: number
) {
  return track.filter((point) => {
    const at = new Date(point.at).getTime();
    return (
      at >= startMs &&
      at <= endMs &&
      point.cogDeg != null &&
      (point.sogMps == null || point.sogMps >= MIN_SETTLED_SPEED_MPS) &&
      (point.accuracyM == null || point.accuracyM <= MAX_SETTLED_ACCURACY_M)
    );
  });
}

function getConfidence(params: {
  tackThroughDeg: number;
  beforeSamples: number;
  afterSamples: number;
}) {
  const { tackThroughDeg, beforeSamples, afterSamples } = params;

  if (
    beforeSamples >= 4 &&
    afterSamples >= 4 &&
    tackThroughDeg >= 75 &&
    tackThroughDeg <= 115
  ) {
    return "high";
  }

  if (
    beforeSamples >= 2 &&
    afterSamples >= 2 &&
    tackThroughDeg >= 65 &&
    tackThroughDeg <= 125
  ) {
    return "medium";
  }

  return "low";
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function calculateTackCalibration(
  track: TackCalibrationTrackPoint[],
  tackStartedAtMs: number
): TackCalibrationResult {
  const beforePoints = pointsInWindow(
    track,
    tackStartedAtMs - BEFORE_WINDOW_MS,
    tackStartedAtMs
  );
  const afterPoints = pointsInWindow(
    track,
    tackStartedAtMs + AFTER_SETTLE_MS,
    tackStartedAtMs + AFTER_SETTLE_MS + AFTER_WINDOW_MS
  );

  if (beforePoints.length < 2) {
    throw new Error("Need more settled COG samples before the tack.");
  }

  if (afterPoints.length < 2) {
    throw new Error("Need more settled COG samples after the tack.");
  }

  const beforeCogDeg = circularMeanDeg(beforePoints.map((point) => point.cogDeg ?? 0));
  const afterCogDeg = circularMeanDeg(afterPoints.map((point) => point.cogDeg ?? 0));
  const tackThroughDeg = absAngleDiffDeg(beforeCogDeg, afterCogDeg);
  const halfAngleDeg = tackThroughDeg / 2;

  if (
    tackThroughDeg < MIN_REASONABLE_TACK_DEG ||
    tackThroughDeg > MAX_REASONABLE_TACK_DEG
  ) {
    throw new Error(
      `Measured tack angle was ${Math.round(tackThroughDeg)} deg. Sail more settled and try again.`
    );
  }

  return {
    id: makeId(),
    at: new Date().toISOString(),
    beforeCogDeg,
    afterCogDeg,
    tackThroughDeg,
    halfAngleDeg,
    confidence: getConfidence({
      tackThroughDeg,
      beforeSamples: beforePoints.length,
      afterSamples: afterPoints.length,
    }),
    beforeSamples: beforePoints.length,
    afterSamples: afterPoints.length,
  };
}

export function readTackCalibrations(): TackCalibrationResult[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(TACK_CALIBRATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTackCalibrations(results: TackCalibrationResult[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    TACK_CALIBRATION_STORAGE_KEY,
    JSON.stringify(results.slice(-10))
  );
}

export function getRaceDayHalfAngle(results: TackCalibrationResult[]) {
  if (results.length === 0) return null;

  const recent = results.slice(-5).map((result) => result.halfAngleDeg);
  const sorted = [...recent].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function getTackShiftLabel(result: TackCalibrationResult) {
  const shift = angleDiffDeg(result.beforeCogDeg, result.afterCogDeg);
  return shift > 0 ? "right turn" : "left turn";
}
