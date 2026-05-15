import {
  getAllCourseIds,
  getCourseData,
  getDefaultCourseId,
  type CourseSummary,
} from "@/data/race/getCourseData";
import {
  absAngleDiffDeg,
  bearingDeg,
  crossTrackErrorNm,
  type MarkProgressResult,
} from "@/lib/race/courseTracker";
import type { RaceState } from "@/lib/race/state/types";

export type WindSourceMode = "nearest" | "top" | "bottom" | "river" | "manual";

export type TrackerLegDetectionState = {
  armedLegIndex: number | null;
  armedMarkId: string | null;
  armedAtISO: string | null;
  closestDistanceNm: number | null;
  lastDistanceToMarkNm: number | null;
};

export type TrackerLegTransition = {
  kind: "automatic" | "manual";
  courseId: string;
  fromLegIndex: number;
  toLegIndex: number;
  markId: string | null;
  atISO: string;
  message: string;
};

export type StoredTrackerState = {
  courseId: string;
  legIndex: number;
  windFrom: number | "";
  tackAngle?: number;
  windSource: WindSourceMode;
  legDetection: TrackerLegDetectionState;
  lastTransition: TrackerLegTransition | null;
};

type StoredTrackerStateInput = Partial<
  Omit<StoredTrackerState, "legDetection" | "lastTransition">
> & {
  legDetection?: Partial<TrackerLegDetectionState> | null;
  lastTransition?: Partial<TrackerLegTransition> | null;
};

type TrackerTransitionUpdate = {
  kind: "automatic" | "manual";
  markId?: string | null;
  message?: string;
};

export type AutomaticLegTransitionResult = {
  state: StoredTrackerState;
  status: "idle" | "armed" | "waiting" | "advanced" | "disarmed";
  transition: TrackerLegTransition | null;
};

const KNOWN_COURSE_IDS = new Set(getAllCourseIds());
const TRACKER_STATE_EVENT = "layline:active-course-tracker";
const AUTO_ADVANCE_CONFIRM_DISTANCE_NM = 0.05;
const AUTO_ADVANCE_DEPARTURE_DELTA_NM = 0.03;
const AUTO_ADVANCE_MIN_PROGRESS_NM = 0.01;
const AUTO_ADVANCE_DISARM_DISTANCE_NM = 0.18;
const AUTO_ADVANCE_CROSS_TRACK_TOLERANCE_NM = 0.12;
const AUTO_ADVANCE_BEARING_TOLERANCE_DEG = 85;
const AUTO_ADVANCE_MIN_SPEED_KT = 0.8;

export const TRACKER_STORAGE_KEY = "layline-active-course-tracker-v1";
export const RECENT_TRACKER_TRANSITION_WINDOW_MS = 20_000;

function createEmptyLegDetectionState(): TrackerLegDetectionState {
  return {
    armedLegIndex: null,
    armedMarkId: null,
    armedAtISO: null,
    closestDistanceNm: null,
    lastDistanceToMarkNm: null,
  };
}

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined" &&
    typeof localStorage.getItem === "function" &&
    typeof localStorage.setItem === "function"
  );
}

function readStorageCourseId(value: unknown) {
  return typeof value === "string" && KNOWN_COURSE_IDS.has(value)
    ? value
    : getDefaultCourseId();
}

function clampLegIndex(courseData: CourseSummary, legIndex: unknown) {
  const maxIndex = Math.max(0, courseData.course.legs.length - 1);
  if (typeof legIndex !== "number" || Number.isNaN(legIndex)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(legIndex), 0), maxIndex);
}

