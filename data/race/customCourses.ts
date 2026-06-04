import {
  activeRaceEventId,
  type RaceCourseMarkRounding,
  type RaceCourseLegRecord,
  type RaceCourseRecord,
} from "./eventDatabase";

export type StoredCustomCourseRecord = {
  id: string;
  eventId: string;
  course: RaceCourseRecord;
  isLocked: boolean;
  lockedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

const CUSTOM_COURSES_STORAGE_KEY = "layline-custom-courses-v1";

let cachedCustomCourses: StoredCustomCourseRecord[] | null = null;
let customCoursesVersion = 0;
let storageListenerAttached = false;
const listeners = new Set<() => void>();

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined" &&
    typeof localStorage.getItem === "function" &&
    typeof localStorage.setItem === "function"
  );
}

function sanitizeLegRecord(value: unknown): RaceCourseLegRecord | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<RaceCourseLegRecord>;
  if (
    typeof input.legNumber !== "number" ||
    !Number.isFinite(input.legNumber) ||
    typeof input.fromMark !== "string" ||
    typeof input.toMark !== "string" ||
    typeof input.bearingDeg !== "number" ||
    !Number.isFinite(input.bearingDeg) ||
    typeof input.distanceNmCalculated !== "number" ||
    !Number.isFinite(input.distanceNmCalculated)
  ) {
    return null;
  }

  return {
    legNumber: Math.max(1, Math.round(input.legNumber)),
    fromMark: input.fromMark,
    toMark: input.toMark,
    bearingDeg: input.bearingDeg,
    distanceNmCalculated: input.distanceNmCalculated,
  };
}

function sanitizeMarkRoundings(value: unknown, expectedLength: number) {
  if (!Array.isArray(value) || expectedLength <= 0) {
    return undefined;
  }

  return Array.from({ length: expectedLength }, (_, index) => {
    const side = value[index];
    return side === "port" || side === "starboard"
      ? (side satisfies RaceCourseMarkRounding)
      : null;
  });
}

function sanitizeCourseRecord(value: unknown): RaceCourseRecord | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<RaceCourseRecord>;
  const sequence =
    Array.isArray(input.sequence) &&
    input.sequence.every((item) => typeof item === "string" && item.length > 0)
      ? input.sequence
      : null;
  const previewSequence =
    Array.isArray(input.previewSequence) &&
    input.previewSequence.every((item) => typeof item === "string" && item.length > 0)
      ? input.previewSequence
      : undefined;
  const textSummary =
    Array.isArray(input.textSummary) &&
    input.textSummary.every((item) => typeof item === "string" && item.length > 0)
      ? input.textSummary
      : undefined;
  const markRoundings = sanitizeMarkRoundings(
    input.markRoundings,
    sequence?.length ?? previewSequence?.length ?? 0,
  );
  const legs =
    Array.isArray(input.legs)
      ? input.legs.map(sanitizeLegRecord).filter((leg): leg is RaceCourseLegRecord => leg != null)
      : [];

  if (sequence == null && (previewSequence == null || previewSequence.length < 2)) {
    return null;
  }

  return {
    sequence,
    markRoundings,
    previewSequence,
    textSummary,
    distanceNmSI:
      typeof input.distanceNmSI === "number" && Number.isFinite(input.distanceNmSI)
        ? input.distanceNmSI
        : null,
    distanceNmCalculated:
      typeof input.distanceNmCalculated === "number" && Number.isFinite(input.distanceNmCalculated)
        ? input.distanceNmCalculated
        : null,
    legs,
    label:
      typeof input.label === "string" && input.label.trim().length > 0
        ? input.label.trim()
        : "Custom Course",
    custom: true,
    notes:
      typeof input.notes === "string" && input.notes.trim().length > 0
        ? input.notes.trim()
        : undefined,
  };
}

function sanitizeStoredCustomCourse(value: unknown): StoredCustomCourseRecord | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<StoredCustomCourseRecord>;
  const course = sanitizeCourseRecord(input.course);
  if (
    typeof input.id !== "string" ||
    input.id.trim().length === 0 ||
    typeof input.eventId !== "string" ||
    input.eventId.trim().length === 0 ||
    course == null
  ) {
    return null;
  }

  return {
    id: input.id,
    eventId: input.eventId,
    course,
    isLocked:
      typeof input.isLocked === "boolean"
        ? input.isLocked
        : true,
    lockedAtISO:
      typeof input.lockedAtISO === "string" && input.lockedAtISO.length > 0
        ? input.lockedAtISO
        : undefined,
    createdAtISO:
      typeof input.createdAtISO === "string" && input.createdAtISO.length > 0
        ? input.createdAtISO
        : new Date().toISOString(),
    updatedAtISO:
      typeof input.updatedAtISO === "string" && input.updatedAtISO.length > 0
        ? input.updatedAtISO
        : new Date().toISOString(),
  };
}

