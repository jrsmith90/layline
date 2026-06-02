import {
  activeRaceEventId,
  type RaceCourseConstraintRecord,
} from "./eventDatabase";

export type StoredRaceConstraintOverride = {
  eventId: string;
  constraints: RaceCourseConstraintRecord[];
  updatedAtISO: string;
};

const RACE_CONSTRAINT_OVERRIDE_STORAGE_KEY = "layline-race-constraint-overrides-v1";

let cachedOverrides: StoredRaceConstraintOverride[] | null = null;
let constraintOverrideVersion = 0;
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

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sanitizeLegNumbers(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const legs = value
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    .map((item) => Math.max(1, Math.round(item)));

  return legs.length > 0 ? legs : undefined;
}

export function sanitizeRaceConstraintRecord(value: unknown): RaceCourseConstraintRecord | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<RaceCourseConstraintRecord>;
  const id = typeof input.id === "string" && input.id.trim().length > 0 ? input.id.trim() : null;
  const appliesTo =
    input.appliesTo === "all_keelboat_classes" || input.appliesTo === "selected_course"
      ? input.appliesTo
      : null;

  if (!id || !appliesTo) {
    return null;
  }

  const detail =
    typeof input.detail === "string" && input.detail.trim().length > 0
      ? input.detail.trim()
      : undefined;
  const legNumbers = sanitizeLegNumbers(input.legNumbers);

  if (
    input.type === "pass_on_channel_side" ||
    input.type === "leave_to_port" ||
    input.type === "leave_to_starboard"
  ) {
    const markLabel =
      typeof input.markLabel === "string" && input.markLabel.trim().length > 0
        ? input.markLabel.trim()
        : null;
    const markName =
      typeof input.markName === "string" && input.markName.trim().length > 0
        ? input.markName.trim()
        : null;

    if (!markLabel || !markName) {
      return null;
    }

    return {
      id,
      type: input.type,
      appliesTo,
      markLabel,
      markName,
      markKey:
        typeof input.markKey === "string" && input.markKey.trim().length > 0
          ? input.markKey.trim()
          : undefined,
      detail,
      legNumbers,
    };
  }

  if (input.type === "stay_inside_marks" || input.type === "stay_outside_marks") {
    const boundaryLabel =
      typeof input.boundaryLabel === "string" && input.boundaryLabel.trim().length > 0
        ? input.boundaryLabel.trim()
        : null;
    const boundaryMarks = sanitizeStringArray(input.boundaryMarks);

    if (!boundaryLabel || boundaryMarks.length === 0) {
      return null;
    }

    const boundaryMarkKeys = sanitizeStringArray(input.boundaryMarkKeys);

    return {
      id,
      type: input.type,
      appliesTo,
      boundaryLabel,
      boundaryMarks,
      boundaryMarkKeys: boundaryMarkKeys.length > 0 ? boundaryMarkKeys : undefined,
      referenceMarkKey:
        typeof input.referenceMarkKey === "string" && input.referenceMarkKey.trim().length > 0
          ? input.referenceMarkKey.trim()
          : undefined,
      detail,
      legNumbers,
    };
  }

  return null;
}

function sanitizeStoredOverride(value: unknown): StoredRaceConstraintOverride | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<StoredRaceConstraintOverride>;
  const eventId =
    typeof input.eventId === "string" && input.eventId.trim().length > 0
      ? input.eventId.trim()
      : null;
  const constraints = Array.isArray(input.constraints)
    ? input.constraints
        .map(sanitizeRaceConstraintRecord)
        .filter((constraint): constraint is RaceCourseConstraintRecord => constraint != null)
    : [];

  if (!eventId) {
    return null;
  }

  return {
    eventId,
    constraints,
    updatedAtISO:
      typeof input.updatedAtISO === "string" && input.updatedAtISO.length > 0
        ? input.updatedAtISO
        : new Date().toISOString(),
  };
}

function loadStoredOverrides() {
  if (cachedOverrides != null) {
    return cachedOverrides;
  }

  if (!canUseLocalStorage()) {
    cachedOverrides = [];
    return cachedOverrides;
  }

  try {
    const raw = localStorage.getItem(RACE_CONSTRAINT_OVERRIDE_STORAGE_KEY);
    if (!raw) {
      cachedOverrides = [];
      return cachedOverrides;
    }

    const parsed = JSON.parse(raw);
    cachedOverrides = Array.isArray(parsed)
      ? parsed
          .map(sanitizeStoredOverride)
          .filter((override): override is StoredRaceConstraintOverride => override != null)
      : [];
  } catch {
    cachedOverrides = [];
  }

  return cachedOverrides;
}

function emitConstraintOverrideChange() {
  constraintOverrideVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

function ensureStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") {
    return;
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== RACE_CONSTRAINT_OVERRIDE_STORAGE_KEY) {
      return;
    }

    cachedOverrides = null;
    emitConstraintOverrideChange();
  });

  storageListenerAttached = true;
}

function persistOverrides(overrides: StoredRaceConstraintOverride[]) {
  cachedOverrides = overrides;

  if (canUseLocalStorage()) {
    localStorage.setItem(RACE_CONSTRAINT_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  }

  emitConstraintOverrideChange();
}

export function getRaceConstraintOverrideVersion() {
  loadStoredOverrides();
  return constraintOverrideVersion;
}

export function subscribeRaceConstraintOverrides(listener: () => void) {
  ensureStorageListener();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getStoredRaceConstraintOverride(eventId = activeRaceEventId) {
  return loadStoredOverrides().find((override) => override.eventId === eventId) ?? null;
}

export function getRaceConstraintOverrides(eventId = activeRaceEventId) {
  return getStoredRaceConstraintOverride(eventId)?.constraints ?? null;
}

export function hasRaceConstraintOverride(eventId = activeRaceEventId) {
  return getStoredRaceConstraintOverride(eventId) != null;
}

export function getEffectiveRaceConstraints(
  defaults: RaceCourseConstraintRecord[],
  eventId = activeRaceEventId,
) {
  return getRaceConstraintOverrides(eventId) ?? defaults;
}

export function upsertRaceConstraintOverride(
  eventId: string,
  constraints: RaceCourseConstraintRecord[],
) {
  const sanitized = constraints
    .map(sanitizeRaceConstraintRecord)
    .filter((constraint): constraint is RaceCourseConstraintRecord => constraint != null);
  const current = loadStoredOverrides();
  const nextOverride: StoredRaceConstraintOverride = {
    eventId,
    constraints: sanitized,
    updatedAtISO: new Date().toISOString(),
  };
  const existingIndex = current.findIndex((override) => override.eventId === eventId);
  const next = [...current];

  if (existingIndex >= 0) {
    next[existingIndex] = nextOverride;
  } else {
    next.push(nextOverride);
  }

  persistOverrides(next);
  return nextOverride;
}

export function clearRaceConstraintOverride(eventId: string) {
  const next = loadStoredOverrides().filter((override) => override.eventId !== eventId);
  persistOverrides(next);
}
