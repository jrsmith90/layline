import courseGeometry from "../../race/course-geometry-2026-hhsw-distance.json";

type MarkId = keyof typeof courseGeometry.marks;
type CourseId = keyof typeof courseGeometry.courses;

type CourseGeometry = typeof courseGeometry;

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

  const course = courseGeometry.courses[courseId];
  const sequence = course.sequence ?? [];
  const uniqueMarks = [...new Set(sequence)];
  const marks = Object.fromEntries(
    uniqueMarks.map((markId) => [markId, courseGeometry.marks[markId]])
  ) as Partial<Record<MarkId, RaceMark>>;

  return {
    courseId,
    course,
    marks,
    firstMark: sequence.length > 1 ? sequence[1] : null,
    firstLeg: course.legs[0] ?? null,
    lastLeg: course.legs[course.legs.length - 1] ?? null,
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
  return Boolean(courseGeometry.courses[courseId].custom);
}