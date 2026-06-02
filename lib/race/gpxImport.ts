import type { GpsTrackPoint } from "@/lib/useGpsCourse";

type RawGpxPoint = {
  at: string;
  lat: number;
  lon: number;
  explicitCogDeg: number | null;
  explicitSogMps: number | null;
};

export type GpxImportSummary = {
  pointCount: number;
  durationSec: number;
  distanceNm: number;
  averageSogKt: number | null;
  maxSogKt: number | null;
};

export type ParsedGpxTrack = {
  fileName: string;
  suggestedSessionName: string;
  track: GpsTrackPoint[];
  startedAtISO: string;
  endedAtISO: string;
  summary: GpxImportSummary;
  warnings: string[];
};

const METERS_PER_NM = 1852;
const MAX_REASONABLE_DERIVED_SOG_MPS = 12.8611; // 25 kt
const IMPORT_TRACK_INTERVAL_MS = 5000;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDeg(value: number) {
  return (value * 180) / Math.PI;
}

function wrap360(value: number) {
  return ((value % 360) + 360) % 360;
}

function haversineMeters(
  start: Pick<RawGpxPoint, "lat" | "lon">,
  end: Pick<RawGpxPoint, "lat" | "lon">,
) {
  const radiusMeters = 6_371_000;
  const phi1 = toRad(start.lat);
  const phi2 = toRad(end.lat);
  const deltaPhi = toRad(end.lat - start.lat);
  const deltaLambda = toRad(end.lon - start.lon);
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusMeters * c;
}

