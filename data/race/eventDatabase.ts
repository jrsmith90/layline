import hellyHansen2026CourseGeometryRaw from "../../race/course-geometry-2026-hhsw-distance.json";
import eweSpiritCup2026CourseGeometryRaw from "../../race/course-geometry-2026-scc-ewe-spirit-cup.json";
import {
  ANNAPOLIS_LOCAL_EVENT_MARKS,
  ANNAPOLIS_STANDARD_GOVERNMENT_MARKS,
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
  appliesTo: "all_keelboat_classes" | "selected_course";
  detail?: string;
  legNumbers?: number[];
} & (
  | {
      type: "pass_on_channel_side" | "leave_to_port" | "leave_to_starboard";
      markLabel: string;
      markName: string;
      markKey?: string;
    }
  | {
      type: "stay_inside_marks" | "stay_outside_marks";
      boundaryLabel: string;
      boundaryMarks: string[];
      boundaryMarkKeys?: string[];
      referenceMarkKey?: string;
    }
);

export type RaceCourseRecord = {
  sequence: string[] | null;
  previewSequence?: string[];
  textSummary?: string[];
  distanceNmSI: number | null;
  distanceNmCalculated: number | null;
  legs: RaceCourseLegRecord[];
  label?: string;
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

const HHSW_CHANNEL_SIDE_NOTE =
  'Government marks "1AH" (M), R "4" (N), Thomas Point Light, and the Bloody Point Bar Warning Light shall be passed on the channel side at all times.';

const HHSW_CHANNEL_SIDE_CONSTRAINTS: RaceCourseConstraintRecord[] = [
  {
    id: "hhsw-1ah-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: 'SG "1AH"',
    markName: "Severn River - Light 1AH",
    markKey: "M",
  },
  {
    id: "hhsw-r4-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: 'R "4"',
    markName: "Eastern Bay - Entrance Lighted Buoy 4",
    markKey: "N",
  },
  {
    id: "hhsw-thomas-point-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: "Thomas Point Light",
    markName: "Thomas Point Shoal Lighthouse",
  },
  {
    id: "hhsw-bloody-point-channel-side",
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markLabel: "Bloody Point Bar Warning Light",
    markName: "Bloody Point Bar Warning Light",
  },
];

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
  specialRoutingNotes: hellyHansen2026CourseGeometryRaw.specialRoutingNotes.filter(
    (note) => note !== HHSW_CHANNEL_SIDE_NOTE,
  ),
  specialRoutingConstraints: HHSW_CHANNEL_SIDE_CONSTRAINTS,
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

const tedSouthRiverTriangleCourse: RaceCourseRecord = {
  label: "South River Triangle",
  sequence: ["X", "H", "G", "B"],
  textSummary: [
    "Start at Severn River Entrance (X).",
    "Round South River Junction Buoy (H).",
    'Round Chesapeake Channel Buoy G "87" (G).',
    'Finish at Horn Point Buoy G "9" (B).',
  ],
  distanceNmSI: null,
  distanceNmCalculated: 10.21,
  legs: [
    {
      legNumber: 1,
      fromMark: "X",
      toMark: "H",
      bearingDeg: 186.1,
      distanceNmCalculated: 2.86,
    },
    {
      legNumber: 2,
      fromMark: "H",
      toMark: "G",
      bearingDeg: 38.0,
      distanceNmCalculated: 2.93,
    },
    {
      legNumber: 3,
      fromMark: "G",
      toMark: "B",
      bearingDeg: 308.2,
      distanceNmCalculated: 4.42,
    },
  ],
  notes: 'Route: X -> H -> G -> B.',
};

const tedSouthRiverChannelTourCourse: RaceCourseRecord = {
  label: "South River Channel Tour",
  sequence: ["X", "H", "E", "B"],
  textSummary: [
    "Start at Severn River Entrance (X).",
    "Round South River Junction Buoy (H).",
    'Round Chesapeake Channel Buoy R "86" (E).',
    'Finish at Horn Point Buoy G "9" (B).',
  ],
  distanceNmSI: null,
  distanceNmCalculated: 12.91,
  legs: [
    {
      legNumber: 1,
      fromMark: "X",
      toMark: "H",
      bearingDeg: 186.1,
      distanceNmCalculated: 2.86,
    },
    {
      legNumber: 2,
      fromMark: "H",
      toMark: "E",
      bearingDeg: 133.1,
      distanceNmCalculated: 2.48,
    },
    {
      legNumber: 3,
      fromMark: "E",
      toMark: "B",
      bearingDeg: 332.7,
      distanceNmCalculated: 7.58,
    },
  ],
  notes: 'Route: X -> H -> E -> B.',
};

const tedSouthRiverSprintCourse: RaceCourseRecord = {
  label: "South River Sprint",
  sequence: ["X", "H", "B"],
  textSummary: [
    "Start at Severn River Entrance (X).",
    "Round South River Junction Buoy (H).",
    'Finish at Horn Point Buoy G "9" (B).',
  ],
  distanceNmSI: null,
  distanceNmCalculated: 8.17,
  legs: [
    {
      legNumber: 1,
      fromMark: "X",
      toMark: "H",
      bearingDeg: 186.1,
      distanceNmCalculated: 2.86,
    },
    {
      legNumber: 2,
      fromMark: "H",
      toMark: "B",
      bearingDeg: 341.7,
      distanceNmCalculated: 5.32,
    },
  ],
  notes: 'Route: X -> H -> B.',
};

const tedOsiusTwilight2026CourseGeometry: RaceCourseGeometry = {
  event: {
    name: "Ted Osius Memorial Twilight Regatta",
    location: "Annapolis, MD",
    dates: "2026-06-06",
    source: "2026 Ted Osius Memorial Twilight Regatta Sailing Instructions with Amendment #1",
  },
  startFinishMark: "X",
  marks: pickAnnapolisMarks(
    ["D", "E", "G", "H", "M", "T", "W", "X", "Z", "B"],
    {
      E: {
        id: 'R "86"',
        name: 'Chesapeake Channel Buoy R "86"',
        lat: 38.866166666666665,
        lon: -76.3925,
        characteristics: "Fl R 4s",
      },
      G: {
        id: 'G "87"',
        name: 'Chesapeake Channel Buoy G "87"',
        lat: 38.932833333333335,
        lon: -76.3925,
        characteristics: "Q G",
      },
      H: {
        id: 'GR C "SR"',
        name: "South River Junction Buoy",
        lat: 38.894333333333336,
        lon: -76.43116666666667,
        characteristics: "",
      },
      X: {
        id: 'R "2"',
        name: "Severn River Entrance",
        lat: 38.94166666666667,
        lon: -76.42466666666667,
        characteristics: "Fl R 2.5s",
      },
      B: {
        id: 'G "9"',
        name: "Horn Point Finish",
        lat: 38.97838333333333,
        lon: -76.4669,
        characteristics:
          'Q G. Official Ted Osius finish mark at Horn Point, using the event G "9" finish designation.',
      },
    },
  ),
  courses: {
    "1": tedSouthRiverTriangleCourse,
    "2": tedSouthRiverChannelTourCourse,
    "3": tedSouthRiverSprintCourse,
  },
  specialRoutingNotes: [
    "These named South River options are the Ted Osius course set currently configured in the app.",
    'The finish mark for all three options is mark B, defined for this event as Horn Point Buoy G "9".',
    "Letters shown in red are left to port. Letters shown in green are left to starboard.",
  ],
  specialRoutingConstraints: [
    {
      id: "ted-thomas-point-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: "Thomas Point Shoal Light",
      markName: "Thomas Point Shoal Lighthouse",
    },
    {
      id: "ted-bloody-point-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: "Bloody Point Bar Warning Light",
      markName: "Bloody Point Bar Warning Light",
    },
    {
      id: "ted-greenbury-spider-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: '"A"',
      markName: 'Greenbury Point "Spider" light',
      detail:
        'The SI designates Greenbury Point "Spider" Fl Y 2.5s 15 ft as mark A for this event.',
    },
    {
      id: "ted-tolly-point-1ah-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: '"1AH"',
      markName: "Tolly Point light",
      markKey: "M",
    },
  ],
};

export const raceEvents: RaceEventRecord[] = [
  {
    id: "2026-helly-hansen-sailing-world-regatta-series-annapolis-md",
    year: 2026,
    name: "Helly Hansen Sailing World Regatta Series",
    location: "Annapolis, MD",
    dates: "2026-05-02 to 2026-05-03",
    status: "archived",
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
    status: "archived",
    sourceDocuments: [
      "2026 SCC EWE Spirit Cup Sailing Instructions",
      "Appendix A - Course Diagram",
      "YachtScoring event page 50644"
    ],
    courseGeometry: eweSpiritCup2026CourseGeometry
  },
  {
    id: "2026-ted-osius-memorial-twilight-regatta-annapolis-md",
    year: 2026,
    name: "Ted Osius Memorial Twilight Regatta",
    location: "Annapolis, MD",
    dates: "2026-06-06",
    status: "active",
    sourceDocuments: [
      "SCC 2026 racing calendar",
      "YachtScoring event page 50643"
    ],
    courseGeometry: tedOsiusTwilight2026CourseGeometry
  }
];

export const activeRaceEventId = "2026-ted-osius-memorial-twilight-regatta-annapolis-md";

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

export function getCustomCourseMarkCatalogForEvent(event: RaceEventRecord) {
  if (!/annapolis/i.test(event.location) && !/annapolis/i.test(event.name)) {
    return event.courseGeometry.marks;
  }

  return {
    ...ANNAPOLIS_STANDARD_GOVERNMENT_MARKS,
    ...event.courseGeometry.marks,
  };
}
