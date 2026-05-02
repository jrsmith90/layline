"use client";

import type { GpsTrackPoint } from "@/lib/useGpsCourse";
import type { LaylineLog } from "@/lib/logStore";
import { getLogs } from "@/lib/logStore";
import {
  readTackCalibrations,
  type TackCalibrationResult,
} from "@/lib/race/tackCalibration";

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
  gpsTrack: GpsTrackPoint[];
  weatherSamples: RaceWeatherSample[];
  decisions: RaceDecisionRecord[];
  trimLogs: LaylineLog[];
  tackCalibrations: TackCalibrationResult[];
};

export type RaceSessionReview = {
  session: RaceSession;
  durationMin: number | null;
  gpsPointCount: number;
  weatherSampleCount: number;
  decisionCount: number;
  averageSogKt: number | null;
  maxSogKt: number | null;
  topBottomWindSpreadKt: number | null;
  topBottomDirectionSpreadDeg: number | null;
  buildingWeather: boolean;
  incorrectChoices: RaceDecisionRecord[];
  coachingSignals: string[];
};

const SESSIONS_KEY = "layline-race-sessions-v1";
const ACTIVE_SESSION_ID_KEY = "layline-active-race-session-id-v1";
const GPS_TRACK_KEY = "layline-phone-gps-track-v1";
const TRACKER_KEY = "layline-active-course-tracker-v1";

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

export function getRaceSessions(): RaceSession[] {
  const sessions = readJson<RaceSession[]>(SESSIONS_KEY, []);
  return Array.isArray(sessions) ? sessions : [];
}

export function saveRaceSessions(sessions: RaceSession[]) {
  writeJson(SESSIONS_KEY, sessions);
}

export function getRaceSession(id: string): RaceSession | null {
  return getRaceSessions().find((session) => session.id === id) ?? null;
}

export function getActiveRaceSession(): RaceSession | null {
  if (!hasLocalStorage()) return null;
  const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  return activeId ? getRaceSession(activeId) : null;
}

export function getMostRecentRaceSession(): RaceSession | null {
  return (
    getRaceSessions()
      .slice()
      .sort((a, b) => b.startedAtISO.localeCompare(a.startedAtISO))[0] ?? null
  );
}

export function upsertRaceSession(session: RaceSession) {
  const sessions = getRaceSessions();
  const index = sessions.findIndex((candidate) => candidate.id === session.id);
  if (index >= 0) sessions[index] = session;
  else sessions.unshift(session);
  saveRaceSessions(sessions);
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
    gpsTrack: [],
    weatherSamples: [],
    decisions: [],
    trimLogs: [],
    tackCalibrations: [],
  };

  upsertRaceSession(session);
  if (hasLocalStorage()) localStorage.setItem(ACTIVE_SESSION_ID_KEY, session.id);
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

  upsertRaceSession(updated);

  if (hasLocalStorage() && localStorage.getItem(ACTIVE_SESSION_ID_KEY) === id) {
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  }

  return updated;
}

export function deleteRaceSession(id: string) {
  saveRaceSessions(getRaceSessions().filter((session) => session.id !== id));
  if (hasLocalStorage() && localStorage.getItem(ACTIVE_SESSION_ID_KEY) === id) {
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  }
}

export function appendRaceGpsSamples(id: string, points: GpsTrackPoint[]) {
  const session = getRaceSession(id);
  if (!session || points.length === 0) return session;

  const byTime = new Map(session.gpsTrack.map((point) => [point.at, point]));
  for (const point of points) byTime.set(point.at, point);

  const updated: RaceSession = {
    ...session,
    gpsTrack: Array.from(byTime.values()).sort((a, b) => a.at.localeCompare(b.at)),
  };
  upsertRaceSession(updated);
  return updated;
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
      trimLogs: [],
      tackCalibrations: [],
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
  const incorrectChoices = session.decisions.filter(
    (decision) => decision.outcome === "worse" || decision.userAction === "ignored",
  );
  const unratedChoices = session.decisions.filter((decision) => !decision.outcome);
  const coachingSignals: string[] = [];

  if (incorrectChoices.length) {
    coachingSignals.push(
      `${incorrectChoices.length} choice${incorrectChoices.length === 1 ? "" : "s"} need review because they were ignored or marked worse.`,
    );
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
  }

  if (topBottomDirectionSpreadDeg != null && topBottomDirectionSpreadDeg >= 15) {
    coachingSignals.push(
      `Top and bottom course wind direction differed by ${topBottomDirectionSpreadDeg.toFixed(0)} deg. Treat sensor choice as a tactical input, not background weather.`,
    );
  }

  if (buildingWeather) {
    coachingSignals.push(
      "At least one sample showed building breeze. Review whether depower and sail changes happened before or after control became expensive.",
    );
  }

  if (session.trimLogs.some((log) => log.status !== "rated")) {
    coachingSignals.push(
      "Some trim logs are unrated. Rating them better/same/worse will make future recommendations more personal.",
    );
  }

  if (!coachingSignals.length) {
    coachingSignals.push(
      "No obvious misses yet. Add outcomes to decisions and notes to turn this session into coaching data.",
    );
  }

  return {
    session,
    durationMin,
    gpsPointCount: session.gpsTrack.length,
    weatherSampleCount: session.weatherSamples.length,
    decisionCount: session.decisions.length,
    averageSogKt: average(sogValues),
    maxSogKt: sogValues.length ? Math.max(...sogValues) : null,
    topBottomWindSpreadKt,
    topBottomDirectionSpreadDeg,
    buildingWeather,
    incorrectChoices,
    coachingSignals,
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
