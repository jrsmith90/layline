import { validateChecksum } from "./checksum";

export const SUPPORTED_SENTENCE_TYPES = [
  "RMC",
  "GGA",
  "GLL",
  "VTG",
  "HDG",
  "HDM",
  "HDT",
  "VHW",
  "MWV",
  "MWD",
  "DBT",
  "DPT",
  "MTW",
  "RMB",
  "APB",
  "XTE",
] as const;

export type SupportedSentenceType = (typeof SUPPORTED_SENTENCE_TYPES)[number];

export type ParsedSentence = {
  ok: true;
  type: SupportedSentenceType;
  talkerId: string;
  fields: Record<string, number | string | null>;
  raw: string;
};

export type UnparsedSentence = {
  ok: false;
  reason: string;
  /** "UNKNOWN" when the sentence type couldn't be identified at all; otherwise the raw 3-letter type code (e.g. an unsupported sentence like "ZDA"). */
  type: string;
  talkerId: string | null;
  raw: string;
};

export type ParseResult = ParsedSentence | UnparsedSentence;

function toNumberOrNull(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function toStringOrNull(raw: string | undefined): string | null {
  if (raw == null || raw.trim() === "") return null;
  return raw;
}

function parseNmeaCoordinate(raw: string | undefined, direction: string | undefined): number | null {
  if (raw == null || raw.trim() === "" || direction == null) return null;

  const match = /^(\d{2,3})(\d{2}\.\d+)$/.exec(raw.trim());
  if (!match) return null;

  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes)) return null;

  const decimal = degrees + minutes / 60;
  const sign = direction === "S" || direction === "W" ? -1 : 1;
  return decimal * sign;
}

function isSupportedType(type: string): type is SupportedSentenceType {
  return (SUPPORTED_SENTENCE_TYPES as readonly string[]).includes(type);
}

function parseFieldsForType(
  type: SupportedSentenceType,
  f: string[],
): Record<string, number | string | null> {
  switch (type) {
    case "RMC":
      return {
        timeUtc: toStringOrNull(f[1]),
        status: toStringOrNull(f[2]),
        lat: parseNmeaCoordinate(f[3], f[4]),
        lon: parseNmeaCoordinate(f[5], f[6]),
        sogKt: toNumberOrNull(f[7]),
        cogTrueDeg: toNumberOrNull(f[8]),
        date: toStringOrNull(f[9]),
        magVarDeg: toNumberOrNull(f[10]),
        magVarDir: toStringOrNull(f[11]),
      };
    case "GGA":
      return {
        timeUtc: toStringOrNull(f[1]),
        lat: parseNmeaCoordinate(f[2], f[3]),
        lon: parseNmeaCoordinate(f[4], f[5]),
        fixQuality: toNumberOrNull(f[6]),
        numSatellites: toNumberOrNull(f[7]),
        hdop: toNumberOrNull(f[8]),
        altitudeM: toNumberOrNull(f[9]),
      };
    case "GLL":
      return {
        lat: parseNmeaCoordinate(f[1], f[2]),
        lon: parseNmeaCoordinate(f[3], f[4]),
        timeUtc: toStringOrNull(f[5]),
        status: toStringOrNull(f[6]),
      };
    case "VTG":
      return {
        cogTrueDeg: toNumberOrNull(f[1]),
        cogMagDeg: toNumberOrNull(f[3]),
        sogKt: toNumberOrNull(f[5]),
        sogKmh: toNumberOrNull(f[7]),
      };
    case "HDG":
      return {
        headingDeg: toNumberOrNull(f[1]),
        deviationDeg: toNumberOrNull(f[2]),
        variationDeg: toNumberOrNull(f[4]),
      };
    case "HDM":
      return { headingMagneticDeg: toNumberOrNull(f[1]) };
    case "HDT":
      return { headingTrueDeg: toNumberOrNull(f[1]) };
    case "VHW":
      return {
        headingTrueDeg: toNumberOrNull(f[1]),
        headingMagneticDeg: toNumberOrNull(f[3]),
        speedThroughWaterKt: toNumberOrNull(f[5]),
        speedThroughWaterKmh: toNumberOrNull(f[7]),
      };
    case "MWV":
      return {
        windAngleDeg: toNumberOrNull(f[1]),
        reference: toStringOrNull(f[2]),
        windSpeed: toNumberOrNull(f[3]),
        speedUnits: toStringOrNull(f[4]),
        status: toStringOrNull(f[5]),
      };
    case "MWD":
      return {
        windDirTrueDeg: toNumberOrNull(f[1]),
        windDirMagDeg: toNumberOrNull(f[3]),
        windSpeedKt: toNumberOrNull(f[5]),
        windSpeedMs: toNumberOrNull(f[7]),
      };
    case "DBT":
      return {
        depthFeet: toNumberOrNull(f[1]),
        depthMeters: toNumberOrNull(f[3]),
        depthFathoms: toNumberOrNull(f[5]),
      };
    case "DPT":
      return {
        depthMeters: toNumberOrNull(f[1]),
        offsetM: toNumberOrNull(f[2]),
        maxRangeM: toNumberOrNull(f[3]),
      };
    case "MTW":
      return { waterTempC: toNumberOrNull(f[1]) };
    case "RMB":
      return {
        status: toStringOrNull(f[1]),
        xteNm: toNumberOrNull(f[2]),
        steerDir: toStringOrNull(f[3]),
        originWaypointId: toStringOrNull(f[4]),
        destWaypointId: toStringOrNull(f[5]),
        destLat: parseNmeaCoordinate(f[6], f[7]),
        destLon: parseNmeaCoordinate(f[8], f[9]),
        rangeNm: toNumberOrNull(f[10]),
        bearingDeg: toNumberOrNull(f[11]),
        closingVelocityKt: toNumberOrNull(f[12]),
        arrivalStatus: toStringOrNull(f[13]),
      };
    case "APB":
      return {
        xteNm: toNumberOrNull(f[3]),
        steerDir: toStringOrNull(f[4]),
        bearingOriginToDestDeg: toNumberOrNull(f[7]),
        destWaypointId: toStringOrNull(f[10]),
        bearingToDestDeg: toNumberOrNull(f[11]),
        headingToSteerDeg: toNumberOrNull(f[13]),
      };
    case "XTE":
      return {
        status: toStringOrNull(f[1]),
        xteNm: toNumberOrNull(f[3]),
        steerDir: toStringOrNull(f[4]),
      };
    default:
      return {};
  }
}

