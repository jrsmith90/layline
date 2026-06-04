import type { CourseStrategyAnswers, CourseZone } from "@/lib/race/courseStrategy/types";

function normalizeHeadingDeg(deg: number): number {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

export function roundUpLaylineHeadingDeg(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = normalizeHeadingDeg(value);
  return normalized === 0 ? 0 : Math.ceil(normalized);
}

export function normalizeCourseStrategyZoneLayline(zone: CourseZone): CourseZone {
  return {
    ...zone,
    laylineHeadingDeg: roundUpLaylineHeadingDeg(zone.laylineHeadingDeg),
  };
}

export function normalizeCourseStrategyLaylines(
  answers: CourseStrategyAnswers,
): CourseStrategyAnswers {
  return {
    ...answers,
    zones: answers.zones.map(normalizeCourseStrategyZoneLayline),
  };
}
