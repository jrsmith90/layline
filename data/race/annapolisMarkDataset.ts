import type { RaceCourseMarkRecord } from "./eventDatabase";

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

// Event-specific plotting helpers that are not CBYRA standard government marks.
export const ANNAPOLIS_LOCAL_EVENT_MARKS: Record<string, RaceCourseMarkRecord> = {
  C: {
    id: 'GC "7"',
    name: 'Annapolis Harbor Channel Green Can "7"',
    lat: 38.9374,
    lon: -76.466,
    characteristics:
      'Approximate offshore plotting proxy for Annapolis Harbor Channel Green Can "7", shifted slightly east so the EWE pursuit overlay stays off the shoreline.',
  },
};

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
