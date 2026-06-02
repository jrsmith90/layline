import type {
  RaceCourseGeometry,
  RaceCourseLegRecord,
  RaceCourseMarkRecord,
  RaceCourseRecord,
} from "@/data/race/eventDatabase";
import { bearingDeg, distanceNm } from "@/lib/race/courseTracker";

function cleanSequence(sequence: string[]) {
  return sequence.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function buildLegRecordsFromSequence(
  sequence: string[],
  marks: RaceCourseGeometry["marks"],
) {
  const cleanedSequence = cleanSequence(sequence);
  const legs: RaceCourseLegRecord[] = [];

  for (let index = 1; index < cleanedSequence.length; index += 1) {
    const fromMark = marks[cleanedSequence[index - 1]];
    const toMark = marks[cleanedSequence[index]];
    if (!fromMark || !toMark) {
      continue;
    }

    legs.push({
      legNumber: index,
      fromMark: cleanedSequence[index - 1],
      toMark: cleanedSequence[index],
      bearingDeg: Number(bearingDeg(fromMark, toMark).toFixed(1)),
      distanceNmCalculated: Number(distanceNm(fromMark, toMark).toFixed(2)),
    });
  }

  return legs;
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
