import type { WindTrend } from "@/data/race/getRouteBiasInputs";
import { getAllCourseIds, getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import { wrap360 } from "@/lib/race/courseTracker";
import {
  getStoredTrackerStateSnapshot,
  setTrackerCourseId,
  subscribeStoredTrackerState,
} from "@/lib/race/legDetection";

export type TacticalBoardDraft = {
  courseId: string;
  meanWindDirectionDeg: string;
  currentWindDirectionDeg: string;
  tackAngleDeg: string;
  windwardMarkBearingDeg: string;
  downwindMarkBearingDeg: string;
  linePortEndBearingDeg: string;
  lineStarboardEndBearingDeg: string;
  downwindTrueWindAngleDeg: string;
  windTrend: WindTrend;
};

const KNOWN_COURSE_IDS = new Set(getAllCourseIds());
const TACTICAL_BOARD_DRAFT_KEY = "layline-tactical-board-draft-v1";
const TACTICAL_BOARD_STORE_EVENT = "layline:tactical-board-store";

let memoryDraft: TacticalBoardDraft = buildTacticalBoardDraftDefaults(getDefaultCourseId());
let trackerCourseLinkStop: (() => void) | null = null;
let tacticalBoardSubscriberCount = 0;

function hasLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined" &&
    typeof localStorage.getItem === "function" &&
    typeof localStorage.setItem === "function"
  );
}

function isWindTrend(value: unknown): value is WindTrend {
  return value === "building" ||
    value === "fading" ||
    value === "steady" ||
    value === "oscillating" ||
    value === "unstable" ||
    value === "unknown";
}

function normalizeCourseId(value: unknown) {
  return typeof value === "string" && KNOWN_COURSE_IDS.has(value)
    ? value
    : getDefaultCourseId();
}

function readLinkedCourseId() {
  const tracker = getStoredTrackerStateSnapshot();
  return normalizeCourseId(tracker.courseId);
}

function sanitizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function courseSeed(courseId: string) {
  const courseData = getCourseData(courseId);
  const firstLegBearingDeg = courseData.firstLeg?.bearingDeg ?? null;

  return {
    windwardMarkBearingDeg:
      firstLegBearingDeg == null ? "" : String(Math.round(firstLegBearingDeg)),
    downwindMarkBearingDeg:
      firstLegBearingDeg == null ? "" : String(Math.round(wrap360(firstLegBearingDeg + 180))),
  };
}

function applyCourseToDraft(draft: TacticalBoardDraft, courseId: string): TacticalBoardDraft {
  const normalizedCourseId = normalizeCourseId(courseId);
  const seeded = buildTacticalBoardDraftDefaults(normalizedCourseId);

  return {
    ...draft,
    ...seeded,
    courseId: normalizedCourseId,
    meanWindDirectionDeg: draft.meanWindDirectionDeg,
    currentWindDirectionDeg: draft.currentWindDirectionDeg,
    tackAngleDeg: draft.tackAngleDeg,
    downwindTrueWindAngleDeg: draft.downwindTrueWindAngleDeg,
    windTrend: draft.windTrend,
  };
}

function sanitizeDraft(input: Partial<TacticalBoardDraft> | null | undefined): TacticalBoardDraft {
  const storedCourseId = normalizeCourseId(input?.courseId);
  const defaults = buildTacticalBoardDraftDefaults(storedCourseId);

  return {
    ...defaults,
    courseId: storedCourseId,
    meanWindDirectionDeg: sanitizeText(input?.meanWindDirectionDeg, defaults.meanWindDirectionDeg),
    currentWindDirectionDeg: sanitizeText(
      input?.currentWindDirectionDeg,
      defaults.currentWindDirectionDeg,
    ),
    tackAngleDeg: sanitizeText(input?.tackAngleDeg, defaults.tackAngleDeg),
    windwardMarkBearingDeg: sanitizeText(
      input?.windwardMarkBearingDeg,
      defaults.windwardMarkBearingDeg,
    ),
    downwindMarkBearingDeg: sanitizeText(
      input?.downwindMarkBearingDeg,
      defaults.downwindMarkBearingDeg,
    ),
    linePortEndBearingDeg: sanitizeText(
      input?.linePortEndBearingDeg,
      defaults.linePortEndBearingDeg,
    ),
    lineStarboardEndBearingDeg: sanitizeText(
      input?.lineStarboardEndBearingDeg,
      defaults.lineStarboardEndBearingDeg,
    ),
    downwindTrueWindAngleDeg: sanitizeText(
      input?.downwindTrueWindAngleDeg,
      defaults.downwindTrueWindAngleDeg,
    ),
    windTrend: isWindTrend(input?.windTrend) ? input.windTrend : defaults.windTrend,
  };
}

function alignDraftCourseWithTracker(draft: TacticalBoardDraft) {
  const linkedCourseId = readLinkedCourseId();
  return draft.courseId === linkedCourseId ? draft : applyCourseToDraft(draft, linkedCourseId);
}

