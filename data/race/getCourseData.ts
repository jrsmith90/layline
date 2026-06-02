import {
  getCustomCourseRecord,
  getCustomCoursesForEvent,
} from "./customCourses";
import {
  getActiveRaceEvent,
  getCustomCourseMarkCatalogForEvent,
  getRaceEvent,
  raceEvents,
  type RaceCourseConstraintRecord,
  type RaceCourseGeometry,
  type RaceCourseMarkRounding,
} from "./eventDatabase";

const activeEvent = getActiveRaceEvent();

function getCourseGeometryForCustomCourse(event: typeof activeEvent) {
  return {
    ...event.courseGeometry,
    marks: getCustomCourseMarkCatalogForEvent(event),
  };
}

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
  markRoundings?: Array<RaceCourseMarkRounding | null>;
  previewSequence?: MarkId[];
  textSummary?: string[];
  distanceNmSI: number | null;
  distanceNmCalculated: number | null;
  legs: RaceLeg[];
  label?: string;
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

function formatCourseCodeLabel(courseCode: string) {
  return courseCode === "99" ? "RC / Custom" : courseCode;
}

function getResolvedCourseDisplayLabel(
  resolved: ReturnType<typeof resolveCourse> | null,
  requestedCourseId: string,
) {
  const explicitLabel = resolved?.course.label?.trim();
  if (explicitLabel) return explicitLabel;

  return formatCourseCodeLabel(resolved?.courseId ?? getCourseCode(requestedCourseId));
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

  const customCourse = getCustomCourseRecord(requestedCourseId);
  if (customCourse && customCourse.eventId === activeEvent.id) {
    return {
      event: activeEvent,
      courseId: requestedCourseId,
      displayCourseId: requestedCourseId,
      courseGeometry: getCourseGeometryForCustomCourse(activeEvent),
      course: customCourse.course,
      customCourse,
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

function buildCourseSummaryFromResolved(
  resolved: NonNullable<ReturnType<typeof resolveCourse>>,
): CourseSummary {
  const course = resolved.course as RaceCourse;
  const sequence = (course.sequence ?? []) as MarkId[];
  const previewSequence = (course.previewSequence ?? []) as MarkId[];
  const markIdsForContext =
    course.custom && sequence.length === 0
      ? Object.keys(resolved.courseGeometry.marks)
      : [...sequence, ...previewSequence];
  const contextMarks = [...new Set(markIdsForContext)];
  const marks = Object.fromEntries(
    contextMarks.map((markId) => [
      markId,
      resolved.courseGeometry.marks[markId as MarkId],
    ])
  ) as Partial<Record<MarkId, RaceMark>>;
  const derivedCourseConstraints = deriveCourseConstraints({
    courseId: resolved.displayCourseId,
    course,
    marks,
    courseGeometry: resolved.courseGeometry,
  });

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
    specialRoutingConstraints: [
      ...resolved.courseGeometry.specialRoutingConstraints,
      ...derivedCourseConstraints,
    ],
  };
}

function assertCourseExists(courseId: string): asserts courseId is CourseId {
  if (!resolveCourse(courseId)) {
    throw new Error(`Unknown course ID: ${courseId}`);
  }
}

function detectCourseRoundingType(notes: string[]) {
  if (notes.some((note) => /rounded to port/i.test(note))) {
    return "leave_to_port" as const;
  }

  if (notes.some((note) => /rounded to starboard/i.test(note))) {
    return "leave_to_starboard" as const;
  }

  return null;
}

function deriveCourseConstraints(params: {
  courseId: string;
  course: RaceCourse;
  marks: Partial<Record<MarkId, RaceMark>>;
  courseGeometry: RaceCourseGeometry;
}) {
  const turnMarkIds = (params.course.sequence ?? []).slice(1, -1);
  if (params.course.markRoundings && params.course.markRoundings.length > 0) {
    return turnMarkIds.flatMap((markId, index) => {
      const mark = params.marks[markId];
      const roundingSide = params.course.markRoundings?.[index + 1];
      if (!mark || !roundingSide) return [];

      const incomingLeg = params.course.legs[index];

      return [
        {
          id: `${params.courseId}-${markId}-${roundingSide}-${incomingLeg?.legNumber ?? index + 1}`,
          type: roundingSide === "port" ? "leave_to_port" : "leave_to_starboard",
          appliesTo: "selected_course",
          markLabel: mark.id,
          markName: mark.name,
          markKey: markId,
          legNumbers: incomingLeg ? [incomingLeg.legNumber] : undefined,
        } satisfies RaceCourseConstraintRecord,
      ];
    });
  }

  const notes = [
    params.course.notes,
    ...params.courseGeometry.specialRoutingNotes,
  ].filter((note): note is string => typeof note === "string" && note.length > 0);
  const roundingType = detectCourseRoundingType(notes);

  if (!roundingType || turnMarkIds.length === 0) {
    return [] as RaceCourseConstraintRecord[];
  }

  return turnMarkIds.flatMap((markId, index) => {
    const mark = params.marks[markId];
    if (!mark) return [];

    const incomingLeg = params.course.legs[index];

    return [
      {
        id: `${params.courseId}-${markId}-${roundingType}-${incomingLeg?.legNumber ?? index + 1}`,
        type: roundingType,
        appliesTo: "selected_course",
        markLabel: mark.id,
        markName: mark.name,
        markKey: markId,
        legNumbers: incomingLeg ? [incomingLeg.legNumber] : undefined,
      } satisfies RaceCourseConstraintRecord,
    ];
  });
}

export function getCourseData(courseId: string): CourseSummary {
  assertCourseExists(courseId);

  const resolved = resolveCourse(courseId);
  if (!resolved) {
    throw new Error(`Unknown course ID: ${courseId}`);
  }

  return buildCourseSummaryFromResolved(resolved);
}

export function buildCourseSummaryFromRecord(params: {
  courseId: string;
  course: RaceCourse;
  eventId?: string;
}): CourseSummary {
  const event = params.eventId ? getRaceEvent(params.eventId) : activeEvent;
  const courseGeometry = params.course.custom
    ? getCourseGeometryForCustomCourse(event)
    : event.courseGeometry;

  return buildCourseSummaryFromResolved({
    event,
    courseId: params.courseId,
    displayCourseId: params.courseId,
    courseGeometry,
    course: params.course,
  });
}

export function getAllCourseIds(): CourseId[] {
  const sortedEvents = [
    activeEvent,
    ...raceEvents.filter((event) => event.id !== activeEvent.id),
  ];

  const builtInCourseIds = sortedEvents.flatMap((event) =>
    Object.keys(event.courseGeometry.courses).map((courseId) =>
      event.id === activeEvent.id
        ? courseId
        : buildQualifiedCourseId(event.id, courseId)
    )
  );

  const customCourseIds = getCustomCoursesForEvent(activeEvent.id).map((course) => course.id);

  return [...builtInCourseIds, ...customCourseIds];
}

export function getCourseCode(courseId: string): string {
  return splitQualifiedCourseId(courseId)?.courseId ?? courseId;
}

export function getCourseDisplayCode(courseId: string): string {
  return getResolvedCourseDisplayLabel(resolveCourse(courseId), courseId);
}

export function formatCourseLabel(courseId: string): string {
  const resolved = resolveCourse(courseId);
  const courseCode = getResolvedCourseDisplayLabel(resolved, courseId);

  if (resolved?.course.custom) {
    return courseCode;
  }

  const eventName = resolved?.event.name ?? activeEvent.name;

  return courseCode === eventName ? courseCode : `${eventName}: ${courseCode}`;
}

export function getDefaultCourseId(): CourseId {
  const firstCourseId = getAllCourseIds()[0];

  if (!firstCourseId) {
    throw new Error("No race courses configured for the active event.");
  }

  return firstCourseId;
}

export function hasCourse(courseId: string) {
  return resolveCourse(courseId) != null;
}

export function isCustomCourse(courseId: string): boolean {
  assertCourseExists(courseId);
  const resolved = resolveCourse(courseId);
  return Boolean(resolved?.course.custom);
}
