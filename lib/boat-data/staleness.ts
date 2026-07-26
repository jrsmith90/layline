import type { BoatDataFieldKey, BoatDataSnapshot, Reading } from "./types";
import { computeAgeSeconds } from "./normalizer";

export type Freshness = "unknown" | "fresh" | "aging" | "stale";

type StalenessClass = "navigation" | "wind" | "depth" | "performance";

const STALENESS_THRESHOLDS_MS: Record<StalenessClass, { freshMs: number; staleMs: number }> = {
  navigation: { freshMs: 3000, staleMs: 10000 },
  wind: { freshMs: 5000, staleMs: 15000 },
  depth: { freshMs: 8000, staleMs: 20000 },
  performance: { freshMs: 10000, staleMs: 30000 },
};

const FIELD_STALENESS_CLASS: Record<BoatDataFieldKey, StalenessClass> = {
  position: "navigation",
  gpsAccuracyM: "navigation",
  sogKt: "navigation",
  cogTrueDeg: "navigation",
  headingTrueDeg: "navigation",
  headingMagneticDeg: "navigation",
  magneticVariationDeg: "navigation",
  distanceToWaypointNm: "navigation",
  bearingToWaypointDeg: "navigation",
  crossTrackErrorNm: "navigation",
  speedThroughWaterKt: "navigation",
  targetBoatSpeedKt: "performance",
  targetPercentage: "performance",
  vmgKt: "performance",
  upwindVmgKt: "performance",
  downwindVmgKt: "performance",
  awaDeg: "wind",
  awsKt: "wind",
  twaDeg: "wind",
  twsKt: "wind",
  twdDeg: "wind",
  depthBelowTransducerM: "depth",
  depthBelowKeelM: "depth",
  depthBelowSurfaceM: "depth",
  waterTempC: "depth",
  polarTargetSpeedKt: "performance",
  polarTargetAngleDeg: "performance",
  performancePercentage: "performance",
  liftHeaderDeg: "performance",
  currentTack: "performance",
  favoredTack: "performance",
  estimatedCurrentDirectionDeg: "performance",
  estimatedCurrentSpeedKt: "performance",
};

export function getReadingFreshness<T>(
  field: BoatDataFieldKey,
  reading: Reading<T> | null,
  nowMs: number,
): Freshness {
  if (!reading) return "unknown";
  const ageSeconds = computeAgeSeconds(reading.normalizedTimestamp, nowMs);
  const stalenessClass = FIELD_STALENESS_CLASS[field];
  const thresholds = STALENESS_THRESHOLDS_MS[stalenessClass];
  const ageMs = ageSeconds * 1000;
  if (ageMs <= thresholds.freshMs) return "fresh";
  if (ageMs <= thresholds.staleMs) return "aging";
  return "stale";
}

export function isFieldStale<T>(
  field: BoatDataFieldKey,
  reading: Reading<T> | null,
  nowMs: number,
): boolean {
  return getReadingFreshness(field, reading, nowMs) === "stale";
}

export function countStaleFields(snapshot: BoatDataSnapshot, nowMs: number): number {
  let count = 0;
  for (const key of Object.keys(FIELD_STALENESS_CLASS) as BoatDataFieldKey[]) {
    const reading = snapshot[key] as Reading<unknown> | null;
    if (reading && isFieldStale(key, reading, nowMs)) count += 1;
  }
  return count;
}