/**
 * Parses the sentence type from the last 3 chars of the 5-char header, so any
 * 2-char talker ID (GP, GN, HC, II, WI, VW, ...) resolves the same sentence type.
 */
export function parseSentence(raw: string): ParseResult {
  const trimmed = raw.trim();

  if (!trimmed.startsWith("$") && !trimmed.startsWith("!")) {
    return { ok: false, reason: "Sentence must start with $ or !", type: "UNKNOWN", talkerId: null, raw };
  }

  const checksumResult = validateChecksum(trimmed);
  if (!checksumResult.ok) {
    return { ok: false, reason: checksumResult.reason, type: "UNKNOWN", talkerId: null, raw };
  }

  const starIndex = trimmed.indexOf("*");
  const payload = trimmed.slice(1, starIndex === -1 ? undefined : starIndex);
  const fields = payload.split(",");
  const header = fields[0] ?? "";

  if (header.length < 5) {
    return { ok: false, reason: "Sentence header is too short to identify", type: "UNKNOWN", talkerId: null, raw };
  }

  const talkerId = header.slice(0, header.length - 3);
  const type = header.slice(-3);

  if (!isSupportedType(type)) {
    return { ok: false, reason: `Unsupported sentence type: ${type}`, type, talkerId, raw };
  }

  try {
    const parsedFields = parseFieldsForType(type, fields);
    return { ok: true, type, talkerId, fields: parsedFields, raw };
  } catch {
    return { ok: false, reason: "Malformed sentence fields", type, talkerId, raw };
  }
}

export type SentenceTrackerState = {
  latestByType: Partial<Record<SupportedSentenceType, ParsedSentence>>;
  frequencyByType: Partial<Record<SupportedSentenceType, number>>;
  unsupportedTypeCounts: Record<string, number>;
  checksumFailures: number;
  parsingFailures: number;
};

export function createSentenceTracker() {
  const state: SentenceTrackerState = {
    latestByType: {},
    frequencyByType: {},
    unsupportedTypeCounts: {},
    checksumFailures: 0,
    parsingFailures: 0,
  };

  function ingest(raw: string): ParseResult {
    const result = parseSentence(raw);

    if (result.ok) {
      state.latestByType[result.type] = result;
      state.frequencyByType[result.type] = (state.frequencyByType[result.type] ?? 0) + 1;
    } else if (/checksum/i.test(result.reason)) {
      state.checksumFailures += 1;
    } else if (result.type !== "UNKNOWN") {
      state.unsupportedTypeCounts[result.type] = (state.unsupportedTypeCounts[result.type] ?? 0) + 1;
    } else {
      state.parsingFailures += 1;
    }

    return result;
  }

  function getState(): SentenceTrackerState {
    return {
      latestByType: { ...state.latestByType },
      frequencyByType: { ...state.frequencyByType },
      unsupportedTypeCounts: { ...state.unsupportedTypeCounts },
      checksumFailures: state.checksumFailures,
      parsingFailures: state.parsingFailures,
    };
  }

  return { ingest, getState };
}
