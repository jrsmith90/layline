import { absAngleDiffDeg, angleDiffDeg, wrap360 } from "@/lib/race/courseTracker";

export type TackCalibrationTrackPoint = {
  at: string;
  lat?: number;
  lon?: number;
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
  source?: "manual" | "auto";
};

export type TackRecord = {
  id: string;
  atISO: string;
  halfAngleDeg: number;
  tackThroughDeg: number;
  beforeCogDeg: number;
  afterCogDeg: number;
  confidence: "low" | "medium" | "high";
  sogKt: number | null;
  windFromDeg: number | null;
  position: {
    lat: number;
    lon: number;
  } | null;
  sourceCalibrationId: string;
};

export const TACK_CALIBRATION_STORAGE_KEY = "layline-tack-calibrations-v1";

const BEFORE_WINDOW_MS = 20_000;
const AFTER_SETTLE_MS = 10_000;
const AFTER_WINDOW_MS = 25_000;
const MIN_SETTLED_SPEED_MPS = 1.3;
const MAX_SETTLED_ACCURACY_M = 35;
const MIN_REASONABLE_TACK_DEG = 65;
const MAX_REASONABLE_TACK_DEG = 125;
const AUTO_SCAN_STEP_MS = 5_000;
const AUTO_DEDUPE_WINDOW_MS = 45_000;
const MAX_STORED_CALIBRATIONS = 200;
const MAX_STORED_TACK_RECORDS = 300;

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
    source: "manual",
  };
}

function autoId(atMs: number, beforeCogDeg: number, afterCogDeg: number) {
  return `auto-tack-${atMs}-${Math.round(beforeCogDeg)}-${Math.round(afterCogDeg)}`;
}

function scoreTack(result: TackCalibrationResult) {
  const confidenceScore =
    result.confidence === "high" ? 3 : result.confidence === "medium" ? 2 : 1;
  return confidenceScore * 100 + result.beforeSamples + result.afterSamples;
}

function confidenceWeight(confidence: TackCalibrationResult["confidence"]) {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 0.5;
}

function speedKt(sogMps: number | null | undefined) {
  return sogMps == null ? null : sogMps * 1.943844;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trackWindow(track: TackCalibrationTrackPoint[], atISO: string, beforeSec: number, afterSec: number) {
  const atMs = new Date(atISO).getTime();
  if (!Number.isFinite(atMs)) return [];

  return track.filter((point) => {
    const pointMs = new Date(point.at).getTime();
    return pointMs >= atMs - beforeSec * 1000 && pointMs <= atMs + afterSec * 1000;
  });
}

function nearestPosition(track: TackCalibrationTrackPoint[], atISO: string) {
  const atMs = new Date(atISO).getTime();
  if (!Number.isFinite(atMs)) return null;

  const nearest = track
    .filter((point) => typeof point.lat === "number" && typeof point.lon === "number")
    .map((point) => ({
      point,
      deltaMs: Math.abs(new Date(point.at).getTime() - atMs),
    }))
    .filter((item) => Number.isFinite(item.deltaMs))
    .sort((a, b) => a.deltaMs - b.deltaMs)[0]?.point;

  return nearest && typeof nearest.lat === "number" && typeof nearest.lon === "number"
    ? { lat: nearest.lat, lon: nearest.lon }
    : null;
}

export function tackRecordFromCalibration(
  calibration: TackCalibrationResult,
  track: TackCalibrationTrackPoint[],
  context: { windFromDeg?: number | null } = {},
): TackRecord {
  const speedSamples = trackWindow(track, calibration.at, 20, 35)
    .map((point) => speedKt(point.sogMps))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const avgSpeed = average(speedSamples);

  return {
    id: `tack-record-${calibration.id}`,
    atISO: calibration.at,
    halfAngleDeg: calibration.halfAngleDeg,
    tackThroughDeg: calibration.tackThroughDeg,
    beforeCogDeg: calibration.beforeCogDeg,
    afterCogDeg: calibration.afterCogDeg,
    confidence: calibration.confidence,
    sogKt: avgSpeed == null ? null : Number(avgSpeed.toFixed(2)),
    windFromDeg:
      typeof context.windFromDeg === "number" && Number.isFinite(context.windFromDeg)
        ? wrap360(context.windFromDeg)
        : null,
    position: nearestPosition(track, calibration.at),
    sourceCalibrationId: calibration.id,
  };
}

export function detectAutomaticTackCalibrations(
  track: TackCalibrationTrackPoint[],
): TackCalibrationResult[] {
  const sortedTrack = track
    .filter((point) => point.cogDeg != null)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));

  if (sortedTrack.length < 8) return [];

  const firstMs = new Date(sortedTrack[0].at).getTime();
  const lastMs = new Date(sortedTrack[sortedTrack.length - 1].at).getTime();
  if (!Number.isFinite(firstMs) || !Number.isFinite(lastMs)) return [];

  const candidates: TackCalibrationResult[] = [];

  for (
    let tackStartedAtMs = firstMs + BEFORE_WINDOW_MS;
    tackStartedAtMs <= lastMs - AFTER_SETTLE_MS - AFTER_WINDOW_MS;
    tackStartedAtMs += AUTO_SCAN_STEP_MS
  ) {
    try {
      const result = calculateTackCalibration(sortedTrack, tackStartedAtMs);
      candidates.push({
        ...result,
        id: autoId(tackStartedAtMs, result.beforeCogDeg, result.afterCogDeg),
        at: new Date(tackStartedAtMs).toISOString(),
        source: "auto",
      });
    } catch {
      // Most scan windows are not tacks; ignore invalid windows.
    }
  }

  const clusters: TackCalibrationResult[][] = [];

  for (const candidate of candidates) {
    const candidateMs = new Date(candidate.at).getTime();
    const cluster = clusters.find((items) => {
      const firstItemMs = new Date(items[0].at).getTime();
      return Math.abs(candidateMs - firstItemMs) <= AUTO_DEDUPE_WINDOW_MS;
    });

    if (cluster) cluster.push(candidate);
    else clusters.push([candidate]);
  }

  return clusters
    .map((cluster) =>
      cluster.slice().sort((a, b) => scoreTack(b) - scoreTack(a))[0],
    )
    .sort((a, b) => a.at.localeCompare(b.at));
}

