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
  const assignedMarkId = mark?.id?.trim();

  if (!marks) {
    return assignedMarkId && assignedMarkId !== shortLabel
      ? `${shortLabel} · ${assignedMarkId}`
      : shortLabel;
  }

  const hasDuplicateShortLabel = Object.entries(marks).some(
    ([otherKey, otherMark]) =>
      otherKey !== markKey && getMarkShortLabel(otherKey, otherMark) === shortLabel,
  );

  const baseLabel = hasDuplicateShortLabel
    ? `${shortLabel} · ${getDuplicateMarkLabelHint(markKey, mark)}`
    : shortLabel;

  if (!assignedMarkId || assignedMarkId === shortLabel) {
    return baseLabel;
  }

  return `${baseLabel} · ${assignedMarkId}`;
}

export function formatMarkSequence(sequence: string[], marks: MarkCollection) {
  return sequence.map((markKey) => getMarkShortLabel(markKey, marks[markKey])).join(" -> ");
}
