import type { BoatDataQuality, Reading } from "./types";

export const MPS_TO_KT = 1.943844;

export function metersPerSecondToKnots(mps: number): number {
  return mps * MPS_TO_KT;
}

export function knotsToMetersPerSecond(kt: number): number {
  return kt / MPS_TO_KT;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function wrapSigned180(deg: number): number {
  const wrapped = wrap360(deg);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

type NumericRange = { min: number; max: number };

const PLAUSIBLE_RANGES: Record<string, NumericRange> = {
  speedKt: { min: 0, max: 45 },
  headingDeg: { min: 0, max: 360 },
  windAngleDeg: { min: -180, max: 360 },
  windSpeedKt: { min: 0, max: 90 },
  depthM: { min: 0, max: 300 },
  tempC: { min: -5, max: 45 },
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
  distanceNm: { min: 0, max: 500 },
};

export function classifyNumericQuality(
  value: number,
  rangeKey: keyof typeof PLAUSIBLE_RANGES,
): BoatDataQuality {
  if (!Number.isFinite(value)) return "invalid";
  const range = PLAUSIBLE_RANGES[rangeKey];
  if (value < range.min || value > range.max) return "suspect";
  return "valid";
}

export function computeAgeSeconds(normalizedTimestamp: string, nowMs: number): number {
  const observedAtMs = new Date(normalizedTimestamp).getTime();
  if (Number.isNaN(observedAtMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - observedAtMs) / 1000);
}

export function createReading<T>(params: {
  value: T;
  source: string;
  sourceDevice?: string;
  rawTimestamp: string;
  nowMs: number;
  quality?: BoatDataQuality;
}): Reading<T> {
  const normalizedTimestamp = new Date(params.nowMs).toISOString();
  return {
    value: params.value,
    source: params.source,
    sourceDevice: params.sourceDevice,
    rawTimestamp: params.rawTimestamp,
    normalizedTimestamp,
    quality: params.quality ?? "valid",
    ageSeconds: computeAgeSeconds(normalizedTimestamp, params.nowMs),
  };
}

export function refreshReadingAge<T>(reading: Reading<T>, nowMs: number): Reading<T> {
  return {
    ...reading,
    ageSeconds: computeAgeSeconds(reading.normalizedTimestamp, nowMs),
  };
}

/**
 * Picks a single reading among candidate sources for the same field.
 * Sources never get averaged/merged - one wins, per "never silently combine conflicting sources".
 */
export function resolvePreferredSource<T>(
  candidates: Array<Reading<T> | null | undefined>,
  options: { manualPriority?: string[] } = {},
): Reading<T> | null {
  const present = candidates.filter((reading): reading is Reading<T> => Boolean(reading));
  if (present.length === 0) return null;

  const { manualPriority } = options;

  if (manualPriority && manualPriority.length > 0) {
    for (const sourceId of manualPriority) {
      const match = present.find(
        (reading) => reading.source === sourceId && reading.quality !== "invalid",
      );
      if (match) return match;
    }
  }

  const valid = present.filter((reading) => reading.quality === "valid");
  const pool = valid.length > 0 ? valid : present;

  return pool.reduce((latest, candidate) =>
    candidate.normalizedTimestamp > latest.normalizedTimestamp ? candidate : latest,
  );
}