function bearingDeg(
  start: Pick<RawGpxPoint, "lat" | "lon">,
  end: Pick<RawGpxPoint, "lat" | "lon">,
) {
  const phi1 = toRad(start.lat);
  const phi2 = toRad(end.lat);
  const deltaLambda = toRad(end.lon - start.lon);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return wrap360(toDeg(Math.atan2(y, x)));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textNumber(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function firstChildText(element: Element, localName: string) {
  return (
    element.getElementsByTagNameNS("*", localName)[0]?.textContent?.trim() ?? null
  );
}

function normalizeSessionName(fileName: string) {
  return fileName
    .replace(/\.(gpx)$/i, "")
    .replace(/\.(vcc)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveTrackPoint(
  points: RawGpxPoint[],
  index: number,
  smoothedSogs: Array<number | null>,
) {
  const current = points[index];
  const previous = index > 0 ? points[index - 1] : null;
  const next = index < points.length - 1 ? points[index + 1] : null;

  let cogDeg = current.explicitCogDeg;

  if (cogDeg == null) {
    if (previous && next) {
      cogDeg = bearingDeg(previous, next);
    } else if (previous) {
      cogDeg = bearingDeg(previous, current);
    } else if (next) {
      cogDeg = bearingDeg(current, next);
    }
  }

  return {
    at: current.at,
    lat: current.lat,
    lon: current.lon,
    cogDeg: finiteNumber(cogDeg),
    sogMps: finiteNumber(smoothedSogs[index]),
    accuracyM: null,
  } satisfies GpsTrackPoint;
}

function summarizeTrack(track: GpsTrackPoint[]): GpxImportSummary {
  let distanceMeters = 0;

  for (let index = 1; index < track.length; index += 1) {
    distanceMeters += haversineMeters(track[index - 1], track[index]);
  }

  const speedValues = track
    .map((point) => point.sogMps)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const durationSec =
    track.length >= 2
      ? Math.max(
          0,
          (new Date(track[track.length - 1].at).getTime() -
            new Date(track[0].at).getTime()) /
            1000,
        )
      : 0;

  return {
    pointCount: track.length,
    durationSec,
    distanceNm: Number((distanceMeters / METERS_PER_NM).toFixed(2)),
    averageSogKt:
      durationSec > 0
        ? Number((((distanceMeters / durationSec) * 1.943844).toFixed(2)))
        : null,
    maxSogKt: speedValues.length
      ? Number((Math.max(...speedValues) * 1.943844).toFixed(2))
      : null,
  };
}

export function parseGpxText(text: string, fileName: string): ParsedGpxTrack {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  const parserError = xml.getElementsByTagName("parsererror")[0];

  if (parserError) {
    throw new Error("This GPX file could not be parsed.");
  }

  const trackPointElements = Array.from(xml.getElementsByTagNameNS("*", "trkpt"));
  const routePointElements =
    trackPointElements.length === 0
      ? Array.from(xml.getElementsByTagNameNS("*", "rtept"))
      : [];
  const pointElements = trackPointElements.length > 0 ? trackPointElements : routePointElements;

  if (pointElements.length < 2) {
    throw new Error("The GPX file needs at least two timed points.");
  }

  const warnings: string[] = [];
  const dedupedByTime = new Map<string, RawGpxPoint>();
  let droppedPointCount = 0;

  pointElements.forEach((element) => {
    const lat = textNumber(element.getAttribute("lat"));
    const lon = textNumber(element.getAttribute("lon"));
    const at = firstChildText(element, "time");

    if (lat == null || lon == null || !at || Number.isNaN(Date.parse(at))) {
      droppedPointCount += 1;
      return;
    }

    dedupedByTime.set(at, {
      at,
      lat,
      lon,
      explicitCogDeg: textNumber(firstChildText(element, "course")),
      explicitSogMps: textNumber(firstChildText(element, "speed")),
    });
  });

  const sortedPoints = Array.from(dedupedByTime.values()).sort((left, right) =>
    left.at.localeCompare(right.at),
  );

  if (sortedPoints.length < 2) {
    throw new Error("No usable timed trackpoints were found in this GPX file.");
  }

  if (droppedPointCount > 0) {
    warnings.push(`${droppedPointCount} GPX point(s) were skipped because they were incomplete.`);
  }

  const rawPoints: RawGpxPoint[] = [];

  sortedPoints.forEach((point, index) => {
    if (index === 0 || index === sortedPoints.length - 1) {
      rawPoints.push(point);
      return;
    }

    const previousKept = rawPoints[rawPoints.length - 1];
    const deltaMs =
      new Date(point.at).getTime() - new Date(previousKept.at).getTime();

    if (deltaMs >= IMPORT_TRACK_INTERVAL_MS) {
      rawPoints.push(point);
    }
  });

  if (
    rawPoints[rawPoints.length - 1]?.at !== sortedPoints[sortedPoints.length - 1]?.at &&
    sortedPoints[sortedPoints.length - 1]
  ) {
    rawPoints.push(sortedPoints[sortedPoints.length - 1]);
  }

  if (sortedPoints.length - rawPoints.length > 0) {
    warnings.push(
      `Track was downsampled from ${sortedPoints.length} to ${rawPoints.length} points to match the live recorder cadence.`,
    );
  }

  const baseSogs: Array<number | null> = rawPoints.map((point, index) => {
    if (point.explicitSogMps != null) {
      return point.explicitSogMps;
    }

    const previous = index > 0 ? rawPoints[index - 1] : null;
    const next = index < rawPoints.length - 1 ? rawPoints[index + 1] : null;

    if (previous && next) {
      const elapsedSec =
        (new Date(next.at).getTime() - new Date(previous.at).getTime()) / 1000;
      if (elapsedSec > 0) {
        return haversineMeters(previous, next) / elapsedSec;
      }
    }

    const adjacent = previous ? [previous, point] : next ? [point, next] : null;
    if (!adjacent) return null;

    const elapsedSec =
      (new Date(adjacent[1].at).getTime() - new Date(adjacent[0].at).getTime()) / 1000;
    if (elapsedSec <= 0) return null;

    return haversineMeters(adjacent[0], adjacent[1]) / elapsedSec;
  });

  let clampedSpeedCount = 0;
  const smoothedSogs = baseSogs.map((value, index) => {
    const explicit = rawPoints[index].explicitSogMps;
    if (explicit != null) return explicit;

    const localMedian = median(
      baseSogs
        .slice(Math.max(0, index - 2), Math.min(baseSogs.length, index + 3))
        .filter((candidate): candidate is number => typeof candidate === "number"),
    );
    const candidate = localMedian ?? value;

    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > MAX_REASONABLE_DERIVED_SOG_MPS
    ) {
      clampedSpeedCount += 1;
      return null;
    }

    return candidate == null ? null : Number(candidate.toFixed(3));
  });

  if (clampedSpeedCount > 0) {
    warnings.push(
      `${clampedSpeedCount} derived speed sample(s) were dropped because they looked unrealistic.`,
    );
  }

  const track = rawPoints.map((point, index) => deriveTrackPoint(rawPoints, index, smoothedSogs));

  const startedAtISO = track[0]?.at;
  const endedAtISO = track[track.length - 1]?.at;

  if (!startedAtISO || !endedAtISO) {
    throw new Error("The GPX track could not be converted into a session timeline.");
  }

  return {
    fileName,
    suggestedSessionName: normalizeSessionName(fileName) || "Imported GPX Session",
    track,
    startedAtISO,
    endedAtISO,
    summary: summarizeTrack(track),
    warnings,
  };
}
