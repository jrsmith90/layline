import type { RaceCourseMarkRecord } from "@/data/race/eventDatabase";

type MarkCollection = Partial<Record<string, RaceCourseMarkRecord>>;

export function getMarkShortLabel(
  markKey: string,
  mark: RaceCourseMarkRecord | null | undefined,
) {
  return mark?.shortName?.trim() || markKey;
}

function getDuplicateMarkLabelHint(
  markKey: string,
  mark: RaceCourseMarkRecord | null | undefined,
) {
  if (!mark) {
    return markKey;
  }

  return mark.labelHint?.trim() || markKey;
}

export function formatMarkChoice(
  markKey: string,
  mark: RaceCourseMarkRecord | null | undefined,
  marks?: MarkCollection,
) {
  const shortLabel = getMarkShortLabel(markKey, mark);
  if (!marks) {
    return shortLabel;
  }

  const hasDuplicateShortLabel = Object.entries(marks).some(
    ([otherKey, otherMark]) =>
      otherKey !== markKey && getMarkShortLabel(otherKey, otherMark) === shortLabel,
  );

  if (!hasDuplicateShortLabel) {
    return shortLabel;
  }

  return `${shortLabel} · ${getDuplicateMarkLabelHint(markKey, mark)}`;
}

export function formatMarkSequence(sequence: string[], marks: MarkCollection) {
  return sequence.map((markKey) => getMarkShortLabel(markKey, marks[markKey])).join(" -> ");
}
