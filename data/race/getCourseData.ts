import { getActiveCourseGeometry } from "./eventDatabase";

const courseGeometry = getActiveCourseGeometry();

type CourseGeometry = typeof courseGeometry;
type MarkId = keyof CourseGeometry["marks"];
type CourseId = keyof CourseGeometry["courses"];

export type RaceMark = CourseGeometry["marks"][MarkId];

export type RaceLeg = {
  legNumber: number;
  fromMark: MarkId;
  toMark: MarkId;
  bearingDeg: number;
  distanceNmCalculated: number;
};

export type RaceCourse = {
  sequence: MarkId[] | null;
  distanceNmSI: number | null;
  distanceNmCalculated: number | null;
  legs: RaceLeg[];
  custom?: boolean;
  notes?: string;
};

export type CourseSummary = {
  courseId: CourseId;
  course: RaceCourse;
  marks: Partial<Record<MarkId, RaceMark>>;
  firstMark: MarkId | null;
  firstLeg: RaceLeg | null;
  lastLeg: RaceLeg | null;
  totalLegs: number;
  totalDistanceNmSI: number | null;
  totalDistanceNmCalculated: number | null;
  startFinishMark: MarkId;
  specialRoutingNotes: string[];
};

function assertCourseExists(courseId: string): asserts courseId is CourseId {
  if (!(courseId in courseGeometry.courses)) {
    throw new Error(`Unknown course ID: ${courseId}`);
  }
}

export function getCourseData(courseId: string): CourseSummary {
  assertCourseExists(courseId);

  const course = courseGeometry.courses[courseId] as RaceCourse;
  const sequence = (course.sequence ?? []) as MarkId[];
  const uniqueMarks = [...new Set(sequence)];
  const marks = Object.fromEntries(
    uniqueMarks.map((markId) => [markId, courseGeometry.marks[markId as MarkId]])
  ) as Partial<Record<MarkId, RaceMark>>;

  return {
    courseId,
    course,
    marks,
    firstMark: sequence.length > 1 ? sequence[1] : null,
    firstLeg: course.legs[0] ? {
      legNumber: course.legs[0].legNumber,
      fromMark: course.legs[0].fromMark as MarkId,
      toMark: course.legs[0].toMark as MarkId,
      bearingDeg: course.legs[0].bearingDeg,
      distanceNmCalculated: course.legs[0].distanceNmCalculated
    } : null,
    lastLeg: course.legs[course.legs.length - 1] ? {
      legNumber: course.legs[course.legs.length - 1].legNumber,
      fromMark: course.legs[course.legs.length - 1].fromMark as MarkId,
      toMark: course.legs[course.legs.length - 1].toMark as MarkId,
      bearingDeg: course.legs[course.legs.length - 1].bearingDeg,
      distanceNmCalculated: course.legs[course.legs.length - 1].distanceNmCalculated
    } : null,
    totalLegs: course.legs.length,
    totalDistanceNmSI: course.distanceNmSI,
    totalDistanceNmCalculated: course.distanceNmCalculated,
    startFinishMark: courseGeometry.startFinishMark as MarkId,
    specialRoutingNotes: courseGeometry.specialRoutingNotes
  };
}

export function getAllCourseIds(): CourseId[] {
  return Object.keys(courseGeometry.courses) as CourseId[];
}

export function isCustomCourse(courseId: string): boolean {
  assertCourseExists(courseId);
  const course = courseGeometry.courses[courseId] as RaceCourse;
  return Boolean(course.custom);
}
