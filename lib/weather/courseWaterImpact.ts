import {
  getDownwindTargetSpeedKt,
  getUpwindTargetSpeedKt,
} from "@/lib/race/polarSpeeds";

export type CourseWaterImpactInput = {
  legBearingDeg: number;
  windFromDeg: number;
  windSpeedKt: number;
  currentToDeg: number;
  currentSpeedKt: number;
};

export type CourseWaterImpact = {
  targetBoatSpeedKt: number;
  baseWindAngleDeg: number;
  correctedHeadingDeg: number | null;
  headingCorrectionDeg: number | null;
  courseSpeedKt: number | null;
  speedDeltaKt: number | null;
  currentAlongCourseKt: number;
  currentAcrossCourseKt: number;
  status: "favorable" | "adverse" | "neutral" | "unworkable";
};

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function degrees(radiansValue: number) {
  return (radiansValue * 180) / Math.PI;
}

function wrap360(value: number) {
  return ((value % 360) + 360) % 360;
}

function signedAngle(fromDeg: number, toDeg: number) {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

function targetSpeedForWindAngle(windSpeedKt: number, windAngleDeg: number) {
  const upwind = getUpwindTargetSpeedKt(windSpeedKt);
  const downwind = getDownwindTargetSpeedKt(windSpeedKt);
  const normalizedAngle = Math.min(180, Math.abs(windAngleDeg));

  // Blend the existing polar targets through the reach range until dedicated
  // boat polars are imported.
  const downwindWeight = Math.min(1, Math.max(0, (normalizedAngle - 45) / 90));
  return upwind + (downwind - upwind) * downwindWeight;
}

export function assessCourseWaterImpact(input: CourseWaterImpactInput): CourseWaterImpact {
  const baseWindAngleDeg = Math.abs(signedAngle(input.windFromDeg, input.legBearingDeg));
  const targetBoatSpeedKt = targetSpeedForWindAngle(input.windSpeedKt, baseWindAngleDeg);
  const currentAngleDeg = signedAngle(input.legBearingDeg, input.currentToDeg);
  const currentAlongCourseKt = input.currentSpeedKt * Math.cos(radians(currentAngleDeg));
  const currentAcrossCourseKt = input.currentSpeedKt * Math.sin(radians(currentAngleDeg));

  if (Math.abs(currentAcrossCourseKt) >= targetBoatSpeedKt) {
    return {
      targetBoatSpeedKt,
      baseWindAngleDeg,
      correctedHeadingDeg: null,
      headingCorrectionDeg: null,
      courseSpeedKt: null,
      speedDeltaKt: null,
      currentAlongCourseKt,
      currentAcrossCourseKt,
      status: "unworkable",
    };
  }

  const headingCorrectionDeg = degrees(
    Math.asin(-currentAcrossCourseKt / targetBoatSpeedKt),
  );
  const courseSpeedKt =
    targetBoatSpeedKt * Math.cos(radians(headingCorrectionDeg)) + currentAlongCourseKt;
  const speedDeltaKt = courseSpeedKt - targetBoatSpeedKt;
  const status =
    speedDeltaKt > 0.15 ? "favorable" : speedDeltaKt < -0.15 ? "adverse" : "neutral";

  return {
    targetBoatSpeedKt,
    baseWindAngleDeg,
    correctedHeadingDeg: wrap360(input.legBearingDeg + headingCorrectionDeg),
    headingCorrectionDeg,
    courseSpeedKt,
    speedDeltaKt,
    currentAlongCourseKt,
    currentAcrossCourseKt,
    status,
  };
}