function readWindFrom(value: unknown): number | "" {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function readTackAngle(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readWindSourceMode(value: unknown): WindSourceMode {
  return value === "nearest" ||
    value === "top" ||
    value === "bottom" ||
    value === "river" ||
    value === "manual"
    ? value
    : "nearest";
}

function sanitizeLegDetection(
  value: StoredTrackerStateInput["legDetection"],
  safeLegIndex: number,
) {
  if (!value || typeof value !== "object") {
    return createEmptyLegDetectionState();
  }

  const armedLegIndex =
    typeof value.armedLegIndex === "number" && value.armedLegIndex === safeLegIndex
      ? value.armedLegIndex
      : null;

  return {
    armedLegIndex,
    armedMarkId: armedLegIndex != null && typeof value.armedMarkId === "string"
      ? value.armedMarkId
      : null,
    armedAtISO: armedLegIndex != null && typeof value.armedAtISO === "string"
      ? value.armedAtISO
      : null,
    closestDistanceNm:
      armedLegIndex != null &&
      typeof value.closestDistanceNm === "number" &&
      Number.isFinite(value.closestDistanceNm)
        ? value.closestDistanceNm
        : null,
    lastDistanceToMarkNm:
      armedLegIndex != null &&
      typeof value.lastDistanceToMarkNm === "number" &&
      Number.isFinite(value.lastDistanceToMarkNm)
        ? value.lastDistanceToMarkNm
        : null,
  };
}

function buildTransitionMessage(transition: {
  kind: "automatic" | "manual";
  toLegIndex: number;
  markId?: string | null;
}) {
  const markLabel = transition.markId ? ` after rounding ${transition.markId}` : "";

  return transition.kind === "automatic"
    ? `Auto-advanced to Leg ${transition.toLegIndex + 1}${markLabel}.`
    : `Manual override moved to Leg ${transition.toLegIndex + 1}.`;
}

function sanitizeTransition(
  value: StoredTrackerStateInput["lastTransition"],
  courseId: string,
  safeLegIndex: number,
) {
  if (!value || typeof value !== "object") return null;
  if (value.courseId !== courseId) return null;
  if (value.kind !== "automatic" && value.kind !== "manual") return null;
  if (
    typeof value.fromLegIndex !== "number" ||
    Number.isNaN(value.fromLegIndex) ||
    typeof value.toLegIndex !== "number" ||
    Number.isNaN(value.toLegIndex)
  ) {
    return null;
  }

  if (value.toLegIndex !== safeLegIndex) {
    return null;
  }

  return {
    kind: value.kind,
    courseId,
    fromLegIndex: Math.max(0, Math.round(value.fromLegIndex)),
    toLegIndex: Math.max(0, Math.round(value.toLegIndex)),
    markId: typeof value.markId === "string" ? value.markId : null,
    atISO: typeof value.atISO === "string" ? value.atISO : new Date().toISOString(),
    message:
      typeof value.message === "string"
        ? value.message
        : buildTransitionMessage({
            kind: value.kind,
            toLegIndex: safeLegIndex,
            markId: typeof value.markId === "string" ? value.markId : null,
          }),
  } satisfies TrackerLegTransition;
}

function sanitizeTrackerState(input: StoredTrackerStateInput): StoredTrackerState {
  const courseId = readStorageCourseId(input.courseId);
  const courseData = getCourseData(courseId);
  const safeLegIndex = clampLegIndex(courseData, input.legIndex);

  return {
    courseId,
    legIndex: safeLegIndex,
    windFrom: readWindFrom(input.windFrom),
    tackAngle: readTackAngle(input.tackAngle),
    windSource: readWindSourceMode(input.windSource),
    legDetection: sanitizeLegDetection(input.legDetection, safeLegIndex),
    lastTransition: sanitizeTransition(input.lastTransition, courseId, safeLegIndex),
  };
}

let memoryTrackerState = sanitizeTrackerState({});
let cachedTrackerRaw: string | null | undefined;
let cachedTrackerSnapshot = memoryTrackerState;

function readStoredTrackerStateSnapshot(): StoredTrackerState {
  if (!canUseLocalStorage()) {
    cachedTrackerRaw = undefined;
    cachedTrackerSnapshot = memoryTrackerState;
    return memoryTrackerState;
  }

  try {
    const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (raw === cachedTrackerRaw) {
      return cachedTrackerSnapshot;
    }

    cachedTrackerRaw = raw;

    const parsed =
      raw != null
        ? JSON.parse(raw)
        : memoryTrackerState;
    const sanitized =
      typeof parsed === "object" && parsed != null
        ? sanitizeTrackerState(parsed)
        : memoryTrackerState;

    memoryTrackerState = sanitized;
    cachedTrackerSnapshot = sanitized;
    return sanitized;
  } catch {
    cachedTrackerSnapshot = memoryTrackerState;
    return memoryTrackerState;
  }
}

export function getStoredTrackerStateSnapshot() {
  return readStoredTrackerStateSnapshot();
}

function writeStoredTrackerState(nextState: StoredTrackerState) {
  memoryTrackerState = nextState;
  cachedTrackerSnapshot = nextState;

  if (canUseLocalStorage()) {
    try {
      cachedTrackerRaw = JSON.stringify(nextState);
      localStorage.setItem(TRACKER_STORAGE_KEY, cachedTrackerRaw);
    } catch {
      // Keep the in-memory state if persistence is unavailable.
      cachedTrackerRaw = undefined;
    }
  } else {
    cachedTrackerRaw = undefined;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRACKER_STATE_EVENT, { detail: nextState }));
  }
}

