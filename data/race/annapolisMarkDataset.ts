import type { RaceCourseMarkRecord } from "./eventDatabase";

export const ANNAPOLIS_STANDARD_MARKS_SOURCE = {
  sourceDocument: "Reference Data/Annapolis-area-racing-marks-Revised-2026.pdf",
  publisher: "Chesapeake Bay Yacht Racing Association",
  title: "Annapolis Area Standard Racing Marks",
  updatedThrough: "2026-01-01",
  notes: [
    "Approximate positions of all marks are offered as a reference only.",
    "Government symbols and numbers may change via Notice to Mariners.",
    "The same sheet includes a published distance-between-marks table for selected direct legs.",
  ],
} as const;

const ANNAPOLIS_PUBLISHED_DISTANCE_TABLE_ROWS: Record<string, Record<string, number>> = {
  A: {
    D: 1.58,
    E: 6.32,
    G: 2.46,
    H: 4.61,
    J: 2.22,
    K: 13.15,
    L: 9.33,
    M: 2.29,
    N: 5.04,
    P: 10.62,
    Q: 12.75,
    R: 11.51,
    S: 5.94,
    T: 1.77,
    X: 6.57,
  },
  D: {
    E: 7.03,
    G: 3.04,
    H: 5.75,
    J: 3.65,
    K: 14.14,
    L: 9.91,
    M: 3.71,
    N: 6.43,
    P: 11.47,
    Q: 13.63,
    R: 12.0,
    S: 7.35,
    T: 3.1,
    X: 7.76,
  },
  E: {
    G: 4.0,
    H: 2.48,
    J: 7.12,
    K: 7.26,
    L: 3.06,
    M: 4.65,
    N: 3.8,
    P: 4.47,
    Q: 6.63,
    R: 5.28,
    S: 4.09,
    T: 4.78,
    X: 2.68,
  },
  G: {
    H: 2.93,
    J: 4.0,
    K: 11.11,
    L: 6.94,
    M: 2.05,
    N: 4.04,
    P: 8.43,
    Q: 10.59,
    R: 9.1,
    S: 4.92,
    T: 1.59,
    X: 4.92,
  },
  J: {
    K: 13.2,
    L: 10.17,
    M: 2.47,
    N: 4.56,
    P: 10.97,
    Q: 13.01,
    R: 12.39,
    S: 5.32,
    T: 2.51,
    X: 6.48,
  },
  K: {
    L: 5.33,
    M: 11.03,
    N: 8.67,
    P: 2.9,
    Q: 1.25,
    R: 4.93,
    S: 8.05,
    T: 11.41,
    X: 6.73,
  },
  L: {
    M: 7.71,
    N: 6.5,
    P: 6.43,
    Q: 2.52,
    R: 4.34,
    S: 2.23,
    T: 6.39,
    X: 7.83,
    Z: 4.67,
  },
  M: {
    N: 2.75,
    P: 8.64,
    Q: 10.73,
    R: 9.93,
    S: 3.66,
    T: 0.64,
    X: 4.35,
  },
  P: {
    Q: 6.63,
    R: 8.56,
    S: 8.58,
    T: 0.92,
    X: 3.33,
    Z: 2.01,
  },
  Q: {
    R: 2.16,
    S: 3.01,
    T: 6.25,
    X: 8.94,
    Z: 4.62,
  },
  R: {
    S: 3.69,
    T: 8.05,
    X: 11.05,
    Z: 6.56,
  },
  S: {
    T: 8.45,
    X: 10.05,
    Z: 6.72,
  },
  T: {
    X: 4.25,
    Z: 1.73,
  },
  X: {
    Z: 4.8,
  },
};

export const ANNAPOLIS_PUBLISHED_DISTANCE_TABLE_MARK_KEYS = [
  "A",
  "D",
  "E",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "X",
  "Z",
] as const;

