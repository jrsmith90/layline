import hellyHansen2026CourseGeometryRaw from "../../race/course-geometry-2026-hhsw-distance.json";
import eweSpiritCup2026CourseGeometryRaw from "../../race/course-geometry-2026-scc-ewe-spirit-cup.json";
import {
  ANNAPOLIS_LOCAL_EVENT_MARKS,
  pickAnnapolisMarks,
} from "./annapolisMarkDataset";

export type RaceEventStatus = "upcoming" | "active" | "archived";

export type RaceCourseMarkRecord = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  characteristics: string;
};

export type RaceCourseLegRecord = {
  legNumber: number;
  fromMark: string;
  toMark: string;
  bearingDeg: number;
  distanceNmCalculated: number;
};

export type RaceCourseConstraintRecord = {
  id: string;
  type: "pass_on_channel_side";
  appliesTo: "all_keelboat_classes";
  markLabel: string;
  markName: string;
  markKey?: string;
  detail?: string;
};

export type RaceCourseRecord = {
  sequence: string[] | null;
  distanceNmSI: number | null;
  distanceNmCalculated: number | null;
  legs: RaceCourseLegRecord[];
  custom?: boolean;
  notes?: string;
};

export type RaceCourseGeometry = {
  event: {
    name: string;
    location: string;
    dates: string;
    source: string;
  };
  startFinishMark: string;
  marks: Record<string, RaceCourseMarkRecord>;
  courses: Record<string, RaceCourseRecord>;
  specialRoutingNotes: string[];
  specialRoutingConstraints: RaceCourseConstraintRecord[];
};

export type RaceEventRecord = {
  id: string;
  year: number;
  name: string;
  location: string;
  dates: string;
  status: RaceEventStatus;
  sourceDocuments: string[];
  courseGeometry: RaceCourseGeometry;
};

const EWE_CHANNEL_SIDE_NOTE =
  'The following marks shall always be passed on the channel side for keelboat classes: "1AH" at Tolly Point, FL R 6s 15ft 4M "4" off Greenbury Point, and FL 6s 15ft 4M "HP" shoal pole.';

const EWE_CHANNEL_SIDE_CONSTRAINTS: RaceCourseConstraintRecord[] = [
  {
    id: "ewe-tolly-point-1ah-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: '"1AH"',
    markName: "Tolly Point light",
    markKey: "M",
  },
  {
    id: "ewe-greenbury-4-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: 'FL R 6s 15ft 4M "4"',
    markName: "Greenbury Point buoy 4",
  },
  {
    id: "ewe-horn-point-hp-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: 'FL 6s 15ft 4M "HP"',
    markName: "Horn Point shoal pole",
    detail: "Also referred to as the HP shoal pole in the sailing instructions.",
  },
];

const hellyHansen2026CourseGeometry: RaceCourseGeometry = {
  ...hellyHansen2026CourseGeometryRaw,
  marks: pickAnnapolisMarks(["A", "D", "E", "G", "H", "X", "Z", "M", "N"]),
  specialRoutingConstraints: [],
};

const ewePursuitTriangleCourse: RaceCourseRecord = {
  ...eweSpiritCup2026CourseGeometryRaw.courses.medium,
  notes:
    'Pursuit triangle using GC "7", G "91", and G "WR87". The course may be sailed either direction with both turning marks left to port.',
};

const ewePursuitTriangleCourseReverse: RaceCourseRecord = {
  ...eweSpiritCup2026CourseGeometryRaw.courses.mediumR,
  notes:
    'Pursuit triangle reverse using GC "7", G "WR87", and G "91". The course may be sailed either direction with both turning marks left to port.',
};

const eweSpiritCup2026CourseGeometry: RaceCourseGeometry = {
  ...eweSpiritCup2026CourseGeometryRaw,
  marks: pickAnnapolisMarks(["C", "D", "G", "M"], {
    C: ANNAPOLIS_LOCAL_EVENT_MARKS.C,
  }),
  specialRoutingNotes: eweSpiritCup2026CourseGeometryRaw.specialRoutingNotes.filter(
    (note) => note !== EWE_CHANNEL_SIDE_NOTE,
  ),
  specialRoutingConstraints: EWE_CHANNEL_SIDE_CONSTRAINTS,
  courses: {
    short: ewePursuitTriangleCourse,
    shortR: ewePursuitTriangleCourseReverse,
    medium: ewePursuitTriangleCourse,
    mediumR: ewePursuitTriangleCourseReverse,
  },
};

export const raceEvents: RaceEventRecord[] = [
  {
    id: "2026-helly-hansen-sailing-world-regatta-series-annapolis-md",
    year: 2026,
    name: "Helly Hansen Sailing World Regatta Series",
    location: "Annapolis, MD",
    dates: "2026-05-02 to 2026-05-03",
    status: "active",
    sourceDocuments: [
      "Distance Race Sailing Instructions",
      "Attachment 1 - Race Courses",
      "Attachment 2 - Description and List of Marks"
    ],
    courseGeometry: hellyHansen2026CourseGeometry
  },
  {
    id: "2026-scc-ewe-spirit-cup-annapolis-md",
    year: 2026,
    name: "EWE Cup",
    location: "Annapolis, MD",
    dates: "2026-05-16",
    status: "active",
    sourceDocuments: [
      "2026 SCC EWE Spirit Cup Sailing Instructions",
      "Appendix A - Course Diagram",
      "YachtScoring event page 50644"
    ],
    courseGeometry: eweSpiritCup2026CourseGeometry
  }
];

export const activeRaceEventId = "2026-scc-ewe-spirit-cup-annapolis-md";

export function getRaceEvent(eventId: string): RaceEventRecord {
  const event = raceEvents.find((candidate) => candidate.id === eventId);

  if (!event) {
    throw new Error(`Unknown race event ID: ${eventId}`);
  }

  return event;
}

export function getActiveRaceEvent(): RaceEventRecord {
  return getRaceEvent(activeRaceEventId);
}

export function getActiveCourseGeometry(): RaceEventRecord["courseGeometry"] {
  return getActiveRaceEvent().courseGeometry;
}