function shallowTrackerStateEqual(a: StoredTrackerState, b: StoredTrackerState) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function subscribeStoredTrackerState(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleTrackerState = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TRACKER_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(TRACKER_STATE_EVENT, handleTrackerState);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(TRACKER_STATE_EVENT, handleTrackerState);
    window.removeEventListener("storage", handleStorage);
  };
}

export function updateStoredTrackerState(
  updater: (current: StoredTrackerState) => StoredTrackerState,
) {
  const current = getStoredTrackerStateSnapshot();
  const next = sanitizeTrackerState(updater(current));
  if (shallowTrackerStateEqual(current, next)) {
    return current;
  }

  writeStoredTrackerState(next);
  return next;
}

function buildTrackerTransition(params: {
  courseId: string;
  fromLegIndex: number;
  toLegIndex: number;
  update: TrackerTransitionUpdate;
}) {
  return {
    kind: params.update.kind,
    courseId: params.courseId,
    fromLegIndex: params.fromLegIndex,
    toLegIndex: params.toLegIndex,
    markId: params.update.markId ?? null,
    atISO: new Date().toISOString(),
    message:
      params.update.message ??
      buildTransitionMessage({
        kind: params.update.kind,
        toLegIndex: params.toLegIndex,
        markId: params.update.markId ?? null,
      }),
  } satisfies TrackerLegTransition;
}

export function setTrackerCourseId(courseId: string) {
  return updateStoredTrackerState((current) => {
    const nextCourseId = readStorageCourseId(courseId);
    if (current.courseId === nextCourseId && current.legIndex === 0) {
      return current;
    }

    return {
      ...current,
      courseId: nextCourseId,
      legIndex: 0,
      legDetection: createEmptyLegDetectionState(),
      lastTransition: null,
    };
  });
}

export function setTrackerLegIndex(
  legIndex: number,
  update: TrackerTransitionUpdate = { kind: "manual" },
) {
  return updateStoredTrackerState((current) => {
    const courseData = getCourseData(current.courseId);
    const nextLegIndex = clampLegIndex(courseData, legIndex);
    const fromLegIndex = clampLegIndex(courseData, current.legIndex);

    if (nextLegIndex === fromLegIndex) {
      return current;
    }

    return {
      ...current,
      legIndex: nextLegIndex,
      legDetection: createEmptyLegDetectionState(),
      lastTransition: buildTrackerTransition({
        courseId: current.courseId,
        fromLegIndex,
        toLegIndex: nextLegIndex,
        update,
      }),
    };
  });
}

export function setTrackerWindFrom(windFrom: number | "") {
  return updateStoredTrackerState((current) => ({
    ...current,
    windFrom,
  }));
}

export function setTrackerTackAngle(tackAngle: number) {
  return updateStoredTrackerState((current) => ({
    ...current,
    tackAngle,
  }));
}

export function setTrackerWindSource(windSource: WindSourceMode) {
  return updateStoredTrackerState((current) => ({
    ...current,
    windSource,
  }));
}

function speedKt(sogMps: number | null) {
  return sogMps == null ? null : sogMps * 1.943844;
}

