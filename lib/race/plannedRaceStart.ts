export const DEFAULT_RACE_START_TIME = "12:00";

const EVENT_DEFAULT_RACE_START_TIMES: Record<string, string> = {
  "2026-ted-osius-memorial-twilight-regatta-annapolis-md": "17:00",
  "2026-scc-ewe-spirit-cup-annapolis-md": "12:00",
};

const EVENT_LEGACY_RACE_START_TIMES: Record<string, string[]> = {
  "2026-ted-osius-memorial-twilight-regatta-annapolis-md": ["12:00", "16:00"],
};

function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function sanitizeRaceStartDate(value: unknown, fallback: string) {
  return typeof value === "string" && isDateValue(value) ? value : fallback;
}

export function sanitizeRaceStartTime(
  value: unknown,
  fallback: string = DEFAULT_RACE_START_TIME,
) {
  return typeof value === "string" && isTimeValue(value) ? value : fallback;
}

export function getDefaultRaceStartTimeForEvent(eventId: string | null | undefined) {
  return eventId ? EVENT_DEFAULT_RACE_START_TIMES[eventId] ?? DEFAULT_RACE_START_TIME : DEFAULT_RACE_START_TIME;
}

export function shouldUpgradeLegacyRaceStartTime(
  eventId: string | null | undefined,
  value: unknown,
) {
  if (typeof value !== "string" || !eventId) {
    return false;
  }

  const legacyTimes = EVENT_LEGACY_RACE_START_TIMES[eventId];
  return Array.isArray(legacyTimes) ? legacyTimes.includes(value) : false;
}

export function buildPlannedRaceStartISO(
  date: string | null | undefined,
  time: string | null | undefined,
) {
  if (!date || !time || !isDateValue(date) || !isTimeValue(time)) {
    return null;
  }

  const parsed = new Date(`${date}T${time}:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function formatPlannedRaceStartLabel(
  date: string | null | undefined,
  time: string | null | undefined,
) {
  const iso = buildPlannedRaceStartISO(date, time);
  if (!iso) return null;

  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
