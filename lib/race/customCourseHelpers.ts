import type {
  RaceCourseGeometry,
  RaceCourseLegRecord,
  RaceCourseMarkRecord,
  RaceCourseRecord,
} from "@/data/race/eventDatabase";
import {
  ANNAPOLIS_STANDARD_GOVERNMENT_MARKS,
  getAnnapolisPublishedDistanceNm,
  isAnnapolisPublishedDistanceTableMark,
} from "@/data/race/annapolisMarkDataset";
import { bearingDeg, distanceNm } from "@/lib/race/courseTracker";

function cleanSequence(sequence: string[]) {
  return sequence.map((item) => item.trim()).filter((item) => item.length > 0);
}

export type CustomCourseLegDetail = RaceCourseLegRecord & {
  distanceSource: "published_table" | "great_circle_fallback";
  caution?: string;
};

function isStandardAnnapolisMark(
  markKey: string,
  mark: RaceCourseMarkRecord | undefined,
) {
  const standardMark = ANNAPOLIS_STANDARD_GOVERNMENT_MARKS[markKey];
  if (!standardMark || !mark) {
    return false;
  }

  return (
    Math.abs(standardMark.lat - mark.lat) < 1e-9 &&
    Math.abs(standardMark.lon - mark.lon) < 1e-9
  );
}

function resolveLegDistance(params: {
  fromMarkKey: string;
  fromMark: RaceCourseMarkRecord;
  toMarkKey: string;
  toMark: RaceCourseMarkRecord;
}) {
  const canUsePublishedTable =
    isStandardAnnapolisMark(params.fromMarkKey, params.fromMark) &&
    isStandardAnnapolisMark(params.toMarkKey, params.toMark);
  const publishedDistance = canUsePublishedTable
    ? getAnnapolisPublishedDistanceNm(params.fromMarkKey, params.toMarkKey)
    : null;

  if (publishedDistance != null) {
    return {
      distanceNmCalculated: Number(publishedDistance.toFixed(2)),
      distanceSource: "published_table" as const,
    };
  }

  const caution =
    canUsePublishedTable &&
    isAnnapolisPublishedDistanceTableMark(params.fromMarkKey) &&
    isAnnapolisPublishedDistanceTableMark(params.toMarkKey)
      ? `No curated 2026 Annapolis sheet distance is loaded for ${params.fromMarkKey} -> ${params.toMarkKey}, so this leg falls back to a geometric estimate from the published coordinates.`
      : undefined;

  return {
    distanceNmCalculated: Number(distanceNm(params.fromMark, params.toMark).toFixed(2)),
    distanceSource: "great_circle_fallback" as const,
    caution,
  };
}

export function buildLegDetailsFromSequence(
  sequence: string[],
  marks: RaceCourseGeometry["marks"],
) {
  const cleanedSequence = cleanSequence(sequence);
  const legs: CustomCourseLegDetail[] = [];

  for (let index = 1; index < cleanedSequence.length; index += 1) {
    const fromMarkKey = cleanedSequence[index - 1];
    const toMarkKey = cleanedSequence[index];
    const fromMark = marks[fromMarkKey];
    const toMark = marks[toMarkKey];
    if (!fromMark || !toMark) {
      continue;
    }

    const distanceDetail = resolveLegDistance({
      fromMarkKey,
      fromMark,
      toMarkKey,
      toMark,
    });

    legs.push({
      legNumber: index,
      fromMark: fromMarkKey,
      toMark: toMarkKey,
      bearingDeg: Number(bearingDeg(fromMark, toMark).toFixed(1)),
      ...distanceDetail,
    });
  }

  return legs;
}

export function buildLegRecordsFromSequence(
  sequence: string[],
  marks: RaceCourseGeometry["marks"],
) {
  return buildLegDetailsFromSequence(sequence, marks).map((leg) => ({
    legNumber: leg.legNumber,
    fromMark: leg.fromMark,
    toMark: leg.toMark,
    bearingDeg: leg.bearingDeg,
    distanceNmCalculated: leg.distanceNmCalculated,
  })) satisfies RaceCourseLegRecord[];
}

export function buildDefaultTextSummary(
  sequence: string[],
  marks: RaceCourseGeometry["marks"],
) {
  const cleanedSequence = cleanSequence(sequence);

  return cleanedSequence.map((markKey, index) => {
    const mark = marks[markKey];
    const description = mark ? `${mark.name} (${markKey})` : markKey;

    if (index === 0) {
      return `Start at ${description}.`;
    }

    if (index === cleanedSequence.length - 1) {
      return `Finish at ${description}.`;
    }

    return `Round ${description}.`;
  });
}

export function buildCustomCourseRecord(params: {
  label: string;
  sequence: string[];
  marks: RaceCourseGeometry["marks"];
  notes?: string;
  textSummary?: string[];
}) {
  const cleanedSequence = cleanSequence(params.sequence);
  const legs = buildLegRecordsFromSequence(cleanedSequence, params.marks);
  const calculatedDistance = Number(
    legs.reduce((total, leg) => total + leg.distanceNmCalculated, 0).toFixed(2),
  );

  return {
    label: params.label.trim(),
    sequence: cleanedSequence,
    distanceNmSI: null,
    distanceNmCalculated: calculatedDistance,
    legs,
    custom: true,
    textSummary:
      params.textSummary && params.textSummary.length > 0
        ? params.textSummary
        : buildDefaultTextSummary(cleanedSequence, params.marks),
    notes: params.notes?.trim() ? params.notes.trim() : undefined,
  } satisfies RaceCourseRecord;
}

export function formatMarkChoice(markKey: string, mark: RaceCourseMarkRecord) {
  return `${markKey} - ${mark.name}`;
}
