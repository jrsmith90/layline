import { describe, expect, it } from "vitest";
import { assessCourseWaterImpact } from "@/lib/weather/courseWaterImpact";

describe("assessCourseWaterImpact", () => {
  const baseInput = {
    legBearingDeg: 0,
    windFromDeg: 0,
    windSpeedKt: 12,
    currentToDeg: 0,
    currentSpeedKt: 1,
  };

  it("adds a fair current to expected course speed", () => {
    const assessment = assessCourseWaterImpact(baseInput);

    expect(assessment.status).toBe("favorable");
    expect(assessment.speedDeltaKt).toBeCloseTo(1, 2);
    expect(assessment.headingCorrectionDeg).toBeCloseTo(0, 2);
  });

  it("subtracts an opposing current from expected course speed", () => {
    const assessment = assessCourseWaterImpact({ ...baseInput, currentToDeg: 180 });

    expect(assessment.status).toBe("adverse");
    expect(assessment.speedDeltaKt).toBeCloseTo(-1, 2);
  });

  it("calculates a crab angle for cross-current", () => {
    const assessment = assessCourseWaterImpact({ ...baseInput, currentToDeg: 90 });

    expect(assessment.status).toBe("neutral");
    expect(assessment.headingCorrectionDeg).toBeLessThan(0);
    expect(assessment.courseSpeedKt).toBeLessThan(assessment.targetBoatSpeedKt);
  });
});
