import type {
  CourseLibraryEntry,
  RaceResult,
  RaceDebrief,
} from "@/types/courseLibrary";
import { STORAGE_KEYS } from "@/lib/storageKeys";

type CourseLibraryStore = {
  entries: CourseLibraryEntry[];
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readStore(): CourseLibraryStore {
  if (typeof window === "undefined") return { entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.courseLibrary);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "entries" in parsed &&
      Array.isArray((parsed as { entries: unknown }).entries)
    ) {
      return { entries: (parsed as CourseLibraryStore).entries };
    }
    return { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeStore(store: CourseLibraryStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.courseLibrary, JSON.stringify(store));
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeCourseLibraryStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCourseLibraryEntries(): CourseLibraryEntry[] {
  return readStore().entries;
}

export function getCourseLibraryEntry(id: string): CourseLibraryEntry | null {
  return readStore().entries.find((e) => e.id === id) ?? null;
}

export function saveCourseLibraryEntry(entry: CourseLibraryEntry): void {
  const store = readStore();
  const idx = store.entries.findIndex((e) => e.id === entry.id);
  const updated: CourseLibraryEntry = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    store.entries[idx] = updated;
  } else {
    store.entries.unshift(updated);
  }
  writeStore(store);
  notify();
}

export function deleteCourseLibraryEntry(id: string): void {
  const store = readStore();
  store.entries = store.entries.filter((e) => e.id !== id);
  writeStore(store);
  notify();
}

export function createCourseLibraryEntry(
  fields: Omit<CourseLibraryEntry, "id" | "createdAt" | "updatedAt" | "results" | "debrief">,
): CourseLibraryEntry {
  const now = new Date().toISOString();
  const entry: CourseLibraryEntry = {
    ...fields,
    id: generateId(),
    results: [],
    debrief: null,
    createdAt: now,
    updatedAt: now,
  };
  saveCourseLibraryEntry(entry);
  return entry;
}

export function duplicateCourseLibraryEntry(
  id: string,
  overrides: Partial<Pick<CourseLibraryEntry, "courseName" | "raceDate" | "eventName">>,
): CourseLibraryEntry | null {
  const source = getCourseLibraryEntry(id);
  if (!source) return null;
  const now = new Date().toISOString();
  const entry: CourseLibraryEntry = {
    ...source,
    ...overrides,
    id: generateId(),
    results: [],
    debrief: null,
    manualStatus: null,
    duplicatedFromId: id,
    createdAt: now,
    updatedAt: now,
  };
  saveCourseLibraryEntry(entry);
  return entry;
}

export function setActiveCourse(id: string): void {
  const store = readStore();
  store.entries = store.entries.map((e) => ({
    ...e,
    manualStatus:
      e.id === id
        ? "active"
        : e.manualStatus === "active"
          ? null
          : e.manualStatus,
  }));
  writeStore(store);
  notify();
}

export function deactivateCourse(id: string): void {
  const store = readStore();
  store.entries = store.entries.map((e) => ({
    ...e,
    manualStatus: e.id === id && e.manualStatus === "active" ? null : e.manualStatus,
  }));
  writeStore(store);
  notify();
}

export function archiveCourse(id: string): void {
  const store = readStore();
  store.entries = store.entries.map((e) => ({
    ...e,
    manualStatus: e.id === id ? "archived" : e.manualStatus,
  }));
  writeStore(store);
  notify();
}

export function unarchiveCourse(id: string): void {
  const store = readStore();
  store.entries = store.entries.map((e) => ({
    ...e,
    manualStatus:
      e.id === id && e.manualStatus === "archived" ? null : e.manualStatus,
  }));
  writeStore(store);
  notify();
}

export function addRaceResult(
  entryId: string,
  result: Omit<RaceResult, "id" | "recordedAt">,
): void {
  const entry = getCourseLibraryEntry(entryId);
  if (!entry) return;
  const newResult: RaceResult = {
    ...result,
    id: generateId(),
    recordedAt: new Date().toISOString(),
  };
  saveCourseLibraryEntry({ ...entry, results: [...entry.results, newResult] });
}

export function updateRaceResult(entryId: string, result: RaceResult): void {
  const entry = getCourseLibraryEntry(entryId);
  if (!entry) return;
  saveCourseLibraryEntry({
    ...entry,
    results: entry.results.map((r) => (r.id === result.id ? result : r)),
  });
}

export function deleteRaceResult(entryId: string, resultId: string): void {
  const entry = getCourseLibraryEntry(entryId);
  if (!entry) return;
  saveCourseLibraryEntry({
    ...entry,
    results: entry.results.filter((r) => r.id !== resultId),
  });
}

export function saveDebrief(
  entryId: string,
  debrief: Omit<RaceDebrief, "updatedAt">,
): void {
  const entry = getCourseLibraryEntry(entryId);
  if (!entry) return;
  saveCourseLibraryEntry({
    ...entry,
    debrief: { ...debrief, updatedAt: new Date().toISOString() },
  });
}

// Import / Export

export function exportCourseLibraryJson(): string {
  return JSON.stringify(readStore(), null, 2);
}

export function exportCourseLibraryCsv(): string {
  const { entries } = readStore();
  const headers = [
    "Course Name",
    "Event",
    "Host Club",
    "Date",
    "Distance (NM)",
    "Race Type",
    "Start",
    "Finish",
    "Finish Position",
    "Fleet Size",
    "Elapsed Time",
    "Corrected Time",
    "Skipper",
  ];
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = entries.flatMap((e) => {
    if (e.results.length === 0) {
      return [
        [
          e.courseName,
          e.eventName,
          e.hostClub,
          e.raceDate,
          e.distanceNm ?? "",
          e.raceType,
          e.startLocation,
          e.finishLocation,
          "",
          "",
          "",
          "",
          "",
        ].map(cell),
      ];
    }
    return e.results.map((r) =>
      [
        e.courseName,
        e.eventName,
        e.hostClub,
        e.raceDate,
        e.distanceNm ?? "",
        e.raceType,
        e.startLocation,
        e.finishLocation,
        r.finishPosition ?? "",
        r.fleetSize ?? "",
        r.elapsedTime,
        r.correctedTime,
        r.skipper,
      ].map(cell),
    );
  });
  return [headers.map(cell), ...rows].map((row) => row.join(",")).join("\n");
}

export function importCourseLibraryJson(json: string): {
  imported: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("entries" in parsed) ||
      !Array.isArray((parsed as { entries: unknown }).entries)
    ) {
      return { imported: 0, error: "Invalid format — expected { entries: [...] }" };
    }
    const incoming = (parsed as { entries: CourseLibraryEntry[] }).entries;
    const store = readStore();
    const existingIds = new Set(store.entries.map((e) => e.id));
    let imported = 0;
    for (const entry of incoming) {
      if (!entry.id || !entry.courseName) continue;
      if (!existingIds.has(entry.id)) {
        store.entries.unshift(entry);
        existingIds.add(entry.id);
        imported++;
      }
    }
    writeStore(store);
    notify();
    return { imported };
  } catch {
    return { imported: 0, error: "Failed to parse JSON" };
  }
}

export function initializeCourseLibrary(seedEntries: CourseLibraryEntry[]): void {
  const store = readStore();
  if (store.entries.length === 0) {
    writeStore({ entries: seedEntries });
    notify();
  }
}
