"use client";

export type Rating = "better" | "same" | "worse";
export type LogStatus = "pending" | "unrated" | "rated";

export type LaylineLog = {
  id: string;

  // Timestamps
  createdAtISO: string;
  updatedAtISO: string;
  autoFinalizedAtISO?: string;

  // Status + rating
  status: LogStatus;
  rating?: Rating;

  // Page/context
  page: string; // e.g. "/trim/jib"
  sailMode: "upwind" | "downwind";
  windDirTrueFromDeg?: number | null;
  windSpeedKt?: number | null;

  // Inputs
  boatMode?: "speed" | "pointing" | "control" | null; // upwind only
  symptom:
    | "normal"
    | "slow"
    | "pinching"
    | "overpowered"
    | "badair"
    | "cant_hold_lane";
  telltales:
    | "unknown"
    | "all_flowing"
    | "leeward_stalled"
    | "windward_lifting"
    | "top_stalled_bottom_flowing"
    | "top_flowing_bottom_stalled"
    | "erratic_waves"
    | "erratic_dirty_air"
    | "streaming_then_collapsing"
    | "dead_unreliable";

  // Jib car
  carBefore: number; // 1–24
  carSuggested: number; // 1–24
  carDelta: number; // suggested - before

  // Recommendation snapshot (for review)
  recommendation: {
    call: string;
    why: string;
    next: string;
    ifthen: string;
  };

  // GPS snapshot (optional)
  gps?: {
    lat: number | null;
    lon: number | null;
    cogDeg: number | null;
    sogMps: number | null;
    accuracyM: number | null;
  };

  // Versioning (so future logic changes don’t pollute learning)
  logicVersion: string; // bump when rules change
};

const STORAGE_KEY = "layline-logs-v1";
const PENDING_ID_KEY = "layline-pending-log-id-v1";

function nowISO() {
  return new Date().toISOString();
}

function safeUUID() {
  // modern browsers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `log_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getLogs(): LaylineLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LaylineLog[];
  } catch {
    return [];
  }
}

export function saveLogs(logs: LaylineLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function upsertLog(log: LaylineLog) {
  const logs = getLogs();
  const idx = logs.findIndex((l) => l.id === log.id);
  const updated = { ...log, updatedAtISO: nowISO() };
  if (idx >= 0) logs[idx] = updated;
  else logs.unshift(updated);
  saveLogs(logs);
}

export function setPendingLogId(id: string | null) {
  if (!id) localStorage.removeItem(PENDING_ID_KEY);
  else localStorage.setItem(PENDING_ID_KEY, id);
}

export function getPendingLogId(): string | null {
  return localStorage.getItem(PENDING_ID_KEY);
}

export function getLogById(id: string): LaylineLog | null {
  const logs = getLogs();
  return logs.find((l) => l.id === id) ?? null;
}

export function markPendingAsUnrated(id: string) {
  const log = getLogById(id);
  if (!log) return;
  if (log.status !== "pending") return;

  const updated: LaylineLog = {
    ...log,
    status: "unrated",
    autoFinalizedAtISO: nowISO(),
    updatedAtISO: nowISO(),
  };
  upsertLog(updated);
}

export function rateLog(id: string, rating: Rating) {
  const log = getLogById(id);
  if (!log) return;

  const updated: LaylineLog = {
    ...log,
    status: "rated",
    rating,
    updatedAtISO: nowISO(),
  };
  upsertLog(updated);

  // if you rated the current pending log, clear pointer
  const pendingId = getPendingLogId();
  if (pendingId === id) setPendingLogId(null);
}

export function deleteLog(id: string) {
  const logs = getLogs().filter((l) => l.id !== id);
  saveLogs(logs);

  const pendingId = getPendingLogId();
  if (pendingId === id) setPendingLogId(null);
}

export function clearAllLogs() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PENDING_ID_KEY);
}

export function createPendingLog(input: Omit<LaylineLog, "id" | "createdAtISO" | "updatedAtISO" | "status">) {
  const id = safeUUID();
  const log: LaylineLog = {
    ...input,
    id,
    createdAtISO: nowISO(),
    updatedAtISO: nowISO(),
    status: "pending",
  };
  upsertLog(log);
  setPendingLogId(id);
  return log;
}

function escapeCsv(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export function exportLogsToJson(): string {
  return JSON.stringify(getLogs(), null, 2);
}

export function exportLogsToCsv(): string {
  const logs = getLogs();

  const header = [
    "id",
    "createdAtISO",
    "updatedAtISO",
    "status",
    "rating",
    "page",
    "sailMode",
    "windDirTrueFromDeg",
    "windSpeedKt",
    "boatMode",
    "symptom",
    "telltales",
    "carBefore",
    "carSuggested",
    "carDelta",
    "cogDeg",
    "sogMps",
    "accuracyM",
    "lat",
    "lon",
    "logicVersion",
    "call",
    "why",
    "next",
    "ifthen",
  ].join(",");

  const rows = logs.map((l) => {
    const gps = l.gps ?? {
      lat: null,
      lon: null,
      cogDeg: null,
      sogMps: null,
      accuracyM: null,
    };

    return [
      escapeCsv(l.id),
      escapeCsv(l.createdAtISO),
      escapeCsv(l.updatedAtISO),
      escapeCsv(l.status),
      escapeCsv(l.rating ?? ""),
      escapeCsv(l.page),
      escapeCsv(l.sailMode),
      escapeCsv(l.windDirTrueFromDeg == null ? "" : String(l.windDirTrueFromDeg)),
      escapeCsv(l.windSpeedKt == null ? "" : String(l.windSpeedKt)),
      escapeCsv(l.boatMode ?? ""),
      escapeCsv(l.symptom),
      escapeCsv(l.telltales),
      escapeCsv(String(l.carBefore)),
      escapeCsv(String(l.carSuggested)),
      escapeCsv(String(l.carDelta)),
      escapeCsv(gps.cogDeg == null ? "" : String(gps.cogDeg)),
      escapeCsv(gps.sogMps == null ? "" : String(gps.sogMps)),
      escapeCsv(gps.accuracyM == null ? "" : String(gps.accuracyM)),
      escapeCsv(gps.lat == null ? "" : String(gps.lat)),
      escapeCsv(gps.lon == null ? "" : String(gps.lon)),
      escapeCsv(l.logicVersion),
      escapeCsv(l.recommendation.call),
      escapeCsv(l.recommendation.why),
      escapeCsv(l.recommendation.next),
      escapeCsv(l.recommendation.ifthen),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

export function downloadTextFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}