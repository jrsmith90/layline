import type {
  CurrentSide,
  EdgeStrength,
  OpeningLegType,
  PressureSide,
  WindTrend,
} from "@/data/race/getRouteBiasInputs";
import { getAllCourseIds, getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import { wrap360 } from "@/lib/race/courseTracker";
import {
  getStoredTrackerStateSnapshot,
  setTrackerCourseId,
  subscribeStoredTrackerState,
} from "@/lib/race/legDetection";
import type {
  PlanValidityResult,
  RouteBiasSnapshot,
  TacticalUpdateAction,
} from "@/lib/race/checkPlanValidity";
import type { RouteBiasAnswers } from "@/lib/race/scoreRouteBias";

export type TacticalBoardRouteBiasState = {
  originalAnswers: RouteBiasAnswers | null;
  originalPlan: RouteBiasSnapshot | null;
  latestAnswers: RouteBiasAnswers | null;
  latestPlan: RouteBiasSnapshot | null;
  latestUpdate: PlanValidityResult | null;
};

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
  routeBias: TacticalBoardRouteBiasState;
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

function isOpeningLegType(value: unknown): value is OpeningLegType {
  return value === "mostly_upwind" ||
    value === "close_reach" ||
    value === "beam_reach" ||
    value === "broad_reach" ||
    value === "unknown";
}

function isPressureSide(value: unknown): value is PressureSide {
  return value === "shore" || value === "bay" || value === "even" || value === "unclear";
}

function isCurrentSide(value: unknown): value is CurrentSide {
  return value === "shore_less_adverse" ||
    value === "bay_less_adverse" ||
    value === "shore_more_favorable" ||
    value === "bay_more_favorable" ||
    value === "even" ||
    value === "unclear";
}

function isEdgeStrength(value: unknown): value is EdgeStrength {
  return value === "strong" ||
    value === "moderate" ||
    value === "weak" ||
    value === "unclear";
}

function isRouteBiasDecision(value: unknown): value is RouteBiasSnapshot["decision"] {
  return value === "shore_first" ||
    value === "bay_first" ||
    value === "neutral" ||
    value === "mixed_signal";
}

function isRouteBiasConfidence(value: unknown): value is RouteBiasSnapshot["confidence"] {
  return value === "low" || value === "medium" || value === "high";
}

function isPlanValidityState(value: unknown): value is PlanValidityResult["validityState"] {
  return value === "on_plan" ||
    value === "plan_weakening" ||
    value === "plan_invalidated" ||
    value === "new_edge_detected";
}

function isTacticalUpdateAction(value: unknown): value is TacticalUpdateAction {
  return value === "hold_course" ||
    value === "stay_flexible" ||
    value === "prepare_to_change_side_bias" ||
    value === "change_side_bias";
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

function sanitizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function sanitizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeRouteBiasAnswers(value: unknown): RouteBiasAnswers | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<RouteBiasAnswers>;
  const courseId = normalizeCourseId(input.courseId);
  const windDirectionDeg =
    typeof input.windDirectionDeg === "number" && Number.isFinite(input.windDirectionDeg)
      ? wrap360(input.windDirectionDeg)
      : null;
  const windSpeedKt =
    typeof input.windSpeedKt === "number" && Number.isFinite(input.windSpeedKt)
      ? input.windSpeedKt
      : null;

  if (
    windDirectionDeg == null ||
    windSpeedKt == null ||
    !isOpeningLegType(input.openingLegType) ||
    !isWindTrend(input.windTrend) ||
    !isPressureSide(input.pressureSide) ||
    !isCurrentSide(input.currentSide) ||
    !isEdgeStrength(input.edgeStrength)
  ) {
    return null;
  }

  return {
    courseId,
    openingLegType: input.openingLegType,
    windDirectionDeg,
    windSpeedKt,
    windTrend: input.windTrend,
    pressureSide: input.pressureSide,
    currentSide: input.currentSide,
    edgeStrength: input.edgeStrength,
  };
}

function sanitizeRouteBiasPlan(value: unknown): RouteBiasSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<RouteBiasSnapshot>;
  if (!isRouteBiasDecision(input.decision) || !isRouteBiasConfidence(input.confidence)) {
    return null;
  }

  return {
    decision: input.decision,
    confidence: input.confidence,
    shoreScore: sanitizeNumber(input.shoreScore),
    bayScore: sanitizeNumber(input.bayScore),
    reasons: sanitizeStringList(input.reasons),
    warnings: sanitizeStringList(input.warnings),
  };
}

function sanitizeRouteBiasUpdate(value: unknown): PlanValidityResult | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<PlanValidityResult>;
  if (
    !isPlanValidityState(input.validityState) ||
    !isTacticalUpdateAction(input.action) ||
    !isRouteBiasConfidence(input.confidence)
  ) {
    return null;
  }

  return {
    validityState: input.validityState,
    action: input.action,
    confidence: input.confidence,
    reasons: sanitizeStringList(input.reasons),
    warnings: sanitizeStringList(input.warnings),
    scoreDelta: {
      shore: sanitizeNumber(input.scoreDelta?.shore),
      bay: sanitizeNumber(input.scoreDelta?.bay),
    },
  };
}