function sortCustomCourses(courses: StoredCustomCourseRecord[]) {
  return [...courses].sort((a, b) =>
    (a.course.label ?? a.id).localeCompare(b.course.label ?? b.id),
  );
}

function loadStoredCustomCourses() {
  if (cachedCustomCourses != null) {
    return cachedCustomCourses;
  }

  if (!canUseLocalStorage()) {
    cachedCustomCourses = [];
    return cachedCustomCourses;
  }

  try {
    const raw = localStorage.getItem(CUSTOM_COURSES_STORAGE_KEY);
    if (!raw) {
      cachedCustomCourses = [];
      return cachedCustomCourses;
    }

    const parsed = JSON.parse(raw);
    cachedCustomCourses = Array.isArray(parsed)
      ? sortCustomCourses(
          parsed
            .map(sanitizeStoredCustomCourse)
            .filter((course): course is StoredCustomCourseRecord => course != null),
        )
      : [];
  } catch {
    cachedCustomCourses = [];
  }

  return cachedCustomCourses;
}

function emitCustomCourseChange() {
  customCoursesVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

function ensureStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") {
    return;
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== CUSTOM_COURSES_STORAGE_KEY) {
      return;
    }

    cachedCustomCourses = null;
    emitCustomCourseChange();
  });
  storageListenerAttached = true;
}

function persistCustomCourses(courses: StoredCustomCourseRecord[]) {
  cachedCustomCourses = sortCustomCourses(courses);

  if (canUseLocalStorage()) {
    localStorage.setItem(CUSTOM_COURSES_STORAGE_KEY, JSON.stringify(cachedCustomCourses));
  }

  emitCustomCourseChange();
}

export function createCustomCourseId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCustomCoursesVersion() {
  loadStoredCustomCourses();
  return customCoursesVersion;
}

export function subscribeCustomCourses(listener: () => void) {
  ensureStorageListener();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getCustomCourseRecord(courseId: string) {
  return loadStoredCustomCourses().find((course) => course.id === courseId) ?? null;
}

export function getCustomCoursesForEvent(eventId = activeRaceEventId) {
  return loadStoredCustomCourses().filter((course) => course.eventId === eventId);
}

export function upsertCustomCourseRecord(
  input: Omit<StoredCustomCourseRecord, "createdAtISO" | "updatedAtISO" | "lockedAtISO" | "isLocked"> & {
    createdAtISO?: string;
    isLocked?: boolean;
    lockedAtISO?: string;
  },
) {
  const existing = getCustomCourseRecord(input.id);
  const isLocked = input.isLocked ?? existing?.isLocked ?? false;
  const nextRecord: StoredCustomCourseRecord = {
    id: input.id,
    eventId: input.eventId,
    course: {
      ...input.course,
      custom: true,
    },
    isLocked,
    lockedAtISO: isLocked
      ? existing?.lockedAtISO ?? input.lockedAtISO ?? new Date().toISOString()
      : undefined,
    createdAtISO: existing?.createdAtISO ?? input.createdAtISO ?? new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  };

  const otherCourses = loadStoredCustomCourses().filter((course) => course.id !== input.id);
  persistCustomCourses([...otherCourses, nextRecord]);

  return nextRecord;
}

export function deleteCustomCourseRecord(courseId: string) {
  const nextCourses = loadStoredCustomCourses().filter((course) => course.id !== courseId);
  persistCustomCourses(nextCourses);
}

export function setCustomCourseLockedState(courseId: string, isLocked: boolean) {
  const existing = getCustomCourseRecord(courseId);
  if (!existing) {
    return null;
  }

  const nextRecord: StoredCustomCourseRecord = {
    ...existing,
    isLocked,
    lockedAtISO: isLocked ? existing.lockedAtISO ?? new Date().toISOString() : undefined,
    updatedAtISO: new Date().toISOString(),
  };

  const otherCourses = loadStoredCustomCourses().filter((course) => course.id !== courseId);
  persistCustomCourses([...otherCourses, nextRecord]);

  return nextRecord;
}
