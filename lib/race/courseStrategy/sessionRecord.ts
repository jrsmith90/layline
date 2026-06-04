import type {
  CourseStrategyAnswers,
  CourseStrategyRecord,
  CourseStrategyResult,
} from "@/lib/race/courseStrategy/types";
import { normalizeCourseStrategyLaylines } from "@/lib/race/courseStrategy/laylineHeading";

export function buildCourseStrategyRecord(params: {
  answers: CourseStrategyAnswers;
  result: CourseStrategyResult;
  savedAtISO?: string;
}): CourseStrategyRecord {
  const answers = normalizeCourseStrategyLaylines(params.answers);

  return {
    savedAtISO: params.savedAtISO ?? new Date().toISOString(),
    courseId: answers.courseId,
    zones: answers.zones,
    openingLegBearingDeg: answers.openingLegBearingDeg,
    firstMarkDistance: answers.firstMarkDistance,
    strategyNotes: answers.strategyNotes,
    keyRisks: params.result.keyRisks,
    recommendations: params.result.recommendations,
    referenceBasis: params.result.referenceBasis,
  };
}
