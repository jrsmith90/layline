import { NextRequest, NextResponse } from "next/server";

type NearbyObservation = {
  id: string;
  type: "Buoy" | "C-MAN" | "Drifting buoy" | "Ship" | "Other" | "Unknown";
  observedAt: string;
  hourUtc: number;
  lat: number;
  lon: number;
  distanceNm: number;
  headingDeg?: number;
  windDirectionDeg?: number;
  windAvgKt?: number;
  windGustKt?: number;
  waveHeightFt?: number;
  wavePeriodSec?: number;
  pressureInHg?: number;
  airTempF?: number;
  waterTempF?: number;
  dewPointF?: number;
};

const RADIAL_SEARCH_URL = "https://www.ndbc.noaa.gov/radial_search.php";
const DEFAULT_RADIUS_NM = 5;
const DEFAULT_HOURS = 6;
const MAX_RADIUS_NM = 20;
const MAX_HOURS = 12;

const typeLabels: Record<string, NearbyObservation["type"]> = {
  B: "Buoy",
  C: "C-MAN",
  D: "Drifting buoy",
  S: "Ship",
  O: "Other",
};

function parseNumber(value?: string) {
  if (!value || value === "-" || value === "MM") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoundedNumber(
  value: string | null,
  fallback: number,
  max: number
) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function htmlToText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&deg;/g, " deg")
    .replace(/\s+/g, " ")
    .trim();
}

function observationTimeToIso(hourMinute: string, now: Date) {
  const hour = Number(hourMinute.slice(0, 2));
  const minute = Number(hourMinute.slice(2, 4));
  const observedAt = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hour,
    minute,
    0
  ));

  if (hour > now.getUTCHours()) {
    observedAt.setUTCDate(observedAt.getUTCDate() - 1);
  }

  return observedAt.toISOString();
}

function parseObservationLine(
  line: string,
  now: Date
): NearbyObservation | null {
  const cells = line.trim().split(/\s+/);
  if (cells.length < 18) return null;

  const id = cells[0];
  const typeCode = cells[1];
  const time = cells[2];
  const lat = parseNumber(cells[3]);
  const lon = parseNumber(cells[4]);
  const distanceNm = parseNumber(cells[5]);
  const hourUtc = Number(time.slice(0, 2));

  if (
    !/^\d{4}$/.test(time) ||
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    typeof distanceNm !== "number" ||
    !Number.isFinite(hourUtc)
  ) {
    return null;
  }

  return {
    id,
    type: typeLabels[typeCode] ?? "Unknown",
    observedAt: observationTimeToIso(time, now),
    hourUtc,
    lat,
    lon,
    distanceNm,
    headingDeg: parseNumber(cells[6]),
    windDirectionDeg: parseNumber(cells[7]),
    windAvgKt: parseNumber(cells[8]),
    windGustKt: parseNumber(cells[9]),
    waveHeightFt: parseNumber(cells[10]),
    wavePeriodSec: parseNumber(cells[11]),
    pressureInHg: parseNumber(cells[14]),
    airTempF: parseNumber(cells[16]),
    waterTempF: parseNumber(cells[17]),
    dewPointF: parseNumber(cells[18]),
  };
}

function parseRadialSearchObservations(html: string, now: Date) {
  const lines = html
    .split("\n")
    .map(htmlToText)
    .filter(Boolean);

  return lines
    .map((line) => parseObservationLine(line, now))
    .filter((observation): observation is NearbyObservation => Boolean(observation));
}

function average(values: number[]) {
  if (!values.length) return undefined;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function buildLocationTrends(reports: NearbyObservation[]) {
  const groups = new Map<string, NearbyObservation[]>();

  reports.forEach((report) => {
    const key = `${report.id}:${report.lat.toFixed(2)}:${report.lon.toFixed(2)}`;
    groups.set(key, [...(groups.get(key) ?? []), report]);
  });

  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .map((group) => {
      const sorted = [...group].sort(
        (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
      );
      const latest = sorted[0];
      const oldest = sorted.at(-1);
      const speeds = sorted
        .map((report) => report.windAvgKt)
        .filter((value): value is number => typeof value === "number");
      const latestSpeed = latest.windAvgKt;
      const oldestSpeed = oldest?.windAvgKt;
      const speedDeltaKt =
        typeof latestSpeed === "number" && typeof oldestSpeed === "number"
          ? Number((latestSpeed - oldestSpeed).toFixed(1))
          : undefined;

      return {
        id: latest.id,
        type: latest.type,
        lat: latest.lat,
        lon: latest.lon,
        sampleSize: sorted.length,
        avgWindKt: average(speeds),
        speedDeltaKt,
        trend:
          speedDeltaKt == null
            ? "unknown"
            : speedDeltaKt >= 3
              ? "building"
              : speedDeltaKt <= -3
                ? "easing"
                : "steady",
        reports: sorted.slice(0, 4),
      };
    });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const radiusNm = parseBoundedNumber(params.get("radiusNm"), DEFAULT_RADIUS_NM, MAX_RADIUS_NM);
  const hours = parseBoundedNumber(params.get("hours"), DEFAULT_HOURS, MAX_HOURS);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat and lon query parameters are required." },
      { status: 400 }
    );
  }

  const searchParams = new URLSearchParams({
    lat1: String(lat),
    lon1: String(lon),
    uom: "E",
    dist: String(radiusNm),
    ot: "A",
    time: String(hours),
  });
  const sourceUrl = `${RADIAL_SEARCH_URL}?${searchParams.toString()}`;
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Layline sailing tactics app (local development)",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `NDBC radial search failed with ${response.status}` },
      { status: response.status }
    );
  }

  const now = new Date();
  const html = await response.text();
  const observations = parseRadialSearchObservations(html, now).sort(
    (a, b) =>
      a.distanceNm - b.distanceNm ||
      new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
  );
  const windSpeeds = observations
    .map((report) => report.windAvgKt)
    .filter((value): value is number => typeof value === "number");
  const gusts = observations
    .map((report) => report.windGustKt)
    .filter((value): value is number => typeof value === "number");

  return NextResponse.json({
    source: "ndbc-radial-observations",
    sourceUrl,
    fetchedAt: now.toISOString(),
    center: { lat, lon },
    radiusNm,
    hours,
    reportCount: observations.length,
    avgWindKt: average(windSpeeds),
    maxGustKt: gusts.length ? Math.max(...gusts) : undefined,
    trends: buildLocationTrends(observations),
    reports: observations.slice(0, 12),
  });
}
