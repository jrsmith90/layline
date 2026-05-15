import {
  getActiveRaceEvent,
  raceEvents,
  type RaceCourseGeometry,
} from "./eventDatabase";

const activeEvent = getActiveRaceEvent();

type MarkId = string;
type CourseId = string;

export type RaceMark = RaceCourseGeometry["marks"][MarkId];

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
  eventId: string;
  eventName: string;
  eventLocation: string;
  eventDates: string;
  raceDate: string;
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
  specialRoutingConstraints: RaceCourseGeometry["specialRoutingConstraints"];
};

function getFirstRaceDate(dates: string) {
  return dates.split(" to ")[0] ?? dates;
}

function buildQualifiedCourseId(eventId: string, courseId: string) {
  return `${eventId}:${courseId}`;
}

function splitQualifiedCourseId(courseId: string) {
  const separatorIndex = courseId.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    eventId: courseId.slice(0, separatorIndex),
    courseId: courseId.slice(separatorIndex + 1),
  };
}

function resolveCourse(requestedCourseId: string) {
  const qualified = splitQualifiedCourseId(requestedCourseId);

  if (qualified) {
    const event = raceEvents.find((candidate) => candidate.id === qualified.eventId);
    const course = event?.courseGeometry.courses[qualified.courseId];

    return event && course
      ? {
          event,
          courseId: qualified.courseId,
          displayCourseId: requestedCourseId,
          courseGeometry: event.courseGeometry,
          course,
        }
      : null;
  }

  const activeCourse = activeEvent.courseGeometry.courses[requestedCourseId];
  if (activeCourse) {
    return {
      event: activeEvent,
      courseId: requestedCourseId,
      displayCourseId: requestedCourseId,
      courseGeometry: activeEvent.courseGeometry,
      course: activeCourse,
    };
  }

  for (const event of raceEvents) {
    const course = event.courseGeometry.courses[requestedCourseId];
    if (course) {
      return {
        event,
        courseId: requestedCourseId,
        displayCourseId: buildQualifiedCourseId(event.id, requestedCourseId),
        courseGeometry: event.courseGeometry,
        course,
      };
    }
  }

  return null;
}

function assertCourseExists(courseId: string): asserts courseId is CourseId {
  if (!resolveCourse(courseId)) {
    throw new Error(`Unknown course ID: ${courseId}`);
  }
}

export function getCourseData(courseId: string): CourseSummary {
  assertCourseExists(courseId);

  const resolved = resolveCourse(courseId);
  if (!resolved) {
    throw new Error(`Unknown course ID: ${courseId}`);
  }

  const course = resolved.course as RaceCourse;
  const sequence = (course.sequence ?? []) as MarkId[];
  const uniqueMarks = [...new Set(sequence)];
  const marks = Object.fromEntries(
    uniqueMarks.map((markId) => [
      markId,
      resolved.courseGeometry.marks[markId as MarkId],
    ])
  ) as Partial<Record<MarkId, RaceMark>>;

  return {
    courseId: resolved.displayCourseId,
    eventId: resolved.event.id,
    eventName: resolved.event.name,
    eventLocation: resolved.event.location,
    eventDates: resolved.event.dates,
    raceDate: getFirstRaceDate(resolved.event.dates),
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
    startFinishMark: resolved.courseGeometry.startFinishMark as MarkId,
    specialRoutingNotes: resolved.courseGeometry.specialRoutingNotes,
    specialRoutingConstraints: resolved.courseGeometry.specialRoutingConstraints,
  };
}

export function getAllCourseIds(): CourseId[] {
  const sortedEvents = [
    activeEvent,
    ...raceEvents.filter((event) => event.id !== activeEvent.id),
  ];

  return sortedEvents.flatMap((event) =>
    Object.keys(event.courseGeometry.courses).map((courseId) =>
      event.id === activeEvent.id
        ? courseId
        : buildQualifiedCourseId(event.id, courseId)
    )
  );
}

export function getCourseCode(courseId: string): string {
  return splitQualifiedCourseId(courseId)?.courseId ?? courseId;
}

export function formatCourseLabel(courseId: string): string {
  const resolved = resolveCourse(courseId);
  const courseCode = resolved?.courseId ?? getCourseCode(courseId);
  const eventName = resolved?.event.name ?? activeEvent.name;

  return `${eventName}: ${courseCode}`;
}

export function getDefaultCourseId(): CourseId {
  const firstCourseId = getAllCourseIds()[0];

  if (!firstCourseId) {
    throw new Error("No race courses configured for the active event.");
  }

  return firstCourseId;
}

export function isCustomCourse(courseId: string): boolean {
  assertCourseExists(courseId);
  const resolved = resolveCourse(courseId);
  return Boolean(resolved?.course.custom);
}
