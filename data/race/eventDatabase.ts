import hellyHansen2026CourseGeometry from "../../race/course-geometry-2026-hhsw-distance.json";
import eweSpiritCup2026CourseGeometry from "../../race/course-geometry-2026-scc-ewe-spirit-cup.json";

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