function shallowDraftEqual(left: TacticalBoardDraft, right: TacticalBoardDraft) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function writeStoredTacticalBoardDraft(nextDraft: TacticalBoardDraft) {
  memoryDraft = nextDraft;

  if (hasLocalStorage()) {
    try {
      localStorage.setItem(TACTICAL_BOARD_DRAFT_KEY, JSON.stringify(nextDraft));
    } catch {
      // Keep the in-memory fallback if persistence is unavailable.
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TACTICAL_BOARD_STORE_EVENT, { detail: nextDraft }));
  }
}

function readRawDraft() {
  if (!hasLocalStorage()) {
    return memoryDraft;
  }

  try {
    const raw = localStorage.getItem(TACTICAL_BOARD_DRAFT_KEY);
    if (!raw) return memoryDraft;
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed != null ? parsed : memoryDraft;
  } catch {
    return memoryDraft;
  }
}

function syncDraftCourseFromTracker() {
  const linkedCourseId = readLinkedCourseId();
  const current = getStoredTacticalBoardDraft();
  if (current.courseId === linkedCourseId) return current;

  return updateTacticalBoardDraft((draft) => applyCourseToDraft(draft, linkedCourseId));
}

function ensureTrackerCourseLink() {
  if (typeof window === "undefined" || trackerCourseLinkStop) return;

  trackerCourseLinkStop = subscribeStoredTrackerState(() => {
    syncDraftCourseFromTracker();
  });
}

export function buildTacticalBoardDraftDefaults(courseId: string): TacticalBoardDraft {
  const normalizedCourseId = normalizeCourseId(courseId);
  const seeded = courseSeed(normalizedCourseId);

  return {
    courseId: normalizedCourseId,
    meanWindDirectionDeg: "",
    currentWindDirectionDeg: "",
    tackAngleDeg: "42",
    windwardMarkBearingDeg: seeded.windwardMarkBearingDeg,
    downwindMarkBearingDeg: seeded.downwindMarkBearingDeg,
    linePortEndBearingDeg: "",
    lineStarboardEndBearingDeg: "",
    downwindTrueWindAngleDeg: "135",
    windTrend: "unknown",
  };
}

export function getStoredTacticalBoardDraft() {
  return alignDraftCourseWithTracker(sanitizeDraft(readRawDraft()));
}

export function subscribeTacticalBoardStore(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  tacticalBoardSubscriberCount += 1;
  ensureTrackerCourseLink();

  const handleDraftEvent = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TACTICAL_BOARD_DRAFT_KEY) {
      listener();
    }
  };

  window.addEventListener(TACTICAL_BOARD_STORE_EVENT, handleDraftEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    tacticalBoardSubscriberCount = Math.max(0, tacticalBoardSubscriberCount - 1);
    window.removeEventListener(TACTICAL_BOARD_STORE_EVENT, handleDraftEvent);
    window.removeEventListener("storage", handleStorage);

    if (tacticalBoardSubscriberCount === 0 && trackerCourseLinkStop) {
      trackerCourseLinkStop();
      trackerCourseLinkStop = null;
    }
  };
}

export function updateTacticalBoardDraft(
  updater: (current: TacticalBoardDraft) => TacticalBoardDraft,
) {
  const current = getStoredTacticalBoardDraft();
  const next = sanitizeDraft(updater(current));

  if (shallowDraftEqual(current, next)) {
    return current;
  }

  writeStoredTacticalBoardDraft(next);
  return next;
}

export function setTacticalBoardDraftField<K extends keyof TacticalBoardDraft>(
  key: K,
  value: TacticalBoardDraft[K],
) {
  return updateTacticalBoardDraft((current) => ({
    ...current,
    [key]: value,
  }));
}

export function setTacticalBoardCourseId(
  courseId: string,
  options: { syncTracker?: boolean } = {},
) {
  const normalizedCourseId = normalizeCourseId(courseId);
  const nextDraft = updateTacticalBoardDraft((current) =>
    applyCourseToDraft(current, normalizedCourseId),
  );

  if (options.syncTracker !== false) {
    const tracker = getStoredTrackerStateSnapshot();
    if (tracker.courseId !== normalizedCourseId) {
      setTrackerCourseId(normalizedCourseId);
    }
  }

  return nextDraft;
}

export function seedTacticalBoardMarkBearings(courseId?: string) {
  return updateTacticalBoardDraft((current) => {
    const seeded = courseSeed(courseId ?? current.courseId);

    return {
      ...current,
      windwardMarkBearingDeg: seeded.windwardMarkBearingDeg,
      downwindMarkBearingDeg: seeded.downwindMarkBearingDeg,
    };
  });
}

export function copyTacticalBoardMeanWindToCurrentWind() {
  return updateTacticalBoardDraft((current) => ({
    ...current,
    currentWindDirectionDeg: current.meanWindDirectionDeg,
  }));
}