export const ANNAPOLIS_STANDARD_GOVERNMENT_MARKS: Record<string, RaceCourseMarkRecord> = {
  A: {
    id: 'GC "1"',
    name: "Hackett Point Shoal Buoy 1",
    lat: 38.97,
    lon: -76.4145,
    characteristics: "",
  },
  D: {
    id: 'G "91"',
    name: "Chesapeake Channel - Lighted Buoy 91",
    lat: 38.98316666666667,
    lon: -76.38516666666666,
    characteristics: "Fl G 4s",
  },
  E: {
    id: 'R "86"',
    name: "Chesapeake Channel - Lighted Buoy 86",
    lat: 38.866166666666665,
    lon: -76.3925,
    characteristics: "Fl R 4s",
  },
  F: {
    id: 'R "2A"',
    name: "Eastern Bay - Entrance Lighted Buoy 2A",
    lat: 38.842666666666666,
    lon: -76.30366666666667,
    characteristics: "Fl R 4s",
  },
  G: {
    id: 'G "WR87"',
    name: "Chesapeake Channel - Lighted Buoy WR87",
    lat: 38.932833333333335,
    lon: -76.3925,
    characteristics: "Q G",
  },
  H: {
    id: 'GR C "SR"',
    name: "South River - Junction Buoy SR",
    lat: 38.894333333333336,
    lon: -76.43116666666667,
    characteristics: "",
  },
  J: {
    id: 'G "5"',
    name: "Severn River - Lighted Buoy 5",
    lat: 38.971666666666664,
    lon: -76.462,
    characteristics: "Fl G 4s",
  },
  K: {
    id: 'G "83"',
    name: "Chesapeake Channel - Lighted Buoy 83",
    lat: 38.75216666666667,
    lon: -76.44433333333333,
    characteristics: "Fl G 4s",
  },
  L: {
    id: 'G "1E"',
    name: "Eastern Bay - Entrance Lighted Buoy 1E",
    lat: 38.818666666666665,
    lon: -76.36883333333333,
    characteristics: "Fl G 4s",
  },
  M: {
    id: 'SG "1AH"',
    name: "Severn River - Light 1AH",
    lat: 38.935833333333335,
    lon: -76.43616666666667,
    characteristics: "Fl G 4s",
  },
  N: {
    id: 'R "4"',
    name: "Eastern Bay - Entrance Lighted Buoy 4",
    lat: 38.8765,
    lon: -76.25133333333333,
    characteristics: "Fl R 4s",
  },
  P: {
    id: 'RN "2"',
    name: "South River - Entrance Buoy 2",
    lat: 38.89566666666666,
    lon: -76.4645,
    characteristics: "",
  },
  Q: {
    id: 'R "84A"',
    name: "Chesapeake Channel - Lighted Buoy 84A",
    lat: 38.793166666666664,
    lon: -76.4115,
    characteristics: "Fl R 2.5s",
  },
  R: {
    id: 'R "84"',
    name: "Chesapeake Channel - Lighted Buoy 84",
    lat: 38.757666666666665,
    lon: -76.4185,
    characteristics: "Fl R 4s",
  },
  S: {
    id: 'RN "8"',
    name: "Eastern Bay Poplar Island Narrows - Buoy 8",
    lat: 38.785333333333334,
    lon: -76.348,
    characteristics: "",
  },
  T: {
    id: "Saunders Point Junction Light",
    name: "West River - Saunders Point Shoal Junction Light",
    lat: 38.883833333333335,
    lon: -76.477,
    characteristics: "Fl (2+1)R 6s",
  },
  W: {
    id: 'Y "AN"',
    name: "Severn River - NOAA Lighted Buoy AN",
    lat: 38.96366666666667,
    lon: -76.44683333333333,
    characteristics: "Fl Y 4s",
  },
  X: {
    id: 'R "2"',
    name: "Severn River - Lighted Buoy 2",
    lat: 38.94166666666667,
    lon: -76.42466666666667,
    characteristics: "Fl R 2.5s",
  },
  Y: {
    id: 'RN "14"',
    name: "Severn River - Buoy 14",
    lat: 38.98583333333333,
    lon: -76.47783333333334,
    characteristics: "",
  },
  Z: {
    id: 'G "1"',
    name: "West River - Lighted Buoy 1",
    lat: 38.86416666666667,
    lon: -76.44983333333333,
    characteristics: "Fl G 4s",
  },
};

// Event-specific additions that are outside the CBYRA standard mark sheet.
export const ANNAPOLIS_LOCAL_EVENT_MARKS: Record<string, RaceCourseMarkRecord> = {
  C: {
    id: 'GC "7"',
    name: 'Annapolis Harbor Channel Buoy 7',
    lat: 38.976775555555554,
    lon: -76.46520444444445,
    characteristics:
      'Green can. Position from U.S. Coast Guard Light List for Annapolis Harbor Channel Buoy 7.',
  },
};

export function getAnnapolisPublishedDistanceNm(fromMarkKey: string, toMarkKey: string) {
  if (fromMarkKey === toMarkKey) {
    return 0;
  }

  return (
    ANNAPOLIS_PUBLISHED_DISTANCE_TABLE_ROWS[fromMarkKey]?.[toMarkKey] ??
    ANNAPOLIS_PUBLISHED_DISTANCE_TABLE_ROWS[toMarkKey]?.[fromMarkKey] ??
    null
  );
}

export function isAnnapolisPublishedDistanceTableMark(markKey: string) {
  return (ANNAPOLIS_PUBLISHED_DISTANCE_TABLE_MARK_KEYS as readonly string[]).includes(markKey);
}

export function pickAnnapolisMarks(
  markIds: string[],
  localOverrides: Record<string, RaceCourseMarkRecord> = {},
) {
  return Object.fromEntries(
    markIds.map((markId) => {
      const mark =
        localOverrides[markId] ??
        ANNAPOLIS_STANDARD_GOVERNMENT_MARKS[markId];

      if (!mark) {
        throw new Error(`Unknown Annapolis mark ID: ${markId}`);
      }

      return [markId, mark];
    }),
  ) as Record<string, RaceCourseMarkRecord>;
}
