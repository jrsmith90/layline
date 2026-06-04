import type { CourseSummary } from "@/data/race/getCourseData";
import type { CourseZone, CourseStrategyAnswers } from "@/lib/race/courseStrategy/types";
import { roundUpLaylineHeadingDeg } from "@/lib/race/courseStrategy/laylineHeading";
import { detectOpeningLegSailingMode } from "@/lib/race/openingLegType";

function normalizeAngle(deg: number): number {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

function generateDefaultZones(
  courseId: string,
  courseData: CourseSummary | null,
  windDirectionDeg: number | null,
  tackAngleDeg: number = 42,
): CourseZone[] {
  const firstLegBearing = courseData?.firstLeg?.bearingDeg ?? 0;

  if (!windDirectionDeg) {
    return [
      {
        id: "port",
        label: "Port",
        headingDeg: null,
        description: "Port side approach",
        windShiftRisk: "unknown",
        windShiftLocation: "",
        currentEffect: "unknown",
        laylineHeadingDeg: null,
        notes: "",
      },
      {
        id: "starboard",
        label: "Starboard",
        headingDeg: null,
        description: "Starboard side approach",
        windShiftRisk: "unknown",
        windShiftLocation: "",
        currentEffect: "unknown",
        laylineHeadingDeg: null,
        notes: "",
      },
    ];
  }

  const openingLegType = detectOpeningLegSailingMode({
    firstLegBearingDeg: firstLegBearing,
    windDirectionDeg,
    laylineDeg: tackAngleDeg,
  });

  let portZone: CourseZone;
  let starboardZone: CourseZone;

  if (openingLegType === "upwind" || openingLegType === "reach") {
    const portTackHeading = normalizeAngle(windDirectionDeg - tackAngleDeg);
    const starboardTackHeading = normalizeAngle(windDirectionDeg + tackAngleDeg);

    portZone = {
      id: "port",
      label: "Port Tack",
      headingDeg: portTackHeading,
      description: "Port side / port tack approach to first mark",
      windShiftRisk: "unknown",
      windShiftLocation: "monitor near shore",
      currentEffect: "unknown",
      laylineHeadingDeg: roundUpLaylineHeadingDeg(firstLegBearing),
      notes: "",
    };

    starboardZone = {
      id: "starboard",
      label: "Starboard Tack",
      headingDeg: starboardTackHeading,
      description: "Starboard side / starboard tack approach to first mark",
      windShiftRisk: "unknown",
      windShiftLocation: "monitor middle / offshore",
      currentEffect: "unknown",
      laylineHeadingDeg: roundUpLaylineHeadingDeg(firstLegBearing),
      notes: "",
    };
  } else {
    const portGybeHeading = normalizeAngle(windDirectionDeg + 135);
    const starboardGybeHeading = normalizeAngle(windDirectionDeg - 135);

    portZone = {
      id: "port",
      label: "Port Gybe",
      headingDeg: portGybeHeading,
      description: "Port gybe downwind approach to first mark",
      windShiftRisk: "unknown",
      windShiftLocation: "monitor near mark",
      currentEffect: "unknown",
      laylineHeadingDeg: roundUpLaylineHeadingDeg(firstLegBearing),
      notes: "",
    };

    starboardZone = {
      id: "starboard",
      label: "Starboard Gybe",
      headingDeg: starboardGybeHeading,
      description: "Starboard gybe downwind approach to first mark",
      windShiftRisk: "unknown",
      windShiftLocation: "monitor near mark",
      currentEffect: "unknown",
      laylineHeadingDeg: roundUpLaylineHeadingDeg(firstLegBearing),
      notes: "",
    };
  }

  return [portZone, starboardZone];
}

export function getCourseStrategyDefaults(
  courseId: string,
  courseData: CourseSummary | null,
  windDirectionDeg: number | null,
  tackAngleDeg: number = 42,
): CourseStrategyAnswers {
  const zones = generateDefaultZones(courseId, courseData, windDirectionDeg, tackAngleDeg);
  const firstLegBearing = courseData?.firstLeg?.bearingDeg ?? null;
  const firstMarkDistance = courseData?.firstLeg?.distanceNmCalculated ?? null;

  return {
    courseId,
    zones,
    openingLegBearingDeg: firstLegBearing,
    firstMarkDistance,
    strategyNotes: "",
  };
}
