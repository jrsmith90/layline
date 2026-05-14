"use client";

import type { MarkProgressCall, MarkProgressResult } from "@/lib/race/courseTracker";
import type { RaceState, RaceStateSnapshot } from "@/lib/race/state/types";
import type { GpsTrackPoint } from "@/lib/useGpsCourse";
import type { LaylineLog } from "@/lib/logStore";
import { getLogs } from "@/lib/logStore";
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
  source: "live-weather";
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

export type RaceDecisionRecord = {
  id: string;
  atISO: string;
  kind: RaceDecisionKind;
  label: string;
  recommendation: string;
  inputs?: Record<string, unknown>;
  userAction?: "followed" | "ignored" | "modified";
  outcome?: "better" | "same" | "worse";
  coachingNote?: string;
};

export type RaceSession = {
  id: string;
  name: string;
  eventId?: string;
  courseId?: string;
  startedAtISO: string;
  endedAtISO?: string;
  status: RaceSessionStatus;
  createdFrom?: "live" | "recovered";
  crewNotes?: string;
  updatedAtISO?: string;
  gpsTrack: GpsTrackPoint[];
  weatherSamples: RaceWeatherSample[];
  decisions: RaceDecisionRecord[];
  raceStateSnapshots: RaceStateSnapshot[];
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
const RACE_STATE_SNAPSHOT_DEDUPE_MS = 5000;

export type RaceSessionRepositorySnapshot = {
  sessions: RaceSession[];
  activeSessionId: string | null;
  updatedAtISO: string;
};

type RaceSessionStoreListener = () => void;

let cachedSnapshot: RaceSessionRepositorySnapshot | null = null;
let repositoryHydrationPromise: Promise<RaceSessionRepositorySnapshot | null> | null = null;
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
    gpsTrack: Array.isArray(session.gpsTrack) ? session.gpsTrack : [],
    weatherSamples: Array.isArray(session.weatherSamples) ? session.weatherSamples : [],
    decisions: Array.isArray(session.decisions) ? session.decisions : [],
    raceStateSnapshots: Array.isArray(session.raceStateSnapshots)
      ? session.raceStateSnapshots
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
    progress: toRaceStateSnapshotProgress(input.progress),
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
    previous.progress?.call === next.progress?.call
  );
}

export function subscribeRaceSessionStore(listener: RaceSessionStoreListener) {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

export async function syncRaceSessionsFromRepository() {
  if (typeof window === "undefined") return getCachedSnapshot();
  if (repositoryHydrationPromise) return repositoryHydrationPromise;

  repositoryHydrationPromise = (async () => {
    const localSnapshot = getCachedSnapshot();

    try {
      const remoteSnapshot = await fetchRepositorySnapshot();
      const mergedSnapshot = mergeSnapshots(localSnapshot, remoteSnapshot);
      const remoteHasData =
        remoteSnapshot.sessions.length > 0 || remoteSnapshot.activeSessionId != null;
      const localHasData =
        localSnapshot.sessions.length > 0 || localSnapshot.activeSessionId != null;

      if (!remoteHasData && localHasData) {
        const savedSnapshot = await postRepositorySnapshot(localSnapshot);
        return applySnapshot(savedSnapshot);
      }

      const appliedSnapshot = applySnapshot(mergedSnapshot);

      if (localHasData) {
        const remoteSignature = JSON.stringify(remoteSnapshot);
        const mergedSignature = JSON.stringify(mergedSnapshot);

        if (remoteSignature !== mergedSignature) {
          queueRepositoryPersist(appliedSnapshot);
        }
      }

      return appliedSnapshot;
    } catch {
      return localSnapshot;
    } finally {
      repositoryHydrationPromise = null;
    }
  })();

  return repositoryHydrationPromise;
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

export function startRaceSession(input: {
  name?: string;
  courseId?: string;
  eventId?: string;
}) {
  const session: RaceSession = {
    id: safeUUID(),
    name: input.name ?? `Race ${new Date().toLocaleDateString()}`,
    eventId: input.eventId,
    courseId: input.courseId,
    startedAtISO: nowISO(),
    status: "active",
    createdFrom: "live",
    updatedAtISO: nowISO(),
    gpsTrack: [],
    weatherSamples: [],
    decisions: [],
    raceStateSnapshots: [],
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

export function recoverTodayRaceSession() {
  const today = new Date();
  const existing = getRaceSessions().find(
    (session) => session.createdFrom === "recovered" && isSameLocalDay(session.startedAtISO, today),
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
      trimLogs: [],
      tackCalibrations: [],
      tackRecords: [],
    };

  upsertRaceSession(session);
  appendRaceGpsSamples(session.id, storedTrack);
  attachTrimLogsToSession(session.id, todayLogs);
  attachTackCalibrationsToSession(session.id, todayCalibrations);

  const refreshed = getRaceSession(session.id);
  return refreshed ?? session;
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

function autoOutcomeForDecision(
  decision: RaceDecisionRecord,
  track: GpsTrackPoint[],
): RaceDecisionRecord {
  if (decision.outcome) return decision;

  const before = averageSpeed(gpsWindow(track, decision.atISO, 90, 0));
  const after = averageSpeed(gpsWindow(track, decision.atISO, 0, 120));
  if (before == null || after == null) {
    return {
      ...decision,
      outcome: "same",
      coachingNote: decision.coachingNote ?? "Auto-rated neutral because GPS speed context was limited.",
    };
  }

  const delta = after - before;
  const outcome = delta >= 0.25 ? "better" : delta <= -0.25 ? "worse" : "same";

  return {
    ...decision,
    outcome,
    coachingNote:
      decision.coachingNote ??
      `Auto-rated from GPS: speed changed ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} kt after the call.`,
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
    const label =
      outcome === "better"
        ? "Auto: strong pace segment"
        : outcome === "worse"
          ? "Auto: slow pace segment"
          : "Auto: neutral pace segment";

    segments.push({
      id: `auto-${session.id}-${index}`,
      atISO: segment[0].at,
      kind: "route",
      label,
      recommendation:
        outcome === "better"
          ? "This section beat the race average. Repeat the mode, lane, and trim setup that produced it."
          : outcome === "worse"
            ? "This section trailed the race average. Review course choice, lane quality, trim, and whether the boat stayed in pressure."
            : "This section was close to the race average. Look for cleaner evidence before changing the playbook.",
      outcome,
      coachingNote: `Auto-rated from GPS: segment avg ${segmentAverage.toFixed(1)} kt vs race avg ${dayAverage.toFixed(1)} kt.`,
      inputs: {
        autoGenerated: true,
        segmentPointCount: segment.length,
        segmentAverageSogKt: Number(segmentAverage.toFixed(2)),
        raceAverageSogKt: Number(dayAverage.toFixed(2)),
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
  const assessedDecisions =
    session.decisions.length > 0
      ? session.decisions.map((decision) => autoOutcomeForDecision(decision, session.gpsTrack))
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