function positionToLocalNm(
  origin: { lat: number; lon: number },
  point: { lat: number; lon: number },
) {
  const latScale = Math.cos((origin.lat * Math.PI) / 180);

  return {
    x: (point.lon - origin.lon) * 60 * latScale,
    y: (point.lat - origin.lat) * 60,
  };
}

function projectAlongTrackNm(
  origin: { lat: number; lon: number },
  end: { lat: number; lon: number },
  point: { lat: number; lon: number },
) {
  const legVector = positionToLocalNm(origin, end);
  const boatVector = positionToLocalNm(origin, point);
  const legLength = Math.hypot(legVector.x, legVector.y);

  if (legLength < 0.001) {
    return 0;
  }

  return (boatVector.x * legVector.x + boatVector.y * legVector.y) / legLength;
}

function isGpsUsableForAutoAdvance(raceState: RaceState) {
  return (
    raceState.sources.gps.status === "live" &&
    raceState.sources.gps.freshness !== "stale" &&
    raceState.boat.position != null
  );
}

export function syncAutomaticLegTransition(params: {
  courseData: CourseSummary;
  raceState: RaceState;
  result: MarkProgressResult | null;
  approachingMark: boolean;
}): AutomaticLegTransitionResult {
  let status: AutomaticLegTransitionResult["status"] = "idle";
  let transition: TrackerLegTransition | null = null;

  const state = updateStoredTrackerState((current) => {
    if (current.courseId !== params.courseData.courseId) {
      status = "idle";
      return current;
    }

    const currentLegIndex = clampLegIndex(params.courseData, current.legIndex);
    if (currentLegIndex !== params.raceState.course.safeLegIndex) {
      status = "idle";
      return current;
    }

    const currentLeg = params.courseData.course.legs[currentLegIndex];
    const nextLeg = params.courseData.course.legs[currentLegIndex + 1];

    if (!currentLeg || !nextLeg) {
      if (current.legDetection.armedLegIndex != null) {
        status = "disarmed";
        return {
          ...current,
          legDetection: createEmptyLegDetectionState(),
        };
      }

      status = "idle";
      return current;
    }

    const toMark = params.courseData.marks[currentLeg.toMark];
    const nextMark = params.courseData.marks[nextLeg.toMark];
    const distanceToMarkNm = params.result?.distanceToMarkNm ?? null;
    const boatPosition = params.raceState.boat.position;

    if (
      !toMark ||
      !nextMark ||
      boatPosition == null ||
      distanceToMarkNm == null ||
      !isGpsUsableForAutoAdvance(params.raceState)
    ) {
      status = current.legDetection.armedLegIndex === currentLegIndex ? "waiting" : "idle";
      return current;
    }

    const markPosition = { lat: toMark.lat, lon: toMark.lon };
    const nextMarkPosition = { lat: nextMark.lat, lon: nextMark.lon };
    const boat = boatPosition;
    const sogKt = speedKt(params.raceState.boat.sogMps);
    const confirmDistanceNm = Math.min(
      AUTO_ADVANCE_CONFIRM_DISTANCE_NM,
      params.raceState.course.markApproachDistanceNm,
    );
    const armingDistanceNm = Math.max(
      params.raceState.course.markApproachDistanceNm,
      confirmDistanceNm + 0.02,
    );
    const disarmDistanceNm = Math.max(
      AUTO_ADVANCE_DISARM_DISTANCE_NM,
      confirmDistanceNm + 0.08,
    );

    const existingDetection =
      current.legDetection.armedLegIndex === currentLegIndex &&
      current.legDetection.armedMarkId === currentLeg.toMark
        ? current.legDetection
        : createEmptyLegDetectionState();

    let nextDetection = existingDetection;
    const shouldArm =
      params.approachingMark || distanceToMarkNm <= armingDistanceNm;

    if (shouldArm) {
      nextDetection = {
        armedLegIndex: currentLegIndex,
        armedMarkId: currentLeg.toMark,
        armedAtISO: existingDetection.armedAtISO ?? new Date().toISOString(),
        closestDistanceNm:
          existingDetection.closestDistanceNm == null
            ? distanceToMarkNm
            : Math.min(existingDetection.closestDistanceNm, distanceToMarkNm),
        lastDistanceToMarkNm: distanceToMarkNm,
      };

      if (params.approachingMark) {
        status = "armed";
        return {
          ...current,
          legDetection: nextDetection,
        };
      }
    }

    if (nextDetection.armedLegIndex !== currentLegIndex) {
      status = "idle";
      return current;
    }

    const closestDistanceNm = Math.min(
      nextDetection.closestDistanceNm ?? distanceToMarkNm,
      distanceToMarkNm,
    );
    const confirmedRounding = closestDistanceNm <= confirmDistanceNm;
    const movedAwayEnough =
      distanceToMarkNm >=
      Math.max(closestDistanceNm + AUTO_ADVANCE_DEPARTURE_DELTA_NM, confirmDistanceNm + 0.01);

    nextDetection = {
      ...nextDetection,
      closestDistanceNm,
      lastDistanceToMarkNm: distanceToMarkNm,
    };

    if (!confirmedRounding) {
      if (distanceToMarkNm >= disarmDistanceNm) {
        status = "disarmed";
        return {
          ...current,
          legDetection: createEmptyLegDetectionState(),
        };
      }

      status = "armed";
      return {
        ...current,
        legDetection: nextDetection,
      };
    }

    if (!movedAwayEnough || sogKt == null || sogKt < AUTO_ADVANCE_MIN_SPEED_KT) {
      status = "waiting";
      return {
        ...current,
        legDetection: nextDetection,
      };
    }

    const alongTrackNm = projectAlongTrackNm(markPosition, nextMarkPosition, boat);
    const crossTrackNm = Math.abs(crossTrackErrorNm(markPosition, nextMarkPosition, boat));
    const departureBearingDeg = bearingDeg(markPosition, boat);
    const departureBearingErrorDeg = absAngleDiffDeg(
      departureBearingDeg,
      nextLeg.bearingDeg,
    );
    const nextMarkBearingDeg = bearingDeg(boat, nextMarkPosition);
    const cogAlignmentErrorDeg =
      params.raceState.boat.cogDeg == null
        ? null
        : absAngleDiffDeg(params.raceState.boat.cogDeg, nextMarkBearingDeg);

    const alignedForNextLeg =
      alongTrackNm >= AUTO_ADVANCE_MIN_PROGRESS_NM &&
      crossTrackNm <= AUTO_ADVANCE_CROSS_TRACK_TOLERANCE_NM &&
      (departureBearingErrorDeg <= AUTO_ADVANCE_BEARING_TOLERANCE_DEG ||
        (cogAlignmentErrorDeg != null &&
          cogAlignmentErrorDeg <= AUTO_ADVANCE_BEARING_TOLERANCE_DEG));

    if (!alignedForNextLeg) {
      if (distanceToMarkNm >= disarmDistanceNm) {
        status = "disarmed";
        return {
          ...current,
          legDetection: createEmptyLegDetectionState(),
        };
      }

      status = "waiting";
      return {
        ...current,
        legDetection: nextDetection,
      };
    }

    const nextLegIndex = clampLegIndex(params.courseData, currentLegIndex + 1);
    transition = buildTrackerTransition({
      courseId: current.courseId,
      fromLegIndex: currentLegIndex,
      toLegIndex: nextLegIndex,
      update: {
        kind: "automatic",
        markId: currentLeg.toMark,
      },
    });
    status = "advanced";

    return {
      ...current,
      legIndex: nextLegIndex,
      legDetection: createEmptyLegDetectionState(),
      lastTransition: transition,
    };
  });

  return {
    state,
    status,
    transition,
  };
}

export function isRecentTrackerTransition(
  transition: TrackerLegTransition | null,
  nowMs = Date.now(),
) {
  if (!transition) return false;

  const atMs = new Date(transition.atISO).getTime();
  if (Number.isNaN(atMs)) return false;

  return nowMs - atMs <= RECENT_TRACKER_TRANSITION_WINDOW_MS;
}
