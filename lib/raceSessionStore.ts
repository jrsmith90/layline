"use client";

import { getCourseData } from "@/data/race/getCourseData";
import type { MarkProgressCall, MarkProgressResult } from "@/lib/race/courseTracker";
import type {
  RaceState,
  RaceStateConfidenceLevel,
  RaceStateSnapshot,
  RaceStateSourceFreshness,
  RaceStateSourceStatus,
  RaceStateWindSourceMode,
} from "@/lib/race/state/types";
import type { DerivedLiveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoardFromRaceState";
import type { TacticalBoardSnapshot } from "@/lib/race/tacticalBoard/types";
import type { GpsTrackPoint } from "@/lib/useGpsCourse";
import type { LaylineLog } from "@/lib/logStore";
import { getLogs } from "@/lib/logStore";
import type { OpeningBiasRecord } from "@/lib/race/openingBias";
import {
  detectAutomaticTackRecords,
  detectAutomaticTackCalibrations,
  getKnownStandardTackAngle,
  mergeTackCalibrations,
  mergeTackRecords,
  readTackCalibrations,
  saveTackCalibrations,
  type TackRecord,
  type TackCalibrationResult,
} from "@/lib/race/tackCalibration";

export type { TackRecord } from "@/lib/race/tackCalibration";

export type RaceSessionStatus = "active" | "ended";
export type RaceDecisionKind =
  | "route"
  | "start"
  | "trim"
  | "troubleshoot"
  | "tack"
  | "mark"
  | "manual";

export type RaceWeatherSample = {
  atISO: string;
  source: "live-weather" | "historical-weather";
  topWindAvgKt?: number;
  topWindGustKt?: number;
  topWindDirectionDeg?: number;
  bottomWindAvgKt?: number;
  bottomWindGustKt?: number;
  bottomWindDirectionDeg?: number;
  riverWindAvgKt?: number;
  riverWindGustKt?: number;
  riverWindDirectionDeg?: number;
  waveHeightFt?: number;
  wavePeriodSec?: number;
  trend?: "building" | "easing" | "steady" | "unknown";
};

export type RaceDecisionCourseSectionRelevance =
  | "local_to_boat"
  | "top_of_course"
  | "bottom_of_course"
  | "river_corridor"
  | "manual_override";

export type RaceDecisionWeatherSourceMeta = {
  sourceId: string;
  sourceMode: RaceStateWindSourceMode;
  sourceLabel: string;
  sourceDetail: string;
  sourceObservedAt: string | null;
  courseSectionRelevance: RaceDecisionCourseSectionRelevance;
  freshness: RaceStateSourceFreshness;
  confidence: RaceStateConfidenceLevel;
  status: RaceStateSourceStatus;
};

export type RaceDecisionSourceMeta = {
  overallConfidence: RaceStateConfidenceLevel;
  weather: RaceDecisionWeatherSourceMeta;
};

export type RaceDecisionRecord = {
  id: string;
  atISO: string;
  kind: RaceDecisionKind;
  label: string;
  recommendation: string;
  inputs?: Record<string, unknown>;
  sourceMeta?: RaceDecisionSourceMeta;
  userAction?: "followed" | "ignored" | "modified";
  outcome?: "better" | "same" | "worse";
  coachingNote?: string;
};

export type RaceSession = {
  id: string;
  name: string;
  eventId?: string;
  courseId?: string;
  openingBias?: OpeningBiasRecord | null;
  startedAtISO: string;
  endedAtISO?: string;
  status: RaceSessionStatus;
  createdFrom?: "live" | "recovered" | "imported";
  crewNotes?: string;
  updatedAtISO?: string;
  gpsTrack: GpsTrackPoint[];
  weatherSamples: RaceWeatherSample[];
  decisions: RaceDecisionRecord[];
  raceStateSnapshots: RaceStateSnapshot[];
  tacticalBoardSnapshots: TacticalBoardSnapshot[];
  trimLogs: LaylineLog[];
  tackCalibrations: TackCalibrationResult[];
  tackRecords: TackRecord[];
};

export type RaceStateSnapshotCaptureInput = {
  state: RaceState;
  progress: MarkProgressResult | null;
  primaryCall: MarkProgressCall | "approach";
  approachingMark: boolean;
  capturedAtISO?: string;
};

export type TacticalBoardSnapshotCaptureInput = {
  liveBoard: DerivedLiveTacticalBoard;
  raceState: RaceState;
  capturedAtISO?: string;
};

export type RaceSessionReview = {
  session: RaceSession;
  assessedDecisions: RaceDecisionRecord[];
  durationMin: number | null;
  gpsPointCount: number;
  weatherSampleCount: number;
  decisionCount: number;
  goodDecisionCount: number;
  neutralDecisionCount: number;
  badDecisionCount: number;
  unratedDecisionCount: number;
  decisionScorePct: number | null;
  decisionGrade: "needs_data" | "needs_work" | "mixed" | "solid" | "sharp";
  averageSogKt: number | null;
  maxSogKt: number | null;
  topBottomWindSpreadKt: number | null;
  topBottomDirectionSpreadDeg: number | null;
  buildingWeather: boolean;
  incorrectChoices: RaceDecisionRecord[];
  coachingSignals: string[];
  workOnNext: string[];
};

const SESSIONS_KEY = "layline-race-sessions-v1";
const ACTIVE_SESSION_ID_KEY = "layline-active-race-session-id-v1";
const SNAPSHOT_CACHE_KEY = "layline-race-session-repository-cache-v1";
const GPS_TRACK_KEY = "layline-phone-gps-track-v1";
const TRACKER_KEY = "layline-active-course-tracker-v1";
const REPOSITORY_ENDPOINT = "/api/race-sessions";
const MAX_RACE_STATE_SNAPSHOTS = 720;
const MAX_TACTICAL_BOARD_SNAPSHOTS = 720;
const RACE_STATE_SNAPSHOT_DEDUPE_MS = 5000;
const TACTICAL_BOARD_SNAPSHOT_DEDUPE_MS = 5000;

export type RaceSessionRepositorySnapshot = {
  sessions: RaceSession[];
  activeSessionId: string | null;
  updatedAtISO: string;
};

export type RaceSessionRecoverySource = "shared" | "local" | "merged" | "empty";

export type RaceSessionRepositoryRecoveryResult = {
  snapshot: RaceSessionRepositorySnapshot;
  source: RaceSessionRecoverySource;
  fallbackUsed: boolean;
  error: string | null;
};

export type RecoverTodayRaceSessionResult = {
  session: RaceSession;
  recovery: RaceSessionRepositoryRecoveryResult;
};

export type ImportRaceSessionInput = {
  fileName: string;
  gpsTrack: GpsTrackPoint[];
  startedAtISO: string;
  endedAtISO: string;
  name?: string;
  courseId?: string;
  weatherSamples?: RaceWeatherSample[];
  warnings?: string[];
};

export type RaceSessionTimeEditMode = "keep_window" | "delete_window";

type RaceSessionStoreListener = () => void;

let cachedSnapshot: RaceSessionRepositorySnapshot | null = null;
let repositoryHydrationPromise: Promise<RaceSessionRepositoryRecoveryResult> | null = null;
const storeListeners = new Set<RaceSessionStoreListener>();

function hasLocalStorage() {
  return (
    typeof localStorage !== "undefined" &&
    typeof localStorage.getItem === "function" &&
    typeof localStorage.setItem === "function"
  );
}

function nowISO() {
  return new Date().toISOString();
}

function safeUUID() {
  const cryptoLike = globalThis.crypto;
  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID();
  return `race_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function timeValue(value?: string) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRaceSession(session: RaceSession): RaceSession {
  return {
    ...session,
    openingBias:
      session.openingBias && typeof session.openingBias === "object"
        ? session.openingBias
        : null,
    gpsTrack: Array.isArray(session.gpsTrack) ? session.gpsTrack : [],
    weatherSamples: Array.isArray(session.weatherSamples) ? session.weatherSamples : [],
    decisions: Array.isArray(session.decisions) ? session.decisions : [],
    raceStateSnapshots: Array.isArray(session.raceStateSnapshots)
      ? session.raceStateSnapshots
      : [],
    tacticalBoardSnapshots: Array.isArray(session.tacticalBoardSnapshots)
      ? session.tacticalBoardSnapshots
      : [],
    trimLogs: Array.isArray(session.trimLogs) ? session.trimLogs : [],
    tackCalibrations: Array.isArray(session.tackCalibrations)
      ? session.tackCalibrations
      : [],
    tackRecords: Array.isArray(session.tackRecords) ? session.tackRecords : [],
    updatedAtISO:
      typeof session.updatedAtISO === "string"
        ? session.updatedAtISO
        : session.endedAtISO ?? session.startedAtISO,
  };
}

function uniqueByKey<T>(
  items: T[],
  keyOf: (item: T) => string | null,
  sort: (left: T, right: T) => number,
) {
  const byKey = new Map<string, T>();

  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    byKey.set(key, item);
  }

  return Array.from(byKey.values()).sort(sort);
}

function mergeRaceSession(existing: RaceSession, incoming: RaceSession): RaceSession {
  const left = normalizeRaceSession(existing);
  const right = normalizeRaceSession(incoming);
  const primary =
    timeValue(right.updatedAtISO) >= timeValue(left.updatedAtISO) ? right : left;
  const secondary = primary === right ? left : right;

  return normalizeRaceSession({
    ...secondary,
    ...primary,
    gpsTrack: uniqueByKey(
      [...secondary.gpsTrack, ...primary.gpsTrack],
      (point) => point.at,
      (leftPoint, rightPoint) => leftPoint.at.localeCompare(rightPoint.at),
    ),
    weatherSamples: uniqueByKey(
      [...secondary.weatherSamples, ...primary.weatherSamples],
      (sample) => sample.atISO,
      (leftSample, rightSample) => leftSample.atISO.localeCompare(rightSample.atISO),
    ),
    decisions: uniqueByKey(
      [...secondary.decisions, ...primary.decisions],
      (decision) => decision.id,
      (leftDecision, rightDecision) => rightDecision.atISO.localeCompare(leftDecision.atISO),
    ),
    raceStateSnapshots: uniqueByKey(
      [...secondary.raceStateSnapshots, ...primary.raceStateSnapshots],
      (snapshot) => snapshot.capturedAtISO,
      (leftSnapshot, rightSnapshot) =>
        leftSnapshot.capturedAtISO.localeCompare(rightSnapshot.capturedAtISO),
    ).slice(-MAX_RACE_STATE_SNAPSHOTS),
    tacticalBoardSnapshots: uniqueByKey(
      [...secondary.tacticalBoardSnapshots, ...primary.tacticalBoardSnapshots],
      (snapshot) => snapshot.capturedAtISO,
      (leftSnapshot, rightSnapshot) =>
        leftSnapshot.capturedAtISO.localeCompare(rightSnapshot.capturedAtISO),
    ).slice(-MAX_TACTICAL_BOARD_SNAPSHOTS),
    trimLogs: uniqueByKey(
      [...secondary.trimLogs, ...primary.trimLogs],
      (log) => log.id,
      (leftLog, rightLog) =>
        rightLog.updatedAtISO.localeCompare(leftLog.updatedAtISO),
    ),
    tackCalibrations: uniqueByKey(
      [...secondary.tackCalibrations, ...primary.tackCalibrations],
      (calibration) => calibration.id ?? calibration.at,
      (leftCalibration, rightCalibration) =>
        rightCalibration.at.localeCompare(leftCalibration.at),
    ),
    tackRecords: uniqueByKey(
      [...secondary.tackRecords, ...primary.tackRecords],
      (record) => record.id,
      (leftRecord, rightRecord) => rightRecord.atISO.localeCompare(leftRecord.atISO),
    ),
  });
}

function mergeRaceSessions(existing: RaceSession[], incoming: RaceSession[]) {
  const byId = new Map<string, RaceSession>();

  for (const session of existing.map(normalizeRaceSession)) {
    byId.set(session.id, session);
  }

  for (const session of incoming.map(normalizeRaceSession)) {
    const current = byId.get(session.id);
    byId.set(session.id, current ? mergeRaceSession(current, session) : session);
  }

  return Array.from(byId.values()).sort((left, right) =>
    right.startedAtISO.localeCompare(left.startedAtISO),
  );
}

function normalizeSnapshot(
  snapshot: Partial<RaceSessionRepositorySnapshot> | null | undefined,
): RaceSessionRepositorySnapshot {
  const sessions = mergeRaceSessions([], Array.isArray(snapshot?.sessions) ? snapshot.sessions : []);
  const activeSessionId =
    typeof snapshot?.activeSessionId === "string" &&
    sessions.some((session) => session.id === snapshot.activeSessionId)
      ? snapshot.activeSessionId
      : null;

  return {
    sessions,
    activeSessionId,
    updatedAtISO:
      typeof snapshot?.updatedAtISO === "string"
        ? snapshot.updatedAtISO
        : sessions[0]?.updatedAtISO ?? sessions[0]?.startedAtISO ?? nowISO(),
  };
}

function hasSnapshotData(snapshot: RaceSessionRepositorySnapshot) {
  return snapshot.sessions.length > 0 || snapshot.activeSessionId != null;
}

function mergeSnapshots(
  existing: RaceSessionRepositorySnapshot,
  incoming: RaceSessionRepositorySnapshot,
) {
  const sessions = mergeRaceSessions(existing.sessions, incoming.sessions);
  const preferredActiveSessionId =
    timeValue(incoming.updatedAtISO) >= timeValue(existing.updatedAtISO)
      ? incoming.activeSessionId ?? existing.activeSessionId
      : existing.activeSessionId ?? incoming.activeSessionId;
  const activeSessionId =
    preferredActiveSessionId &&
    sessions.some((session) => session.id === preferredActiveSessionId)
      ? preferredActiveSessionId
      : null;

  return normalizeSnapshot({
    sessions,
    activeSessionId,
    updatedAtISO:
      timeValue(incoming.updatedAtISO) >= timeValue(existing.updatedAtISO)
        ? incoming.updatedAtISO
        : existing.updatedAtISO,
  });
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasLocalStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function notifyStoreListeners() {
  for (const listener of storeListeners) {
    listener();
  }
}

function readLocalSnapshot() {
  const cached = readJson<Partial<RaceSessionRepositorySnapshot> | null>(
    SNAPSHOT_CACHE_KEY,
    null,
  );

  if (cached && typeof cached === "object") {
    return normalizeSnapshot(cached);
  }

  const sessions = readJson<RaceSession[]>(SESSIONS_KEY, []);
  const activeSessionId = hasLocalStorage()
    ? localStorage.getItem(ACTIVE_SESSION_ID_KEY)
    : null;

  return normalizeSnapshot({
    sessions,
    activeSessionId,
    updatedAtISO: sessions[0]?.updatedAtISO ?? sessions[0]?.startedAtISO ?? nowISO(),
  });
}

function writeLocalSnapshot(snapshot: RaceSessionRepositorySnapshot) {
  if (!hasLocalStorage()) return;

  writeJson(SESSIONS_KEY, snapshot.sessions);
  writeJson(SNAPSHOT_CACHE_KEY, snapshot);

  if (snapshot.activeSessionId) {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, snapshot.activeSessionId);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  }
}

function getCachedSnapshot() {
  cachedSnapshot ??= readLocalSnapshot();
  return cachedSnapshot;
}

function applySnapshot(
  snapshot: RaceSessionRepositorySnapshot,
  options: { persistLocal?: boolean; notify?: boolean } = {},
) {
  const nextSnapshot = normalizeSnapshot(snapshot);
  cachedSnapshot = nextSnapshot;

  if (options.persistLocal !== false) {
    writeLocalSnapshot(nextSnapshot);
  }

  if (options.notify !== false) {
    notifyStoreListeners();
  }

  return nextSnapshot;
}

async function fetchRepositorySnapshot() {
  const response = await fetch(REPOSITORY_ENDPOINT, {
    cache: "no-store",
  });
  const payload = (await response.json()) as Partial<RaceSessionRepositorySnapshot>;

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" &&
        payload != null &&
        "error" in payload &&
        typeof payload.error === "string"
        ? payload.error
        : "Failed to load race session repository.",
    );
  }

  return normalizeSnapshot(payload);
}

async function postRepositorySnapshot(snapshot: RaceSessionRepositorySnapshot) {
  const response = await fetch(REPOSITORY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(snapshot),
  });
  const payload = (await response.json()) as Partial<RaceSessionRepositorySnapshot>;

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" &&
        payload != null &&
        "error" in payload &&
        typeof payload.error === "string"
        ? payload.error
        : "Failed to save race session repository.",
    );
  }

  return normalizeSnapshot(payload);
}

function queueRepositoryPersist(snapshot: RaceSessionRepositorySnapshot) {
  const pendingSnapshot = normalizeSnapshot(snapshot);

  void postRepositorySnapshot(pendingSnapshot)
    .then((savedSnapshot) => {
      applySnapshot(savedSnapshot);
    })
    .catch(() => {
      // Keep local fallback intact if the shared repository is unavailable.
    });
}

function replaceSessions(sessions: RaceSession[], activeSessionId: string | null) {
  return applySnapshot({
    sessions: mergeRaceSessions([], sessions),
    activeSessionId,
    updatedAtISO: nowISO(),
  });
}

function commitSnapshot(snapshot: RaceSessionRepositorySnapshot) {
  const nextSnapshot = applySnapshot(snapshot);
  queueRepositoryPersist(nextSnapshot);
  return nextSnapshot;
}

function updateSessionInStore(session: RaceSession) {
  const snapshot = getCachedSnapshot();
  const updatedSession = normalizeRaceSession({
    ...session,
    updatedAtISO: nowISO(),
  });
  const nextSnapshot = {
    ...snapshot,
    sessions: mergeRaceSessions(snapshot.sessions, [updatedSession]),
    updatedAtISO: updatedSession.updatedAtISO ?? nowISO(),
  };

  return commitSnapshot(nextSnapshot);
}

function trimRaceStateSnapshots(snapshots: RaceStateSnapshot[]) {
  return snapshots
    .slice()
    .sort((left, right) => left.capturedAtISO.localeCompare(right.capturedAtISO))
    .slice(-MAX_RACE_STATE_SNAPSHOTS);
}

function trimTacticalBoardSnapshots(snapshots: TacticalBoardSnapshot[]) {
  return snapshots
    .slice()
    .sort((left, right) => left.capturedAtISO.localeCompare(right.capturedAtISO))
    .slice(-MAX_TACTICAL_BOARD_SNAPSHOTS);
}

function getDecisionWeatherSourceId(state: RaceState) {
  switch (state.wind.sourceMode) {
    case "nearest": {
      const nearestId = state.wind.sourceLabel.trim().match(/^([A-Za-z0-9_-]+)/)?.[1];
      return nearestId || "nearest_wind_marker";
    }
    case "top":
      return "cbibs_annapolis";
    case "bottom":
      return "thomas_point";
    case "river":
      return "knak";
    case "manual":
      return "manual_override";
    default:
      return "unknown_wind_source";
  }
}

function getDecisionCourseSectionRelevance(
  sourceMode: RaceStateWindSourceMode,
): RaceDecisionCourseSectionRelevance {
  switch (sourceMode) {
    case "nearest":
      return "local_to_boat";
    case "top":
      return "top_of_course";
    case "bottom":
      return "bottom_of_course";
    case "river":
      return "river_corridor";
    case "manual":
      return "manual_override";
    default:
      return "local_to_boat";
  }
}

export function buildRaceDecisionSourceMeta(state: RaceState): RaceDecisionSourceMeta {
  return {
    overallConfidence: state.confidence.overall,
    weather: {
      sourceId: getDecisionWeatherSourceId(state),
      sourceMode: state.wind.sourceMode,
      sourceLabel: state.wind.sourceLabel,
      sourceDetail: state.wind.sourceDetail,
      sourceObservedAt: state.wind.observedAt,
      courseSectionRelevance: getDecisionCourseSectionRelevance(state.wind.sourceMode),
      freshness: state.sources.wind.freshness,
      confidence: state.confidence.wind,
      status: state.sources.wind.status,
    },
  };
}

function toRaceStateSnapshotProgress(
  progress: MarkProgressResult | null,
): RaceStateSnapshot["progress"] {
  if (!progress) return null;

  return {
    call: progress.call,
    headline: progress.headline,
    detail: progress.detail,
    warnings: progress.warnings,
    distanceToMarkNm: progress.distanceToMarkNm,
    bearingToMarkDeg: progress.bearingToMarkDeg,
    vmgToMarkKt: progress.vmgToMarkKt,
    crossTrackErrorNm: progress.crossTrackErrorNm,
    currentTack: progress.currentTack,
    currentTackHeadingDeg: progress.currentTackHeadingDeg,
    oppositeTackHeadingDeg: progress.oppositeTackHeadingDeg,
    currentTackFetches: progress.currentTackFetches,
    oppositeTackFetches: progress.oppositeTackFetches,
    degreesOffLaylineDeg: progress.degreesOffLaylineDeg,
    nextTackHeadingDeg: progress.nextTackHeadingDeg,
    distanceToTackNm: progress.distanceToTackNm,
    minutesToTack: progress.minutesToTack,
  };
}

function toRaceStateSnapshotLegality(
  state: RaceState,
): RaceStateSnapshot["legality"] {
  return {
    overall: state.legality.overall,
    summary: state.legality.summary,
    detail: state.legality.detail,
    activeConstraints: state.legality.activeConstraints.map((assessment) => ({
      constraintId: assessment.constraintId,
      status: assessment.status,
      headline: assessment.headline,
      detail: assessment.detail,
      metricNm: assessment.metricNm,
    })),
  };
}

function buildRaceStateSnapshot(input: RaceStateSnapshotCaptureInput): RaceStateSnapshot {
  return {
    capturedAtISO: input.capturedAtISO ?? nowISO(),
    stateGeneratedAt: input.state.generatedAt,
    primaryCall: input.primaryCall,
    approachingMark: input.approachingMark,
    boat: input.state.boat,
    wind: input.state.wind,
    performance: input.state.performance,
    course: {
      selectedCourseId: input.state.course.selectedCourseId,
      legIndex: input.state.course.legIndex,
      safeLegIndex: input.state.course.safeLegIndex,
      totalLegs: input.state.course.totalLegs,
      markApproachDistanceNm: input.state.course.markApproachDistanceNm,
      activeLeg: input.state.course.activeLeg,
      fromMark: input.state.course.fromMark,
      toMark: input.state.course.toMark,
    },
    sources: input.state.sources,
    confidence: input.state.confidence,
    legality: toRaceStateSnapshotLegality(input.state),
    progress: toRaceStateSnapshotProgress(input.progress),
  };
}

function buildTacticalBoardSnapshot(
  input: TacticalBoardSnapshotCaptureInput,
): TacticalBoardSnapshot {
  return {
    capturedAtISO: input.capturedAtISO ?? nowISO(),
    boardGeneratedAt: input.liveBoard.board.generatedAt,
    board: input.liveBoard.board,
    liveContext: {
      activeLegLabel: input.liveBoard.activeLegLabel,
      legMode: input.liveBoard.legMode,
      currentWindSource: input.liveBoard.currentWindSource,
      usesActiveLegBearing: input.liveBoard.usesActiveLegBearing,
      windSourceLabel: input.raceState.wind.sourceLabel,
      windSourceMode: input.raceState.wind.sourceMode,
      windFreshness: input.raceState.sources.wind.freshness,
      overallConfidence: input.raceState.confidence.overall,
    },
  };
}

function shouldSkipRaceStateSnapshot(
  previous: RaceStateSnapshot | null | undefined,
  next: RaceStateSnapshot,
) {
  if (!previous) return false;

  const previousMs = timeValue(previous.capturedAtISO);
  const nextMs = timeValue(next.capturedAtISO);
  if (nextMs - previousMs >= RACE_STATE_SNAPSHOT_DEDUPE_MS) return false;

  return (
    previous.primaryCall === next.primaryCall &&
    previous.approachingMark === next.approachingMark &&
    previous.course.safeLegIndex === next.course.safeLegIndex &&
    previous.confidence.overall === next.confidence.overall &&
    previous.legality?.overall === next.legality?.overall &&
    previous.progress?.call === next.progress?.call
  );
}

function shouldSkipTacticalBoardSnapshot(
  previous: TacticalBoardSnapshot | null | undefined,
  next: TacticalBoardSnapshot,
) {
  if (!previous) return false;

  const previousMs = timeValue(previous.capturedAtISO);
  const nextMs = timeValue(next.capturedAtISO);
  if (nextMs - previousMs >= TACTICAL_BOARD_SNAPSHOT_DEDUPE_MS) return false;

  return (
    previous.liveContext.legMode === next.liveContext.legMode &&
    previous.liveContext.activeLegLabel === next.liveContext.activeLegLabel &&
    previous.liveContext.currentWindSource === next.liveContext.currentWindSource &&
    previous.liveContext.usesActiveLegBearing === next.liveContext.usesActiveLegBearing &&
    previous.liveContext.windSourceLabel === next.liveContext.windSourceLabel &&
    previous.liveContext.windFreshness === next.liveContext.windFreshness &&
    previous.liveContext.overallConfidence === next.liveContext.overallConfidence &&
    previous.board.readiness.status === next.board.readiness.status &&
    previous.board.shift.direction === next.board.shift.direction &&
    previous.board.shift.deltaDeg === next.board.shift.deltaDeg &&
    previous.board.upwind.favoredTack === next.board.upwind.favoredTack &&
    previous.board.downwind.dominantReach === next.board.downwind.dominantReach &&
    previous.board.startLine.favoredEnd === next.board.startLine.favoredEnd
  );
}

export function subscribeRaceSessionStore(listener: RaceSessionStoreListener) {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Shared race session recovery failed.";
}

export async function recoverRaceSessionsFromRepository() {
  if (typeof window === "undefined") {
    const snapshot = getCachedSnapshot();
    return {
      snapshot,
      source: hasSnapshotData(snapshot) ? ("local" as const) : ("empty" as const),
      fallbackUsed: false,
      error: null,
    };
  }
  if (repositoryHydrationPromise) return repositoryHydrationPromise;

  repositoryHydrationPromise = (async () => {
    const localSnapshot = getCachedSnapshot();
    const localHasData = hasSnapshotData(localSnapshot);

    try {
      const remoteSnapshot = await fetchRepositorySnapshot();
      const remoteHasData = hasSnapshotData(remoteSnapshot);

      if (remoteHasData) {
        const mergedSnapshot = localHasData
          ? mergeSnapshots(localSnapshot, remoteSnapshot)
          : remoteSnapshot;
        const appliedSnapshot = applySnapshot(mergedSnapshot);

        if (localHasData) {
          const remoteSignature = JSON.stringify(remoteSnapshot);
          const mergedSignature = JSON.stringify(mergedSnapshot);

          if (remoteSignature !== mergedSignature) {
            queueRepositoryPersist(appliedSnapshot);
          }
        }

        return {
          snapshot: appliedSnapshot,
          source: localHasData ? ("merged" as const) : ("shared" as const),
          fallbackUsed: false,
          error: null,
        };
      }

      if (localHasData) {
        const appliedSnapshot = applySnapshot(localSnapshot);
        queueRepositoryPersist(appliedSnapshot);
        return {
          snapshot: appliedSnapshot,
          source: "local" as const,
          fallbackUsed: true,
          error: null,
        };
      }

      const appliedSnapshot = applySnapshot(remoteSnapshot);
      return {
        snapshot: appliedSnapshot,
        source: "empty" as const,
        fallbackUsed: false,
        error: null,
      };
    } catch (error) {
      const appliedSnapshot = applySnapshot(localSnapshot);
      return {
        snapshot: appliedSnapshot,
        source: localHasData ? ("local" as const) : ("empty" as const),
        fallbackUsed: true,
        error: errorMessage(error),
      };
    } finally {
      repositoryHydrationPromise = null;
    }
  })();

  return repositoryHydrationPromise;
}

export async function syncRaceSessionsFromRepository() {
  const recovery = await recoverRaceSessionsFromRepository();
  return recovery.snapshot;
}

export function getRaceSessions(): RaceSession[] {
  return getCachedSnapshot().sessions;
}

export function saveRaceSessions(sessions: RaceSession[]) {
  const activeSessionId = getCachedSnapshot().activeSessionId;
  replaceSessions(sessions, activeSessionId);
  queueRepositoryPersist(getCachedSnapshot());
}

export function getRaceSession(id: string): RaceSession | null {
  return getRaceSessions().find((session) => session.id === id) ?? null;
}

export function getActiveRaceSession(): RaceSession | null {
  const { activeSessionId, sessions } = getCachedSnapshot();
  return activeSessionId
    ? sessions.find((session) => session.id === activeSessionId) ?? null
    : null;
}

export function getMostRecentRaceSession(): RaceSession | null {
  return (
    getRaceSessions()
      .slice()
      .sort((a, b) => b.startedAtISO.localeCompare(a.startedAtISO))[0] ?? null
  );
}

export function upsertRaceSession(session: RaceSession) {
  return updateSessionInStore(session);
}

function sortTrack(points: GpsTrackPoint[]) {
  return points
    .slice()
    .sort((left, right) => left.at.localeCompare(right.at));
}

function sortWeatherSamples(samples: RaceWeatherSample[]) {
  return uniqueByKey(
    samples,
    (sample) => sample.atISO,
    (left, right) => left.atISO.localeCompare(right.atISO),
  );
}

function orderTimeWindow(startISO: string, endISO: string) {
  return startISO.localeCompare(endISO) <= 0
    ? { startISO, endISO }
    : { startISO: endISO, endISO: startISO };
}

function isoWithinWindow(value: string, startISO: string, endISO: string) {
  return value.localeCompare(startISO) >= 0 && value.localeCompare(endISO) <= 0;
}

function shouldKeepIso(
  value: string,
  startISO: string,
  endISO: string,
  mode: RaceSessionTimeEditMode,
) {
  const isWithin = isoWithinWindow(value, startISO, endISO);
  return mode === "keep_window" ? isWithin : !isWithin;
}

function buildImportedSessionNotes(input: ImportRaceSessionInput) {
  const notes = [
    `Imported from ${input.fileName}.`,
    "COG and SOG were derived from the GPX trackpoint timeline.",
  ];

  if (input.courseId) {
    notes.push(`Attached course: ${input.courseId}.`);
  }

  if ((input.weatherSamples?.length ?? 0) > 0) {
    notes.push(
      `Attached ${input.weatherSamples?.length ?? 0} historical weather sample${
        input.weatherSamples?.length === 1 ? "" : "s"
      } from official sources when available.`,
    );
  }

  if (input.warnings?.length) {
    notes.push(`Import notes: ${input.warnings.join(" ")}`);
  }

  return notes.join(" ");
}

export function importRaceSession(input: ImportRaceSessionInput) {
  const now = nowISO();
  const gpsTrack = sortTrack(input.gpsTrack);
  const weatherSamples = sortWeatherSamples(input.weatherSamples ?? []);
  const courseSummary = input.courseId ? getCourseData(input.courseId) : null;
  const tackCalibrations = detectAutomaticTackCalibrations(gpsTrack);
  const tackRecords = detectAutomaticTackRecords(gpsTrack);
  const session: RaceSession = {
    id: safeUUID(),
    name: input.name?.trim() || "Imported GPX Session",
    eventId: courseSummary?.eventId,
    courseId: input.courseId,
    openingBias: null,
    startedAtISO: input.startedAtISO,
    endedAtISO: input.endedAtISO,
    status: "ended",
    createdFrom: "imported",
    crewNotes: buildImportedSessionNotes(input),
    updatedAtISO: now,
    gpsTrack,
    weatherSamples,
    decisions: [],
    raceStateSnapshots: [],
    tacticalBoardSnapshots: [],
    trimLogs: [],
    tackCalibrations,
    tackRecords,
  };

  const snapshot = getCachedSnapshot();
  commitSnapshot({
    ...snapshot,
    sessions: mergeRaceSessions(snapshot.sessions, [session]),
    activeSessionId: snapshot.activeSessionId,
    updatedAtISO: now,
  });

  return getRaceSession(session.id) ?? session;
}

export function startRaceSession(input: {
  name?: string;
  courseId?: string;
  eventId?: string;
  openingBias?: OpeningBiasRecord | null;
}) {
  const session: RaceSession = {
    id: safeUUID(),
    name: input.name ?? `Race ${new Date().toLocaleDateString()}`,
    eventId: input.eventId,
    courseId: input.courseId,
    openingBias: input.openingBias ?? null,
    startedAtISO: nowISO(),
    status: "active",
    createdFrom: "live",
    updatedAtISO: nowISO(),
    gpsTrack: [],
    weatherSamples: [],
    decisions: [],
    raceStateSnapshots: [],
    tacticalBoardSnapshots: [],
    trimLogs: [],
    tackCalibrations: [],
    tackRecords: [],
  };

  const snapshot = getCachedSnapshot();
  commitSnapshot({
    ...snapshot,
    sessions: mergeRaceSessions(snapshot.sessions, [session]),
    activeSessionId: session.id,
    updatedAtISO: session.updatedAtISO ?? nowISO(),
  });
  return session;
}

export function updateRaceSessionOpeningBias(
  id: string,
  openingBias: OpeningBiasRecord | null,
) {
  const session = getRaceSession(id);
  if (!session) return null;

  return updateSessionInStore({
    ...session,
    openingBias,
  });
}

export function endRaceSession(id: string) {
  const session = getRaceSession(id);
  if (!session) return null;

  const updated: RaceSession = {
    ...session,
    status: "ended",
    endedAtISO: session.endedAtISO ?? nowISO(),
  };

  const snapshot = getCachedSnapshot();
  commitSnapshot({
    ...snapshot,
    sessions: mergeRaceSessions(snapshot.sessions, [updated]),
    activeSessionId: snapshot.activeSessionId === id ? null : snapshot.activeSessionId,
    updatedAtISO: nowISO(),
  });

  return normalizeRaceSession({
    ...updated,
    updatedAtISO: nowISO(),
  });
}

export function deleteRaceSession(id: string) {
  const snapshot = getCachedSnapshot();
  commitSnapshot({
    ...snapshot,
    sessions: snapshot.sessions.filter((session) => session.id !== id),
    activeSessionId: snapshot.activeSessionId === id ? null : snapshot.activeSessionId,
    updatedAtISO: nowISO(),
  });
}

export function editRaceSessionTimeRange(
  id: string,
  params: {
    startISO: string;
    endISO: string;
    mode: RaceSessionTimeEditMode;
  },
) {
  const session = getRaceSession(id);
  if (!session) {
    throw new Error("Race session not found.");
  }

  const { startISO, endISO } = orderTimeWindow(params.startISO, params.endISO);
  const gpsTrack = sortTrack(
    session.gpsTrack.filter((point) => shouldKeepIso(point.at, startISO, endISO, params.mode)),
  );

  if (gpsTrack.length < 2) {
    throw new Error("The edited session would have fewer than 2 GPS points. Widen the selection.");
  }

  const updated: RaceSession = {
    ...session,
    startedAtISO: gpsTrack[0].at,
    endedAtISO: session.status === "ended" ? gpsTrack.at(-1)?.at ?? session.endedAtISO : session.endedAtISO,
    gpsTrack,
    weatherSamples: sortWeatherSamples(
      session.weatherSamples.filter((sample) =>
        shouldKeepIso(sample.atISO, startISO, endISO, params.mode),
      ),
    ),
    decisions: session.decisions.filter((decision) =>
      shouldKeepIso(decision.atISO, startISO, endISO, params.mode),
    ),
    raceStateSnapshots: trimRaceStateSnapshots(
      session.raceStateSnapshots.filter((snapshot) =>
        shouldKeepIso(snapshot.capturedAtISO, startISO, endISO, params.mode),
      ),
    ),
    tacticalBoardSnapshots: trimTacticalBoardSnapshots(
      session.tacticalBoardSnapshots.filter((snapshot) =>
        shouldKeepIso(snapshot.capturedAtISO, startISO, endISO, params.mode),
      ),
    ),
    trimLogs: session.trimLogs.filter((log) =>
      shouldKeepIso(log.createdAtISO, startISO, endISO, params.mode),
    ),
    tackCalibrations: session.tackCalibrations.filter((calibration) =>
      calibration.source === "manual"
        ? true
        : shouldKeepIso(calibration.at, startISO, endISO, params.mode),
    ),
    tackRecords: session.tackRecords.filter((record) =>
      shouldKeepIso(record.atISO, startISO, endISO, params.mode),
    ),
  };

  upsertRaceSession(updated);
  return getRaceSession(id) ?? updated;
}

export function appendRaceGpsSamples(
  id: string,
  points: GpsTrackPoint[],
  context: { windFromDeg?: number | null } = {},
) {
  const session = getRaceSession(id);
  if (!session || points.length === 0) return session;

  const byTime = new Map(session.gpsTrack.map((point) => [point.at, point]));
  for (const point of points) byTime.set(point.at, point);

  const gpsTrack = Array.from(byTime.values()).sort((a, b) => a.at.localeCompare(b.at));
  const detectedTacks =
    session.status === "active" ? detectAutomaticTackCalibrations(gpsTrack) : [];
  const detectedTackRecords =
    session.status === "active" ? detectAutomaticTackRecords(gpsTrack, context) : [];
  const tackCalibrations = mergeTackCalibrations(
    session.tackCalibrations,
    detectedTacks,
  );
  const tackRecords = mergeTackRecords(session.tackRecords, detectedTackRecords);

  if (detectedTacks.length > 0) {
    saveTackCalibrations(
      mergeTackCalibrations(readTackCalibrations(), detectedTacks),
    );
  }

  const updated: RaceSession = {
    ...session,
    gpsTrack,
    tackCalibrations,
    tackRecords,
  };
  upsertRaceSession(updated);
  return updated;
}

export function appendRaceTackRecords(id: string, records: TackRecord[]) {
  const session = getRaceSession(id);
  if (!session || records.length === 0) return session;

  const updated: RaceSession = {
    ...session,
    tackRecords: mergeTackRecords(session.tackRecords, records),
  };
  upsertRaceSession(updated);
  return updated;
}

export function getRaceSessionStandardTackAngle(session: RaceSession | null) {
  if (!session) return null;
  return getKnownStandardTackAngle(session.tackRecords, session.tackCalibrations);
}

export function appendRaceWeatherSample(id: string, sample: RaceWeatherSample) {
  const session = getRaceSession(id);
  if (!session) return session;

  const exists = session.weatherSamples.some((candidate) => candidate.atISO === sample.atISO);
  if (exists) return session;

  const updated: RaceSession = {
    ...session,
    weatherSamples: [...session.weatherSamples, sample].slice(-720),
  };
  upsertRaceSession(updated);
  return updated;
}

export function appendRaceDecision(
  id: string,
  decision: Omit<RaceDecisionRecord, "id" | "atISO"> & { id?: string; atISO?: string },
) {
  const session = getRaceSession(id);
  if (!session) return session;

  const record: RaceDecisionRecord = {
    ...decision,
    id: decision.id ?? safeUUID(),
    atISO: decision.atISO ?? nowISO(),
  };

  if (session.decisions.some((candidate) => candidate.id === record.id)) return session;

  const updated: RaceSession = {
    ...session,
    decisions: [record, ...session.decisions],
  };
  upsertRaceSession(updated);
  return updated;
}

export function updateRaceDecision(
  sessionId: string,
  decisionId: string,
  patch: Partial<RaceDecisionRecord>,
) {
  const session = getRaceSession(sessionId);
  if (!session) return session;

  const updated: RaceSession = {
    ...session,
    decisions: session.decisions.map((decision) =>
      decision.id === decisionId ? { ...decision, ...patch } : decision,
    ),
  };
  upsertRaceSession(updated);
  return updated;
}

export function addManualRaceNote(sessionId: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return null;

  return appendRaceDecision(sessionId, {
    kind: "manual",
    label: "Manual note",
    recommendation: trimmed,
  });
}

export function appendRaceStateSnapshot(
  sessionId: string,
  snapshotInput: RaceStateSnapshotCaptureInput,
) {
  const session = getRaceSession(sessionId);
  if (!session) return session;

  const snapshot = buildRaceStateSnapshot(snapshotInput);
  const previous = session.raceStateSnapshots.at(-1);
  if (shouldSkipRaceStateSnapshot(previous, snapshot)) {
    return session;
  }

  const updated: RaceSession = {
    ...session,
    raceStateSnapshots: trimRaceStateSnapshots([
      ...session.raceStateSnapshots,
      snapshot,
    ]),
  };
  upsertRaceSession(updated);
  return updated;
}

export function appendTacticalBoardSnapshot(
  sessionId: string,
  snapshotInput: TacticalBoardSnapshotCaptureInput,
) {
  const session = getRaceSession(sessionId);
  if (!session) return session;

  const snapshot = buildTacticalBoardSnapshot(snapshotInput);
  const previous = session.tacticalBoardSnapshots.at(-1);
  if (shouldSkipTacticalBoardSnapshot(previous, snapshot)) {
    return session;
  }

  const updated: RaceSession = {
    ...session,
    tacticalBoardSnapshots: trimTacticalBoardSnapshots([
      ...session.tacticalBoardSnapshots,
      snapshot,
    ]),
  };
  upsertRaceSession(updated);
  return updated;
}

export function attachTrimLogsToSession(id: string, logs: LaylineLog[]) {
  const session = getRaceSession(id);
  if (!session) return session;

  const byId = new Map(session.trimLogs.map((log) => [log.id, log]));
  for (const log of logs) byId.set(log.id, log);

  const updated: RaceSession = {
    ...session,
    trimLogs: Array.from(byId.values()).sort((a, b) =>
      b.createdAtISO.localeCompare(a.createdAtISO),
    ),
  };
  upsertRaceSession(updated);
  return updated;
}

export function updateSessionTrimLog(
  sessionId: string,
  logId: string,
  patch: Partial<LaylineLog>,
) {
  const session = getRaceSession(sessionId);
  if (!session || !session.trimLogs.some((log) => log.id === logId)) return session;

  const updated: RaceSession = {
    ...session,
    trimLogs: session.trimLogs
      .map((log) => (log.id === logId ? { ...log, ...patch } : log))
      .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)),
  };
  upsertRaceSession(updated);
  return updated;
}

export function deleteSessionTrimLog(sessionId: string, logId: string) {
  const session = getRaceSession(sessionId);
  if (!session) return session;

  const updated: RaceSession = {
    ...session,
    trimLogs: session.trimLogs.filter((log) => log.id !== logId),
  };
  upsertRaceSession(updated);
  return updated;
}

export function clearSessionTrimLogs(sessionId: string) {
  const session = getRaceSession(sessionId);
  if (!session) return session;

  const updated: RaceSession = {
    ...session,
    trimLogs: [],
  };
  upsertRaceSession(updated);
  return updated;
}

export function attachTackCalibrationsToSession(
  id: string,
  calibrations: TackCalibrationResult[],
) {
  const session = getRaceSession(id);
  if (!session) return session;

  const byTime = new Map(session.tackCalibrations.map((item) => [item.at, item]));
  for (const calibration of calibrations) byTime.set(calibration.at, calibration);

  const updated: RaceSession = {
    ...session,
    tackCalibrations: Array.from(byTime.values()).sort((a, b) =>
      b.at.localeCompare(a.at),
    ),
  };
  upsertRaceSession(updated);
  return updated;
}

function isSameLocalDay(iso: string, date = new Date()) {
  const parsed = new Date(iso);
  return (
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth() &&
    parsed.getDate() === date.getDate()
  );
}

export async function recoverTodayRaceSession(): Promise<RecoverTodayRaceSessionResult> {
  const recovery = await recoverRaceSessionsFromRepository();
  const today = new Date();
  const existing =
    recovery.snapshot.sessions.find(
      (session) => session.status === "active" && isSameLocalDay(session.startedAtISO, today),
    ) ??
    recovery.snapshot.sessions.find((session) =>
      isSameLocalDay(session.startedAtISO, today),
    ) ??
    recovery.snapshot.sessions.find(
      (session) =>
        session.createdFrom === "recovered" && isSameLocalDay(session.startedAtISO, today),
    );
  const storedTrack = readJson<GpsTrackPoint[]>(GPS_TRACK_KEY, []).filter((point) =>
    isSameLocalDay(point.at, today),
  );
  const todayLogs = getLogs().filter((log) => isSameLocalDay(log.createdAtISO, today));
  const todayCalibrations = readTackCalibrations().filter((calibration) =>
    isSameLocalDay(calibration.at, today),
  );
  const tracker = readJson<{ courseId?: string }>(TRACKER_KEY, {});

  const session: RaceSession =
    existing ?? {
      id: safeUUID(),
      name: `Recovered race ${today.toLocaleDateString()}`,
      courseId: tracker.courseId,
      startedAtISO: storedTrack[0]?.at ?? todayLogs.at(-1)?.createdAtISO ?? nowISO(),
      status: "ended",
      endedAtISO: storedTrack.at(-1)?.at ?? todayLogs[0]?.updatedAtISO ?? nowISO(),
      createdFrom: "recovered",
      gpsTrack: [],
      weatherSamples: [],
      decisions: [],
      raceStateSnapshots: [],
      tacticalBoardSnapshots: [],
      trimLogs: [],
      tackCalibrations: [],
      tackRecords: [],
    };

  upsertRaceSession(session);
  appendRaceGpsSamples(session.id, storedTrack);
  attachTrimLogsToSession(session.id, todayLogs);
  attachTackCalibrationsToSession(session.id, todayCalibrations);

  const refreshed = getRaceSession(session.id);
  return {
    session: refreshed ?? session,
    recovery,
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function speedKt(point: GpsTrackPoint) {
  return point.sogMps == null ? null : point.sogMps * 1.943844;
}

function gpsWindow(track: GpsTrackPoint[], atISO: string, beforeSec: number, afterSec: number) {
  const atMs = new Date(atISO).getTime();
  if (!Number.isFinite(atMs)) return [];

  return track.filter((point) => {
    const pointMs = new Date(point.at).getTime();
    return pointMs >= atMs - beforeSec * 1000 && pointMs <= atMs + afterSec * 1000;
  });
}

function averageSpeed(points: GpsTrackPoint[]) {
  return average(
    points
      .map(speedKt)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );
}

function distanceNmBetweenPoints(start: GpsTrackPoint, end: GpsTrackPoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusMeters = 6_371_000;
  const phi1 = toRad(start.lat);
  const phi2 = toRad(end.lat);
  const deltaPhi = toRad(end.lat - start.lat);
  const deltaLambda = toRad(end.lon - start.lon);
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (radiusMeters * c) / 1852;
}

function segmentDistanceNm(points: GpsTrackPoint[]) {
  let distanceNm = 0;

  for (let index = 1; index < points.length; index += 1) {
    distanceNm += distanceNmBetweenPoints(points[index - 1], points[index]);
  }

  return distanceNm;
}

function headingDeltaDeg(left: number, right: number) {
  return Math.abs(((right - left + 540) % 360) - 180);
}

function segmentHeadingChurnDeg(points: GpsTrackPoint[]) {
  const headings = points
    .map((point) => point.cogDeg)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (headings.length < 2) return null;

  return average(
    headings
      .slice(1)
      .map((heading, index) => headingDeltaDeg(headings[index], heading)),
  );
}

function segmentLowSpeedSharePct(points: GpsTrackPoint[], slowThresholdKt: number) {
  const speeds = points
    .map(speedKt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!speeds.length) return null;

  const slowCount = speeds.filter((speed) => speed < slowThresholdKt).length;
  return (slowCount / speeds.length) * 100;
}

function segmentPauseCount(points: GpsTrackPoint[], pauseThresholdKt = 1.2) {
  let pauseCount = 0;
  let inPause = false;

  for (const point of points) {
    const speed = speedKt(point);
    const paused = typeof speed === "number" && speed < pauseThresholdKt;

    if (paused && !inPause) {
      pauseCount += 1;
      inPause = true;
    } else if (!paused) {
      inPause = false;
    }
  }

  return pauseCount;
}

function tackRecordsInWindow(records: TackRecord[], startISO: string, endISO: string) {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return [];

  return records.filter((record) => {
    const recordMs = new Date(record.atISO).getTime();
    return Number.isFinite(recordMs) && recordMs >= startMs && recordMs <= endMs;
  });
}

type TrackSliceAnalysis = {
  averageSogKt: number | null;
  sailedDistanceNm: number | null;
  straightLineDistanceNm: number | null;
  extraDistancePct: number | null;
  lowSpeedSharePct: number | null;
  headingChurnDeg: number | null;
  pauseCount: number;
  likelyManeuverCount: number;
};

function analyzeTrackSlice(
  points: GpsTrackPoint[],
  tackRecords: TackRecord[],
  options: { raceAverageSogKt?: number | null; startISO?: string; endISO?: string } = {},
): TrackSliceAnalysis | null {
  if (points.length < 2) return null;

  const averageSogKt = averageSpeed(points);
  const sailedDistanceNm = segmentDistanceNm(points);
  const straightLineDistanceNm =
    points.length >= 2 ? distanceNmBetweenPoints(points[0], points[points.length - 1]) : null;
  const extraDistancePct =
    straightLineDistanceNm == null || straightLineDistanceNm < 0.02
      ? null
      : ((sailedDistanceNm / straightLineDistanceNm) - 1) * 100;
  const slowThresholdKt = Math.max(2, (options.raceAverageSogKt ?? averageSogKt ?? 4) * 0.75);
  const lowSpeedSharePct = segmentLowSpeedSharePct(points, slowThresholdKt);
  const headingChurnDeg = segmentHeadingChurnDeg(points);
  const pauseCount = segmentPauseCount(points);
  const likelyManeuverCount =
    options.startISO && options.endISO
      ? tackRecordsInWindow(tackRecords, options.startISO, options.endISO).length
      : 0;

  return {
    averageSogKt,
    sailedDistanceNm,
    straightLineDistanceNm,
    extraDistancePct,
    lowSpeedSharePct,
    headingChurnDeg,
    pauseCount,
    likelyManeuverCount,
  };
}

function trackSliceFeedback(
  analysis: TrackSliceAnalysis,
  outcome: "better" | "same" | "worse",
) {
  const feedback: string[] = [];

  if (outcome === "worse") {
    if (analysis.extraDistancePct != null && analysis.extraDistancePct >= 18) {
      feedback.push(
        `The path sailed about ${analysis.extraDistancePct.toFixed(0)}% more distance than the straight-line progress, so the loss came from extra distance as much as pace.`,
      );
    }

    if (analysis.lowSpeedSharePct != null && analysis.lowSpeedSharePct >= 25) {
      feedback.push(
        `A large share of the segment stayed slow, which points to a pace or acceleration problem before it became a routing problem.`,
      );
    }

    if (analysis.headingChurnDeg != null && analysis.headingChurnDeg >= 12) {
      feedback.push(
        `COG changed a lot through the segment, which suggests corrections, unstable lane holding, or not committing to one mode early enough.`,
      );
    }

    if (analysis.likelyManeuverCount >= 2) {
      feedback.push(
        `There were ${analysis.likelyManeuverCount} likely maneuvers in this window, so maneuver cost may have been a bigger issue than pure boatspeed.`,
      );
    }

    if (analysis.pauseCount >= 1 && (analysis.lowSpeedSharePct ?? 0) >= 20) {
      feedback.push(
        `The boat spent part of the segment near stop-speed, which usually means the mode broke down before the next call stabilized.`,
      );
    }
  } else if (outcome === "better") {
    if (
      analysis.extraDistancePct != null &&
      analysis.extraDistancePct <= 10 &&
      analysis.headingChurnDeg != null &&
      analysis.headingChurnDeg <= 8
    ) {
      feedback.push(
        "The track stayed direct and calm, so this gain looks like committed lane management instead of a lucky speed spike.",
      );
    }

    if (analysis.lowSpeedSharePct != null && analysis.lowSpeedSharePct <= 12) {
      feedback.push(
        "Speed stayed alive through most of the segment, which suggests the boat was kept in a sustainable mode rather than repeatedly rebuilding pace.",
      );
    }

    if (analysis.likelyManeuverCount === 0) {
      feedback.push(
        "This section avoided obvious maneuver cost, so the advantage likely came from holding a cleaner lane for longer.",
      );
    }
  } else {
    if (analysis.extraDistancePct != null && analysis.extraDistancePct >= 20) {
      feedback.push(
        "Speed was close to average, but the path itself still looked expensive. Review whether the boat sailed extra distance without a clear gain.",
      );
    }

    if (analysis.headingChurnDeg != null && analysis.headingChurnDeg >= 12) {
      feedback.push(
        "The segment was pace-neutral but not especially clean, so the next gain may come from fewer corrections instead of a different side choice.",
      );
    }
  }

  if (feedback.length === 0) {
    if (outcome === "worse") {
      feedback.push(
        "This segment was slower than the race average, but the track does not isolate one single failure. Review pressure, lane quality, and trim together.",
      );
    } else if (outcome === "better") {
      feedback.push(
        "This segment beat the race average with a cleaner overall shape. Treat it as a repeatable mode worth copying.",
      );
    } else {
      feedback.push(
        "This segment was close to average. Look for clearer setup differences before changing your playbook around it.",
      );
    }
  }

  return feedback;
}

function primarySegmentRecommendation(
  analysis: TrackSliceAnalysis,
  outcome: "better" | "same" | "worse",
) {
  if (outcome === "better") {
    if (analysis.extraDistancePct != null && analysis.extraDistancePct <= 10) {
      return "This section won by staying direct. Repeat the calmer path and resist rescue turns once the lane is good enough.";
    }

    return "This section beat the race average. Repeat the mode, lane, and trim setup that produced it.";
  }

  if (outcome === "worse") {
    if (analysis.lowSpeedSharePct != null && analysis.lowSpeedSharePct >= 25) {
      return "This loss looks like a slow-mode problem first. Rebuild pace before spending more tactical capital on side choice.";
    }

    if (analysis.extraDistancePct != null && analysis.extraDistancePct >= 18) {
      return "This loss looks path-driven. Commit earlier and avoid paying extra distance unless the gain is obvious.";
    }

    if (analysis.likelyManeuverCount >= 2) {
      return "Treat each extra maneuver as expensive here. Hold the lane longer once pressure and trim are acceptable.";
    }

    return "This section trailed the race average. Review course choice, lane quality, trim, and whether the boat stayed in pressure.";
  }

  return "This section was close to the race average. Look for cleaner evidence before changing the playbook.";
}

function autoOutcomeForDecision(
  decision: RaceDecisionRecord,
  track: GpsTrackPoint[],
  tackRecords: TackRecord[],
): RaceDecisionRecord {
  if (decision.outcome) return decision;

  const beforeWindow = gpsWindow(track, decision.atISO, 90, 0);
  const afterWindow = gpsWindow(track, decision.atISO, 0, 120);
  const before = averageSpeed(beforeWindow);
  const after = averageSpeed(afterWindow);
  if (before == null || after == null || beforeWindow.length < 2 || afterWindow.length < 2) {
    return {
      ...decision,
      outcome: "same",
      coachingNote: decision.coachingNote ?? "Auto-rated neutral because GPS speed context was limited.",
    };
  }

  const delta = after - before;
  const outcome = delta >= 0.25 ? "better" : delta <= -0.25 ? "worse" : "same";
  const raceAverageSogKt = averageSpeed(track);
  const beforeAnalysis = analyzeTrackSlice(beforeWindow, tackRecords, {
    raceAverageSogKt,
    startISO: beforeWindow[0]?.at,
    endISO: beforeWindow[beforeWindow.length - 1]?.at,
  });
  const afterAnalysis = analyzeTrackSlice(afterWindow, tackRecords, {
    raceAverageSogKt,
    startISO: afterWindow[0]?.at,
    endISO: afterWindow[afterWindow.length - 1]?.at,
  });
  const analysisFeedback =
    afterAnalysis != null ? trackSliceFeedback(afterAnalysis, outcome) : [];
  const directionSummary =
    afterAnalysis?.extraDistancePct != null &&
    beforeAnalysis?.extraDistancePct != null &&
    afterAnalysis.extraDistancePct + 4 < beforeAnalysis.extraDistancePct
      ? "The path also became more direct after the call."
      : afterAnalysis?.headingChurnDeg != null &&
          beforeAnalysis?.headingChurnDeg != null &&
          afterAnalysis.headingChurnDeg + 3 < beforeAnalysis.headingChurnDeg
        ? "The track looked calmer after the call, not just faster."
        : "";

  return {
    ...decision,
    outcome,
    inputs: {
      ...decision.inputs,
      analysisFeedback,
      autoWindowStartAtISO: afterWindow[0]?.at,
      autoWindowEndAtISO: afterWindow[afterWindow.length - 1]?.at,
      afterAverageSogKt: afterAnalysis?.averageSogKt == null ? null : Number(afterAnalysis.averageSogKt.toFixed(2)),
      afterExtraDistancePct:
        afterAnalysis?.extraDistancePct == null ? null : Number(afterAnalysis.extraDistancePct.toFixed(1)),
      afterHeadingChurnDeg:
        afterAnalysis?.headingChurnDeg == null ? null : Number(afterAnalysis.headingChurnDeg.toFixed(1)),
    },
    coachingNote:
      decision.coachingNote ??
      [
        `Auto-rated from GPS: speed changed ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} kt after the call.`,
        directionSummary,
      ]
        .filter(Boolean)
        .join(" "),
  };
}

function buildAutoTrackDecisions(session: RaceSession) {
  const sortedTrack = session.gpsTrack
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  const speeds = sortedTrack
    .map(speedKt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const dayAverage = average(speeds);

  if (sortedTrack.length < 6 || dayAverage == null) return [];

  const segments: RaceDecisionRecord[] = [];
  const segmentSize = Math.max(6, Math.round(sortedTrack.length / 8));

  for (let index = 0; index < sortedTrack.length; index += segmentSize) {
    const segment = sortedTrack.slice(index, index + segmentSize);
    if (segment.length < 4) continue;

    const segmentAverage = averageSpeed(segment);
    if (segmentAverage == null) continue;

    const delta = segmentAverage - dayAverage;
    const outcome = delta >= 0.25 ? "better" : delta <= -0.25 ? "worse" : "same";
    const segmentStartAtISO = segment[0].at;
    const segmentEndAtISO = segment[segment.length - 1].at;
    const analysis = analyzeTrackSlice(segment, session.tackRecords, {
      raceAverageSogKt: dayAverage,
      startISO: segmentStartAtISO,
      endISO: segmentEndAtISO,
    });
    if (!analysis) continue;
    const label =
      outcome === "better"
        ? "Auto: strong pace segment"
        : outcome === "worse"
          ? "Auto: slow pace segment"
          : "Auto: neutral pace segment";

    segments.push({
      id: `auto-${session.id}-${index}`,
      atISO: segmentStartAtISO,
      kind: "route",
      label,
      recommendation: primarySegmentRecommendation(analysis, outcome),
      outcome,
      coachingNote: `Auto-rated from GPS: segment avg ${segmentAverage.toFixed(1)} kt vs race avg ${dayAverage.toFixed(1)} kt.`,
      inputs: {
        autoGenerated: true,
        segmentStartAtISO,
        segmentEndAtISO,
        segmentStartIndex: index,
        segmentEndIndex: index + segment.length - 1,
        segmentPointCount: segment.length,
        segmentAverageSogKt: Number(segmentAverage.toFixed(2)),
        raceAverageSogKt: Number(dayAverage.toFixed(2)),
        segmentDeltaSogKt: Number(delta.toFixed(2)),
        segmentSailedDistanceNm:
          analysis.sailedDistanceNm == null ? null : Number(analysis.sailedDistanceNm.toFixed(2)),
        segmentStraightLineDistanceNm:
          analysis.straightLineDistanceNm == null
            ? null
            : Number(analysis.straightLineDistanceNm.toFixed(2)),
        segmentExtraDistancePct:
          analysis.extraDistancePct == null ? null : Number(analysis.extraDistancePct.toFixed(1)),
        segmentLowSpeedSharePct:
          analysis.lowSpeedSharePct == null ? null : Number(analysis.lowSpeedSharePct.toFixed(1)),
        segmentHeadingChurnDeg:
          analysis.headingChurnDeg == null ? null : Number(analysis.headingChurnDeg.toFixed(1)),
        segmentLikelyManeuverCount: analysis.likelyManeuverCount,
        segmentPauseCount: analysis.pauseCount,
        analysisFeedback: trackSliceFeedback(analysis, outcome),
      },
    });
  }

  return segments;
}

function angleDiffDeg(a?: number, b?: number) {
  if (typeof a !== "number" || typeof b !== "number") return null;
  return Math.abs(((a - b + 540) % 360) - 180);
}

export function buildRaceSessionReview(session: RaceSession): RaceSessionReview {
  const started = new Date(session.startedAtISO).getTime();
  const ended = new Date(session.endedAtISO ?? new Date().toISOString()).getTime();
  const durationMin =
    Number.isFinite(started) && Number.isFinite(ended)
      ? Math.max(0, (ended - started) / 60000)
      : null;
  const sogValues = session.gpsTrack
    .map((point) => (point.sogMps == null ? null : point.sogMps * 1.943844))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const latestWeather = session.weatherSamples.at(-1);
  const topBottomWindSpreadKt =
    latestWeather?.topWindAvgKt == null || latestWeather.bottomWindAvgKt == null
      ? null
      : Math.abs(latestWeather.topWindAvgKt - latestWeather.bottomWindAvgKt);
  const topBottomDirectionSpreadDeg = angleDiffDeg(
    latestWeather?.topWindDirectionDeg,
    latestWeather?.bottomWindDirectionDeg,
  );
  const buildingWeather = session.weatherSamples.some(
    (sample) => sample.trend === "building",
  );
  const scorableDecisions = session.decisions.filter(
    (decision) => decision.kind !== "manual",
  );
  const assessedDecisions =
    scorableDecisions.length > 0
      ? scorableDecisions.map((decision) =>
          autoOutcomeForDecision(decision, session.gpsTrack, session.tackRecords),
        )
      : buildAutoTrackDecisions(session);
  const incorrectChoices = assessedDecisions.filter(
    (decision) => decision.outcome === "worse" || decision.userAction === "ignored",
  );
  const goodDecisionCount = assessedDecisions.filter(
    (decision) => decision.outcome === "better" && decision.userAction !== "ignored",
  ).length;
  const badDecisionCount = assessedDecisions.filter(
    (decision) => decision.outcome === "worse" || decision.userAction === "ignored",
  ).length;
  const neutralDecisionCount = assessedDecisions.filter(
    (decision) => decision.outcome === "same" && decision.userAction !== "ignored",
  ).length;
  const unratedChoices = assessedDecisions.filter((decision) => !decision.outcome);
  const unratedDecisionCount = unratedChoices.length;
  const ratedDecisionCount = goodDecisionCount + neutralDecisionCount + badDecisionCount;
  const decisionScorePct =
    ratedDecisionCount === 0
      ? null
      : Math.round(
          ((goodDecisionCount + neutralDecisionCount * 0.5) / ratedDecisionCount) * 100,
        );
  const decisionGrade =
    decisionScorePct == null
      ? "needs_data"
      : decisionScorePct < 45
        ? "needs_work"
        : decisionScorePct < 65
          ? "mixed"
          : decisionScorePct < 82
            ? "solid"
            : "sharp";
  const coachingSignals: string[] = [];
  const workOnNext: string[] = [];

  if (incorrectChoices.length) {
    coachingSignals.push(
      `${incorrectChoices.length} choice${incorrectChoices.length === 1 ? "" : "s"} need review because they were ignored or marked worse.`,
    );
    const badRouteChoices = incorrectChoices.filter((decision) =>
      ["route", "tack", "mark", "start"].includes(decision.kind),
    );
    if (badRouteChoices.length) {
      workOnNext.push("Before changing course, confirm the live call, layline degrees, and next-tack heading out loud.");
    }
  }

  if (unratedChoices.length) {
    coachingSignals.push(
      `${unratedChoices.length} decision${unratedChoices.length === 1 ? "" : "s"} still need outcome ratings for future coaching.`,
    );
  }

  if (topBottomWindSpreadKt != null && topBottomWindSpreadKt >= 4) {
    coachingSignals.push(
      `Top and bottom course wind differed by ${topBottomWindSpreadKt.toFixed(1)} kt. Future calls should name the course section before picking a mode.`,
    );
    workOnNext.push("Call which wind source owns the decision: top, bottom, river, or nearest marker.");
  }

  if (topBottomDirectionSpreadDeg != null && topBottomDirectionSpreadDeg >= 15) {
    coachingSignals.push(
      `Top and bottom course wind direction differed by ${topBottomDirectionSpreadDeg.toFixed(0)} deg. Treat sensor choice as a tactical input, not background weather.`,
    );
    workOnNext.push("Practice comparing wind direction by course section before committing to a side.");
  }

  if (buildingWeather) {
    coachingSignals.push(
      "At least one sample showed building breeze. Review whether depower and sail changes happened before or after control became expensive.",
    );
    workOnNext.push("When breeze is building, make depower and lane-control calls earlier.");
  }

  if (session.trimLogs.some((log) => log.status !== "rated")) {
    coachingSignals.push(
      "Some trim logs are unrated. Rating them better/same/worse will make future recommendations more personal.",
    );
    workOnNext.push("Rate trim changes immediately after racing so the app can learn what actually helped.");
  }

  if (decisionScorePct != null && decisionScorePct < 65) {
    workOnNext.push("Reduce decision churn: make one clear call, hold long enough to measure SOG/VMG, then adjust.");
  }

  if (session.gpsTrack.length < 10) {
    workOnNext.push("Start the Race Recorder earlier so the after-action report has enough GPS data.");
  }

  if (!coachingSignals.length) {
    coachingSignals.push(
      "No obvious misses yet. Add outcomes to decisions and notes to turn this session into coaching data.",
    );
  }

  if (!workOnNext.length) {
    workOnNext.push("Keep recording and rating decisions; the next gains will come from cleaner comparisons.");
  }

  return {
    session,
    assessedDecisions,
    durationMin,
    gpsPointCount: session.gpsTrack.length,
    weatherSampleCount: session.weatherSamples.length,
    decisionCount: assessedDecisions.length,
    goodDecisionCount,
    neutralDecisionCount,
    badDecisionCount,
    unratedDecisionCount,
    decisionScorePct,
    decisionGrade,
    averageSogKt: average(sogValues),
    maxSogKt: sogValues.length ? Math.max(...sogValues) : null,
    topBottomWindSpreadKt,
    topBottomDirectionSpreadDeg,
    buildingWeather,
    incorrectChoices,
    coachingSignals,
    workOnNext,
  };
}

export function exportRaceSessionJson(session: RaceSession) {
  return JSON.stringify(session, null, 2);
}

export function downloadTextFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
