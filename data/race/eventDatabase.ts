import hellyHansen2026CourseGeometryRaw from "../../race/course-geometry-2026-hhsw-distance.json";
import eweSpiritCup2026CourseGeometryRaw from "../../race/course-geometry-2026-scc-ewe-spirit-cup.json";
import {
  ANNAPOLIS_LOCAL_EVENT_MARKS,
  ANNAPOLIS_SUPPLEMENTAL_PLOTTER_MARKS,
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
  shortName?: string;
  labelHint?: string;
  markType?: "government_buoy" | "government_light";
  markColor?: string;
};

export type RaceCourseLegRecord = {
  legNumber: number;
  fromMark: string;
  toMark: string;
  bearingDeg: number;
  distanceNmCalculated: number;
};

export type RaceCourseMarkRounding = "port" | "starboard";

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
  markRoundings?: Array<RaceCourseMarkRounding | null>;
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

const tedDeadTedCourse: RaceCourseRecord = {
  label: "The Dead Ted",
  sequence: ["X", "G", "E", "M", "B"],
  textSummary: [
    "Start at Severn River Entrance (X).",
    'Round Chesapeake Channel Buoy G "87" (G).',
    'Round Chesapeake Channel Buoy R "86" (E).',
    "Round Severn River - Light 1AH (M).",
    'Finish at Horn Point Buoy G "9" (B).',
  ],
  distanceNmSI: null,
  distanceNmCalculated: 13.26,
  legs: [
    {
      legNumber: 1,
      fromMark: "X",
      toMark: "G",
      bearingDeg: 109.4,
      distanceNmCalculated: 1.59,
    },
    {
      legNumber: 2,
      fromMark: "G",
      toMark: "E",
      bearingDeg: 180.0,
      distanceNmCalculated: 4.0,
    },
    {
      legNumber: 3,
      fromMark: "E",
      toMark: "M",
      bearingDeg: 339.8,
      distanceNmCalculated: 4.62,
    },
    {
      legNumber: 4,
      fromMark: "M",
      toMark: "B",
      bearingDeg: 322.0,
      distanceNmCalculated: 3.05,
    },
  ],
  notes: 'Route: X -> G -> E -> M -> B.',
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
    "4": tedDeadTedCourse,
  },
  specialRoutingNotes: [
    "These named South River options are the Ted Osius course set currently configured in the app, including The Dead Ted.",
    'The finish mark for all four options is mark B, defined for this event as Horn Point Buoy G "9".',
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

const governorsCupCourse: RaceCourseRecord = {
  label: "Governor's Cup",
  sequence: ["X", "TP", "PNP", "PL", "SMJ", "SM1", "SM2", "SM3", "CP"],
  markRoundings: [null, "starboard", "starboard", "starboard", "starboard", null, null, null, null],
  textSummary: [
    "Start at Annapolis R2 (X).",
    "Pass Thomas Point Shoal Light to starboard (TP) — WP1.",
    "Pass Point No Point Light to starboard (PNP) — WP2.",
    "Pass Point Lookout Light to starboard (PL) — WP3.",
    "Pass St. Mary's River Junction Buoy FL(2+1)R6s to starboard (SMJ) — WP4.",
    "Pass St. Mary's River Day Marker 1 on channel side (SM1) — WP5.",
    "Pass St. Mary's River Day Marker 2 on channel side (SM2) — WP6.",
    "Pass St. Mary's River Day Marker 3 on channel side (SM3) — WP7.",
    "Finish at Church Point Cross (CP).",
  ],
  distanceNmSI: 68.6,
  distanceNmCalculated: 66.60,
  legs: [
    { legNumber: 1, fromMark: "X",   toMark: "TP",  bearingDeg: 192.1, distanceNmCalculated: 2.66  },
    { legNumber: 2, fromMark: "TP",  toMark: "PNP", bearingDeg: 171.5, distanceNmCalculated: 46.60 },
    { legNumber: 3, fromMark: "PNP", toMark: "PL",  bearingDeg: 196.8, distanceNmCalculated: 6.27  },
    { legNumber: 4, fromMark: "PL",  toMark: "SMJ", bearingDeg: 338.8, distanceNmCalculated: 7.19  },
    { legNumber: 5, fromMark: "SMJ", toMark: "SM1", bearingDeg: 327.6, distanceNmCalculated: 1.18  },
    { legNumber: 6, fromMark: "SM1", toMark: "SM2", bearingDeg: 314.8, distanceNmCalculated: 1.00  },
    { legNumber: 7, fromMark: "SM2", toMark: "SM3", bearingDeg: 317.6, distanceNmCalculated: 0.81  },
    { legNumber: 8, fromMark: "SM3", toMark: "CP",  bearingDeg: 321.9, distanceNmCalculated: 0.89  },
  ],
  notes: "Point-to-point offshore race, 68.6 NM. WP5–WP7 pass on channel side. Inner St. Mary's River mark positions (SM1–SM3, CP) are approximate — verify against current NOAA charts prior to racing.",
};

const governorsCup2026CourseGeometry: RaceCourseGeometry = {
  event: {
    name: "Governor's Cup Yacht Race",
    location: "Annapolis to St. Mary's City, MD",
    dates: "2026-07-31",
    source: "Governor's Cup Yacht Race Sailing Instructions",
  },
  startFinishMark: "X",
  marks: {
    X: {
      ...ANNAPOLIS_STANDARD_GOVERNMENT_MARKS.X,
    },
    TP: {
      id: "Thomas Point Shoal Light",
      name: "Thomas Point Shoal Lighthouse",
      lat: 38.8983,
      lon: -76.4367,
      characteristics: "Fl (2+1) R 6s",
      markType: "government_light",
      labelHint: "Thomas Pt",
    },
    PNP: {
      id: "Point No Point Light",
      name: "Point No Point Lighthouse",
      lat: 38.1300,
      lon: -76.2900,
      characteristics: "Fl W 6s",
      markType: "government_light",
      labelHint: "Pt No Pt",
    },
    PL: {
      id: "Point Lookout Light",
      name: "Point Lookout Lighthouse",
      lat: 38.0300,
      lon: -76.3283,
      characteristics: "Fl W 6s",
      markType: "government_light",
      labelHint: "Pt Lookout",
    },
    SMJ: {
      id: 'R "SM"',
      name: "St. Mary's River Junction Buoy",
      lat: 38.1417,
      lon: -76.3833,
      characteristics: "Fl (2+1) R 6s",
      markType: "government_buoy",
      markColor: "red",
      labelHint: "SM Jct",
    },
    SM1: {
      id: "SM-1",
      name: "St. Mary's River Day Marker 1",
      lat: 38.1583,
      lon: -76.3967,
      characteristics: "",
      labelHint: "SM DM1",
    },
    SM2: {
      id: "SM-2",
      name: "St. Mary's River Day Marker 2",
      lat: 38.1700,
      lon: -76.4117,
      characteristics: "",
      labelHint: "SM DM2",
    },
    SM3: {
      id: "SM-3",
      name: "St. Mary's River Day Marker 3",
      lat: 38.1800,
      lon: -76.4233,
      characteristics: "",
      labelHint: "SM DM3",
    },
    CP: {
      id: "Church Point",
      name: "Church Point Cross",
      lat: 38.1917,
      lon: -76.4350,
      characteristics: "",
      labelHint: "Church Pt",
    },
  },
  courses: {
    "governors-cup": governorsCupCourse,
  },
  specialRoutingNotes: [
    "WP1–WP4 shall be passed to starboard.",
    "WP5–WP7 (St. Mary's River day markers) shall be passed on the channel side.",
    "Inner St. Mary's River mark positions (SM1–SM3, CP) are approximate — verify against current NOAA charts prior to racing.",
  ],
  specialRoutingConstraints: [
    {
      id: "gc-thomas-point-starboard",
      type: "leave_to_starboard",
      appliesTo: "all_keelboat_classes",
      markLabel: "Thomas Point Shoal Light",
      markName: "Thomas Point Shoal Lighthouse",
      markKey: "TP",
    },
    {
      id: "gc-point-no-point-starboard",
      type: "leave_to_starboard",
      appliesTo: "all_keelboat_classes",
      markLabel: "Point No Point Light",
      markName: "Point No Point Lighthouse",
      markKey: "PNP",
    },
    {
      id: "gc-point-lookout-starboard",
      type: "leave_to_starboard",
      appliesTo: "all_keelboat_classes",
      markLabel: "Point Lookout Light",
      markName: "Point Lookout Lighthouse",
      markKey: "PL",
    },
    {
      id: "gc-sm-junction-starboard",
      type: "leave_to_starboard",
      appliesTo: "all_keelboat_classes",
      markLabel: "St. Mary's River Junction Buoy FL(2+1)R6s",
      markName: "St. Mary's River Junction Buoy",
      markKey: "SMJ",
    },
    {
      id: "gc-sm1-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: "St. Mary's Day Marker 1",
      markName: "St. Mary's River Day Marker 1",
      markKey: "SM1",
    },
    {
      id: "gc-sm2-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: "St. Mary's Day Marker 2",
      markName: "St. Mary's River Day Marker 2",
      markKey: "SM2",
    },
    {
      id: "gc-sm3-channel-side",
      type: "pass_on_channel_side",
      appliesTo: "all_keelboat_classes",
      markLabel: "St. Mary's Day Marker 3",
      markName: "St. Mary's River Day Marker 3",
      markKey: "SM3",
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
    status: "archived",
    sourceDocuments: [
      "SCC 2026 racing calendar",
      "YachtScoring event page 50643"
    ],
    courseGeometry: tedOsiusTwilight2026CourseGeometry
  },
  {
    id: "2026-governors-cup-annapolis-to-st-marys-md",
    year: 2026,
    name: "Governor's Cup Yacht Race",
    location: "Annapolis to St. Mary's City, MD",
    dates: "2026-07-31",
    status: "upcoming",
    sourceDocuments: [
      "Governor's Cup Yacht Race Sailing Instructions",
    ],
    courseGeometry: governorsCup2026CourseGeometry,
  },
];

export const activeRaceEventId = "2026-governors-cup-annapolis-to-st-marys-md";

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
    ...ANNAPOLIS_SUPPLEMENTAL_PLOTTER_MARKS,
    ...event.courseGeometry.marks,
  };
}