function scoreTackRecord(record: TackRecord) {
  const confidenceScore =
    record.confidence === "high" ? 3 : record.confidence === "medium" ? 2 : 1;
  const speedScore = record.sogKt == null ? 0 : Math.min(record.sogKt, 7) / 7;
  return confidenceScore * 100 + speedScore;
}

export function detectAutomaticTackRecords(
  track: TackCalibrationTrackPoint[],
  context: { windFromDeg?: number | null } = {},
): TackRecord[] {
  return detectAutomaticTackCalibrations(track).map((calibration) =>
    tackRecordFromCalibration(calibration, track, context),
  );
}

export function mergeTackRecords(existing: TackRecord[], incoming: TackRecord[]) {
  const merged = [...existing];

  for (const next of incoming) {
    const nextMs = new Date(next.atISO).getTime();
    const duplicateIndex = merged.findIndex((current) => {
      if (current.id === next.id || current.sourceCalibrationId === next.sourceCalibrationId) {
        return true;
      }

      const currentMs = new Date(current.atISO).getTime();
      return Math.abs(currentMs - nextMs) <= AUTO_DEDUPE_WINDOW_MS;
    });

    if (duplicateIndex >= 0) {
      if (scoreTackRecord(next) > scoreTackRecord(merged[duplicateIndex])) {
        merged[duplicateIndex] = next;
      }
    } else {
      merged.push(next);
    }
  }

  return merged
    .sort((a, b) => a.atISO.localeCompare(b.atISO))
    .slice(-MAX_STORED_TACK_RECORDS);
}

export function mergeTackCalibrations(
  existing: TackCalibrationResult[],
  incoming: TackCalibrationResult[],
) {
  const merged = [...existing];

  for (const next of incoming) {
    const nextMs = new Date(next.at).getTime();
    const duplicateIndex = merged.findIndex((current) => {
      if (current.id === next.id) return true;
      if (current.source !== "auto" || next.source !== "auto") return false;
      const currentMs = new Date(current.at).getTime();
      return Math.abs(currentMs - nextMs) <= AUTO_DEDUPE_WINDOW_MS;
    });

    if (duplicateIndex >= 0) {
      if (scoreTack(next) > scoreTack(merged[duplicateIndex])) {
        merged[duplicateIndex] = next;
      }
    } else {
      merged.push(next);
    }
  }

  return merged
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-MAX_STORED_CALIBRATIONS);
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
    JSON.stringify(results.slice(-MAX_STORED_CALIBRATIONS))
  );
}

export function getRaceDayHalfAngle(results: TackCalibrationResult[]) {
  if (results.length === 0) return null;

  const recent = results
    .filter((result) => result.confidence !== "low")
    .slice(-8);

  if (recent.length > 0) {
    const totalWeight = recent.reduce(
      (sum, result) => sum + confidenceWeight(result.confidence),
      0,
    );
    return recent.reduce(
      (sum, result) =>
        sum + result.halfAngleDeg * confidenceWeight(result.confidence),
      0,
    ) / totalWeight;
  }

  const fallback = results.slice(-5).map((result) => result.halfAngleDeg);
  const sorted = [...fallback].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function getKnownStandardTackAngle(
  records: TackRecord[],
  fallbackCalibrations: TackCalibrationResult[] = [],
) {
  const usableRecords = records
    .filter((record) => record.confidence !== "low")
    .slice(-8);

  if (usableRecords.length > 0) {
    const totalWeight = usableRecords.reduce(
      (sum, record) => sum + confidenceWeight(record.confidence),
      0,
    );
    return usableRecords.reduce(
      (sum, record) => sum + record.halfAngleDeg * confidenceWeight(record.confidence),
      0,
    ) / totalWeight;
  }

  return getRaceDayHalfAngle(fallbackCalibrations);
}

export function getTackShiftLabel(result: TackCalibrationResult) {
  const shift = angleDiffDeg(result.beforeCogDeg, result.afterCogDeg);
  return shift > 0 ? "right turn" : "left turn";
}
