import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { BoatDataFieldKey } from "@/lib/boat-data/types";
import { metersPerSecondToKnots, radToDeg } from "@/lib/boat-data/normalizer";

export type SignalKUnit = "rad" | "ms" | "kelvin" | "m" | "ratio" | "none";

export type SignalKPathMapping = {
  path: string;
  field: BoatDataFieldKey;
  unit: SignalKUnit;
};

export const DEFAULT_SIGNALK_PATH_MAPPINGS: SignalKPathMapping[] = [
  { path: "navigation.position", field: "position", unit: "none" },
  { path: "navigation.speedOverGround", field: "sogKt", unit: "ms" },
  { path: "navigation.courseOverGroundTrue", field: "cogTrueDeg", unit: "rad" },
  { path: "navigation.headingTrue", field: "headingTrueDeg", unit: "rad" },
  { path: "navigation.headingMagnetic", field: "headingMagneticDeg", unit: "rad" },
  { path: "navigation.magneticVariation", field: "magneticVariationDeg", unit: "rad" },
  { path: "navigation.speedThroughWater", field: "speedThroughWaterKt", unit: "ms" },
  {
    path: "navigation.courseGreatCircle.nextPoint.distance",
    field: "distanceToWaypointNm",
    unit: "m",
  },
  {
    path: "navigation.courseGreatCircle.nextPoint.bearingTrue",
    field: "bearingToWaypointDeg",
    unit: "rad",
  },
  {
    path: "navigation.courseGreatCircle.crossTrackError",
    field: "crossTrackErrorNm",
    unit: "m",
  },
  { path: "environment.wind.angleApparent", field: "awaDeg", unit: "rad" },
  { path: "environment.wind.speedApparent", field: "awsKt", unit: "ms" },
  { path: "environment.wind.angleTrueWater", field: "twaDeg", unit: "rad" },
  { path: "environment.wind.speedTrue", field: "twsKt", unit: "ms" },
  { path: "environment.wind.directionTrue", field: "twdDeg", unit: "rad" },
  { path: "environment.depth.belowTransducer", field: "depthBelowTransducerM", unit: "m" },
  { path: "environment.depth.belowKeel", field: "depthBelowKeelM", unit: "m" },
  { path: "environment.depth.belowSurface", field: "depthBelowSurfaceM", unit: "m" },
  { path: "environment.water.temperature", field: "waterTempC", unit: "kelvin" },
  { path: "performance.velocityMadeGood", field: "vmgKt", unit: "ms" },
  { path: "performance.targetSpeed", field: "targetBoatSpeedKt", unit: "ms" },
];

const METERS_TO_NM = 1 / 1852;

export function convertSignalKValue(unit: SignalKUnit, rawValue: number): number {
  switch (unit) {
    case "rad":
      return radToDeg(rawValue);
    case "ms":
      return metersPerSecondToKnots(rawValue);
    case "kelvin":
      return rawValue - 273.15;
    case "m":
      return rawValue * METERS_TO_NM;
    case "ratio":
      return rawValue * 100;
    case "none":
    default:
      return rawValue;
  }
}

export type SignalKPathOverride = {
  field: BoatDataFieldKey;
  path: string;
};

function readOverrides(): SignalKPathOverride[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.boatDataPathMappingOverrides);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOverrides(overrides: SignalKPathOverride[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.boatDataPathMappingOverrides, JSON.stringify(overrides));
}

export function getEffectivePathMappings(): SignalKPathMapping[] {
  const overrides = readOverrides();
  if (overrides.length === 0) return DEFAULT_SIGNALK_PATH_MAPPINGS;

  const overrideByField = new Map(overrides.map((override) => [override.field, override.path]));

  return DEFAULT_SIGNALK_PATH_MAPPINGS.map((mapping) => {
    const overridePath = overrideByField.get(mapping.field);
    return overridePath ? { ...mapping, path: overridePath } : mapping;
  });
}

export function buildPathToFieldIndex(
  mappings: SignalKPathMapping[] = getEffectivePathMappings(),
): Map<string, SignalKPathMapping> {
  return new Map(mappings.map((mapping) => [mapping.path, mapping]));
}
