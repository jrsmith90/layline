import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoredPoint = Record<string, unknown> & {
  at?: string;
};

type StoredWeatherSample = Record<string, unknown> & {
  atISO?: string;
};

type StoredDecision = Record<string, unknown> & {
  id?: string;
  atISO?: string;
};

type StoredRaceStateSnapshot = Record<string, unknown> & {
  capturedAtISO?: string;
};

type StoredTrimLog = Record<string, unknown> & {
  id?: string;
  createdAtISO?: string;
  updatedAtISO?: string;
};

type StoredCalibration = Record<string, unknown> & {
  id?: string;
  at?: string;
};

type StoredTackRecord = Record<string, unknown> & {
  id?: string;
  atISO?: string;
};

type StoredRaceSession = Record<string, unknown> & {
  id: string;
  name: string;
  startedAtISO: string;
  endedAtISO?: string;
  status?: "active" | "ended";
  createdFrom?: "live" | "recovered";
  updatedAtISO?: string;
  gpsTrack?: StoredPoint[];
  weatherSamples?: StoredWeatherSample[];
  decisions?: StoredDecision[];
  raceStateSnapshots?: StoredRaceStateSnapshot[];
  trimLogs?: StoredTrimLog[];
  tackCalibrations?: StoredCalibration[];
  tackRecords?: StoredTackRecord[];
};

type RaceSessionRepositorySnapshot = {
  sessions: StoredRaceSession[];
  activeSessionId: string | null;
  updatedAtISO: string;
};

const DATA_DIR = path.join(process.cwd(), ".layline-data");
const REPOSITORY_FILE = path.join(DATA_DIR, "race-sessions-v1.json");
const MAX_RACE_STATE_SNAPSHOTS = 720;

function nowISO() {
  return new Date().toISOString();
}

function timeValue(value?: string) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptySnapshot(): RaceSessionRepositorySnapshot {
  return {
    sessions: [],
    activeSessionId: null,
    updatedAtISO: nowISO(),
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

function normalizeSession(session: StoredRaceSession): StoredRaceSession {
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

function mergeSession(existing: StoredRaceSession, incoming: StoredRaceSession) {
  const left = normalizeSession(existing);
  const right = normalizeSession(incoming);
  const primary =
    timeValue(right.updatedAtISO) >= timeValue(left.updatedAtISO) ? right : left;
  const secondary = primary === right ? left : right;

  return normalizeSession({
    ...secondary,
    ...primary,
    gpsTrack: uniqueByKey(
      [...(secondary.gpsTrack ?? []), ...(primary.gpsTrack ?? [])],
      (item) => (typeof item.at === "string" ? item.at : null),
      (leftItem, rightItem) => String(leftItem.at ?? "").localeCompare(String(rightItem.at ?? "")),
    ),
    weatherSamples: uniqueByKey(
      [...(secondary.weatherSamples ?? []), ...(primary.weatherSamples ?? [])],
      (item) => (typeof item.atISO === "string" ? item.atISO : null),
      (leftItem, rightItem) =>
        String(leftItem.atISO ?? "").localeCompare(String(rightItem.atISO ?? "")),
    ),
    decisions: uniqueByKey(
      [...(secondary.decisions ?? []), ...(primary.decisions ?? [])],
      (item) => (typeof item.id === "string" ? item.id : null),
      (leftItem, rightItem) =>
        String(rightItem.atISO ?? "").localeCompare(String(leftItem.atISO ?? "")),
    ),
    raceStateSnapshots: uniqueByKey(
      [...(secondary.raceStateSnapshots ?? []), ...(primary.raceStateSnapshots ?? [])],
      (item) => (typeof item.capturedAtISO === "string" ? item.capturedAtISO : null),
      (leftItem, rightItem) =>
        String(leftItem.capturedAtISO ?? "").localeCompare(
          String(rightItem.capturedAtISO ?? ""),
        ),
    ).slice(-MAX_RACE_STATE_SNAPSHOTS),
    trimLogs: uniqueByKey(
      [...(secondary.trimLogs ?? []), ...(primary.trimLogs ?? [])],
      (item) => (typeof item.id === "string" ? item.id : null),
      (leftItem, rightItem) =>
        String(rightItem.updatedAtISO ?? rightItem.createdAtISO ?? "").localeCompare(
          String(leftItem.updatedAtISO ?? leftItem.createdAtISO ?? ""),
        ),
    ),
    tackCalibrations: uniqueByKey(
      [...(secondary.tackCalibrations ?? []), ...(primary.tackCalibrations ?? [])],
      (item) =>
        typeof item.id === "string"
          ? item.id
          : typeof item.at === "string"
            ? item.at
            : null,
      (leftItem, rightItem) => String(rightItem.at ?? "").localeCompare(String(leftItem.at ?? "")),
    ),
    tackRecords: uniqueByKey(
      [...(secondary.tackRecords ?? []), ...(primary.tackRecords ?? [])],
      (item) => (typeof item.id === "string" ? item.id : null),
      (leftItem, rightItem) =>
        String(rightItem.atISO ?? "").localeCompare(String(leftItem.atISO ?? "")),
    ),
  });
}

function mergeSessions(
  existing: StoredRaceSession[],
  incoming: StoredRaceSession[],
) {
  const byId = new Map<string, StoredRaceSession>();

  for (const session of existing.map(normalizeSession)) {
    byId.set(session.id, session);
  }

  for (const session of incoming.map(normalizeSession)) {
    const current = byId.get(session.id);
    byId.set(session.id, current ? mergeSession(current, session) : session);
  }

  return Array.from(byId.values()).sort((left, right) =>
    right.startedAtISO.localeCompare(left.startedAtISO),
  );
}

function normalizeSnapshot(
  snapshot: Partial<RaceSessionRepositorySnapshot> | null | undefined,
): RaceSessionRepositorySnapshot {
  const sessions = mergeSessions([], Array.isArray(snapshot?.sessions) ? snapshot.sessions : []);
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
  const sessions = mergeSessions(existing.sessions, incoming.sessions);
  const preferredActiveId =
    timeValue(incoming.updatedAtISO) >= timeValue(existing.updatedAtISO)
      ? incoming.activeSessionId ?? existing.activeSessionId
      : existing.activeSessionId ?? incoming.activeSessionId;
  const activeSessionId =
    preferredActiveId && sessions.some((session) => session.id === preferredActiveId)
      ? preferredActiveId
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

async function readRepositorySnapshot() {
  try {
    const raw = await fs.readFile(REPOSITORY_FILE, "utf8");
    return normalizeSnapshot(JSON.parse(raw) as Partial<RaceSessionRepositorySnapshot>);
  } catch (error) {
    const missingFile =
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT";

    if (missingFile) return emptySnapshot();
    throw error;
  }
}

async function writeRepositorySnapshot(snapshot: RaceSessionRepositorySnapshot) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REPOSITORY_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function GET() {
  try {
    const snapshot = await readRepositorySnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load race sessions repository.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RaceSessionRepositorySnapshot>;
    const incoming = normalizeSnapshot(body);
    const existing = await readRepositorySnapshot();
    const merged = mergeSnapshots(existing, incoming);

    await writeRepositorySnapshot(merged);

    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to save race sessions repository.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