function createEmptyRouteBiasState(): TacticalBoardRouteBiasState {
  return {
    originalAnswers: null,
    originalPlan: null,
    latestAnswers: null,
    latestPlan: null,
    latestUpdate: null,
  };
}

function sanitizeRouteBiasState(value: unknown): TacticalBoardRouteBiasState {
  if (!value || typeof value !== "object") {
    return createEmptyRouteBiasState();
  }

  const input = value as Partial<TacticalBoardRouteBiasState>;
  return {
    originalAnswers: sanitizeRouteBiasAnswers(input.originalAnswers),
    originalPlan: sanitizeRouteBiasPlan(input.originalPlan),
    latestAnswers: sanitizeRouteBiasAnswers(input.latestAnswers),
    latestPlan: sanitizeRouteBiasPlan(input.latestPlan),
    latestUpdate: sanitizeRouteBiasUpdate(input.latestUpdate),
  };
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

function syncDraftCoreFromRouteBiasAnswers(
  draft: TacticalBoardDraft,
  answers: RouteBiasAnswers,
  options: {
    updateMeanWind: boolean;
    updateCurrentWind: boolean;
  },
): TacticalBoardDraft {
  const normalizedAnswers = {
    ...answers,
    courseId: normalizeCourseId(answers.courseId),
    windDirectionDeg: wrap360(answers.windDirectionDeg),
  };
  const courseAlignedDraft =
    draft.courseId === normalizedAnswers.courseId
      ? draft
      : applyCourseToDraft(draft, normalizedAnswers.courseId);
  const windDirectionText = String(Math.round(normalizedAnswers.windDirectionDeg));

  return {
    ...courseAlignedDraft,
    courseId: normalizedAnswers.courseId,
    meanWindDirectionDeg: options.updateMeanWind
      ? windDirectionText
      : courseAlignedDraft.meanWindDirectionDeg,
    currentWindDirectionDeg: options.updateCurrentWind
      ? windDirectionText
      : courseAlignedDraft.currentWindDirectionDeg,
    windTrend: normalizedAnswers.windTrend,
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
    routeBias: sanitizeRouteBiasState(input?.routeBias),
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
    routeBias: createEmptyRouteBiasState(),
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

export function setTacticalBoardRouteBiasPlan(
  input: {
    answers: RouteBiasAnswers;
    plan: RouteBiasSnapshot;
  },
  options: { syncTracker?: boolean } = {},
) {
  const normalizedAnswers = sanitizeRouteBiasAnswers(input.answers) ?? {
    ...input.answers,
    courseId: normalizeCourseId(input.answers.courseId),
    windDirectionDeg: wrap360(input.answers.windDirectionDeg),
  };
  const sanitizedPlan = sanitizeRouteBiasPlan(input.plan) ?? input.plan;
  const nextDraft = updateTacticalBoardDraft((current) => ({
    ...syncDraftCoreFromRouteBiasAnswers(current, normalizedAnswers, {
      updateMeanWind: true,
      updateCurrentWind: true,
    }),
    routeBias: {
      originalAnswers: normalizedAnswers,
      originalPlan: sanitizedPlan,
      latestAnswers: normalizedAnswers,
      latestPlan: sanitizedPlan,
      latestUpdate: null,
    },
  }));

  if (options.syncTracker !== false) {
    const tracker = getStoredTrackerStateSnapshot();
    if (tracker.courseId !== normalizedAnswers.courseId) {
      setTrackerCourseId(normalizedAnswers.courseId);
    }
  }

  return nextDraft;
}

export function setTacticalBoardRouteBiasLatest(
  input: {
    answers: RouteBiasAnswers;
    latestPlan: RouteBiasSnapshot;
    latestUpdate: PlanValidityResult;
  },
  options: { syncTracker?: boolean } = {},
) {
  const normalizedAnswers = sanitizeRouteBiasAnswers(input.answers) ?? {
    ...input.answers,
    courseId: normalizeCourseId(input.answers.courseId),
    windDirectionDeg: wrap360(input.answers.windDirectionDeg),
  };
  const sanitizedPlan = sanitizeRouteBiasPlan(input.latestPlan) ?? input.latestPlan;
  const sanitizedUpdate = sanitizeRouteBiasUpdate(input.latestUpdate) ?? input.latestUpdate;
  const nextDraft = updateTacticalBoardDraft((current) => ({
    ...syncDraftCoreFromRouteBiasAnswers(current, normalizedAnswers, {
      updateMeanWind: false,
      updateCurrentWind: true,
    }),
    routeBias: {
      originalAnswers: current.routeBias.originalAnswers,
      originalPlan: current.routeBias.originalPlan,
      latestAnswers: normalizedAnswers,
      latestPlan: sanitizedPlan,
      latestUpdate: sanitizedUpdate,
    },
  }));

  if (options.syncTracker !== false) {
    const tracker = getStoredTrackerStateSnapshot();
    if (tracker.courseId !== normalizedAnswers.courseId) {
      setTrackerCourseId(normalizedAnswers.courseId);
    }
  }

  return nextDraft;
}
