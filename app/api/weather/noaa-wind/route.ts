import { NextResponse } from "next/server";

type NoaaObservationResponse = {
  properties?: {
    station?: string;
    timestamp?: string;
    textDescription?: string;
    windDirection?: {
      value?: number | null;
      unitCode?: string;
    };
    windSpeed?: {
      value?: number | null;
      unitCode?: string;
    };
    windGust?: {
      value?: number | null;
      unitCode?: string;
    };
  };
};

type NoaaHistoryObservation = {
  day: number;
  time: string;
  windText: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionText?: string;
};

type CbibsReading = {
  value?: number;
  unit?: string;
  observedAt?: string;
};

type CbibsAnnapolisSnapshot = {
  source: "cbibs";
  platformId: "AN";
  platformName: string;
  locationName: string;
  sourceUrl: string;
  fetchedAt: string;
  observedAt?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  waveHeightFt?: number;
  wavePeriodSec?: number;
  waveDirectionDeg?: number;
  waterTempF?: number;
  salinityPsu?: number;
};

type NdbcThomasPointObservation = {
  observedAt: string;
  windDirectionDeg?: number;
  windAvgKt?: number;
  windGustKt?: number;
  pressureHpa?: number;
  airTempC?: number;
  dewPointC?: number;
};

type NdbcThomasPointSnapshot = {
  source: "ndbc";
  stationId: "TPLM2";
  stationName: string;
  locationName: string;
  stationUse: string;
  sourceUrl: string;
  fetchedAt: string;
  observedAt?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  pressureHpa?: number;
  airTempC?: number;
  trend?: {
    sampleSize: number;
    lookbackLabel: string;
    avgWindKt?: number;
    maxGustKt?: number;
    prevailingDirectionDeg?: number;
    speedDeltaKt?: number;
    trend: "building" | "easing" | "steady" | "unknown";
    observations: NdbcThomasPointObservation[];
  };
};

const STATION_ID = "KNAK";
const STATION_NAME = "Annapolis, United States Naval Academy";
const SOURCE_URL = `https://api.weather.gov/stations/${STATION_ID}/observations/latest`;
const HISTORY_URL = `https://forecast.weather.gov/data/obhistory/${STATION_ID}.html`;
const CBIBS_ANNAPOLIS_URL = "https://buoybay.noaa.gov/locations/annapolis";
const THOMAS_POINT_URL = "https://www.ndbc.noaa.gov/station_page.php?station=TPLM2";
const THOMAS_POINT_REALTIME_URL =
  "https://www.ndbc.noaa.gov/data/realtime2/TPLM2.txt";

const directionToDeg: Record<string, number> = {
  N: 0,
  NNE: 23,
  NE: 45,
  ENE: 68,
  E: 90,
  ESE: 113,
  SE: 135,
  SSE: 158,
  S: 180,
  SSW: 203,
  SW: 225,
  WSW: 248,
  W: 270,
  WNW: 293,
  NW: 315,
  NNW: 338,
};

function metersPerSecondToKt(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Number((value * 1.943844).toFixed(1));
}

function mphToKt(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Number((value * 0.868976).toFixed(1));
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&deg;/g, " deg")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseWindText(windText: string): Pick<
  NoaaHistoryObservation,
  "windAvgKt" | "windGustKt" | "windDirectionText"
> {
  if (!windText || /^calm$/i.test(windText)) {
    return { windAvgKt: 0, windDirectionText: "Calm" };
  }

  const match = windText.match(/^([A-Z]{1,3}|Vrbl)\s+(\d+)(?:\s+G\s+(\d+))?/i);
  if (!match) return {};

  return {
    windDirectionText: match[1].toUpperCase(),
    windAvgKt: mphToKt(Number(match[2])),
    windGustKt: match[3] ? mphToKt(Number(match[3])) : undefined,
  };
}

function average(values: number[]) {
  if (!values.length) return undefined;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function circularAverageDeg(values: number[]) {
  if (!values.length) return undefined;

  const radians = values.map((value) => (value * Math.PI) / 180);
  const sin = radians.reduce((sum, value) => sum + Math.sin(value), 0) / values.length;
  const cos = radians.reduce((sum, value) => sum + Math.cos(value), 0) / values.length;
  const degrees = (Math.atan2(sin, cos) * 180) / Math.PI;

  return Math.round((degrees + 360) % 360);
}

function parseNdbcNumber(value: string) {
  if (!value || value === "MM" || value === "999" || value === "99.0") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseObservationHistory(html: string): NoaaHistoryObservation[] {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  return rows
    .map((row) => {
      const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi)?.map(stripHtml) ?? [];
      if (cells.length < 3) return null;

      const day = Number(cells[0]);
      const time = cells[1];
      const windText = cells[2];

      if (!Number.isFinite(day) || !/^\d{2}:\d{2}$/.test(time)) return null;

      return {
        day,
        time,
        windText,
        ...parseWindText(windText),
      };
    })
    .filter((item): item is NoaaHistoryObservation => Boolean(item))
    .slice(0, 12);
}

async function getNoaaHistoryTrend() {
  const response = await fetch(HISTORY_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Layline sailing tactics app (local development)",
    },
    next: { revalidate: 900 },
  });

  if (!response.ok) return undefined;

  const html = await response.text();
  const observations = parseObservationHistory(html);
  const speeds = observations
    .map((observation) => observation.windAvgKt)
    .filter((value): value is number => typeof value === "number");
  const gusts = observations
    .map((observation) => observation.windGustKt)
    .filter((value): value is number => typeof value === "number");
  const directions = observations
    .map((observation) =>
      observation.windDirectionText
        ? directionToDeg[observation.windDirectionText]
        : undefined
    )
    .filter((value): value is number => typeof value === "number");

  const latest = observations[0];
  const oldest = observations.at(-1);
  const latestSpeed = latest?.windAvgKt;
  const oldestSpeed = oldest?.windAvgKt;
  const speedDeltaKt =
    typeof latestSpeed === "number" && typeof oldestSpeed === "number"
      ? Number((latestSpeed - oldestSpeed).toFixed(1))
      : undefined;

  return {
    historyUrl: HISTORY_URL,
    sampleSize: observations.length,
    lookbackLabel: observations.length
      ? `Last ${observations.length} KNAK observations`
      : "KNAK observation history",
    avgWindKt: average(speeds),
    maxGustKt: gusts.length ? Math.max(...gusts) : undefined,
    prevailingDirectionDeg: circularAverageDeg(directions),
    speedDeltaKt,
    trend:
      speedDeltaKt == null
        ? "unknown"
        : speedDeltaKt >= 3
          ? "building"
          : speedDeltaKt <= -3
            ? "easing"
            : "steady",
    observations: observations.slice(0, 6),
  };
}

function parseCbibsRows(html: string) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const readings = new Map<string, CbibsReading>();

  rows.forEach((row) => {
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi)?.map(stripHtml) ?? [];
    if (cells.length < 6) return;

    readings.set(cells[0], {
      value: parseNumber(cells[3]),
      unit: cells[4],
      observedAt: cells[5],
    });
  });

  return readings;
}

async function getCbibsAnnapolisSnapshot(): Promise<CbibsAnnapolisSnapshot | undefined> {
  const response = await fetch(CBIBS_ANNAPOLIS_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Layline sailing tactics app (local development)",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) return undefined;

  const html = await response.text();
  const rows = parseCbibsRows(html);

  const windSpeed = rows.get("Wind Speed");
  const windGust = rows.get("Wind Gust");
  const windDirection = rows.get("Wind Direction");
  const waveHeight = rows.get("Significant Wave Height");
  const wavePeriod = rows.get("Mean Wave Period");
  const waveDirection = rows.get("Wave Direction (From)");
  const waterTemp = rows.get("Water Temperature");
  const salinity = rows.get("Water Salinity");

  if (!windSpeed && !waveHeight && !waterTemp) return undefined;

  return {
    source: "cbibs",
    platformId: "AN",
    platformName: "Annapolis Continuous Monitoring Buoy",
    locationName: "Annapolis buoy, top-of-course reference",
    sourceUrl: CBIBS_ANNAPOLIS_URL,
    fetchedAt: new Date().toISOString(),
    observedAt:
      windSpeed?.observedAt ??
      waveHeight?.observedAt ??
      waterTemp?.observedAt,
    windAvgKt: windSpeed?.value,
    windGustKt: windGust?.value,
    windDirectionDeg: windDirection?.value,
    waveHeightFt: waveHeight?.value,
    wavePeriodSec: wavePeriod?.value,
    waveDirectionDeg: waveDirection?.value,
    waterTempF: waterTemp?.value,
    salinityPsu: salinity?.value,
  };
}

function parseNdbcThomasPoint(text: string): NdbcThomasPointObservation[] {
  const observations: NdbcThomasPointObservation[] = [];

  text
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .forEach((line) => {
      const cells = line.trim().split(/\s+/);
      if (cells.length < 18) return;

      const [year, month, day, hour, minute] = cells;
      const observedAt = `${year}-${month}-${day}T${hour}:${minute}:00Z`;
      const windDirectionDeg = parseNdbcNumber(cells[5]);
      const windSpeedMps = parseNdbcNumber(cells[6]);
      const windGustMps = parseNdbcNumber(cells[7]);

      observations.push({
        observedAt,
        windDirectionDeg,
        windAvgKt: metersPerSecondToKt(windSpeedMps),
        windGustKt: metersPerSecondToKt(windGustMps),
        pressureHpa: parseNdbcNumber(cells[12]),
        airTempC: parseNdbcNumber(cells[13]),
        dewPointC: parseNdbcNumber(cells[15]),
      });
    });

  return observations.slice(0, 12);
}

async function getThomasPointSnapshot(): Promise<NdbcThomasPointSnapshot | undefined> {
  const response = await fetch(THOMAS_POINT_REALTIME_URL, {
    headers: {
      Accept: "text/plain",
      "User-Agent": "Layline sailing tactics app (local development)",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) return undefined;

  const text = await response.text();
  const observations = parseNdbcThomasPoint(text);
  const latest = observations[0];

  if (!latest) return undefined;

  const speeds = observations
    .map((observation) => observation.windAvgKt)
    .filter((value): value is number => typeof value === "number");
  const gusts = observations
    .map((observation) => observation.windGustKt)
    .filter((value): value is number => typeof value === "number");
  const directions = observations
    .map((observation) => observation.windDirectionDeg)
    .filter((value): value is number => typeof value === "number");
  const oldestSpeed = observations.at(-1)?.windAvgKt;
  const speedDeltaKt =
    typeof latest.windAvgKt === "number" && typeof oldestSpeed === "number"
      ? Number((latest.windAvgKt - oldestSpeed).toFixed(1))
      : undefined;

  return {
    source: "ndbc",
    stationId: "TPLM2",
    stationName: "Thomas Point, MD",
    locationName: "Thomas Point Light, bottom-of-course reference",
    stationUse: "Bottom-of-course wind reference; better for open Bay racing than the Naval Academy station.",
    sourceUrl: THOMAS_POINT_URL,
    fetchedAt: new Date().toISOString(),
    observedAt: latest.observedAt,
    windAvgKt: latest.windAvgKt,
    windGustKt: latest.windGustKt,
    windDirectionDeg: latest.windDirectionDeg,
    pressureHpa: latest.pressureHpa,
    airTempC: latest.airTempC,
    trend: {
      sampleSize: observations.length,
      lookbackLabel: `Last ${observations.length} TPLM2 hourly observations`,
      avgWindKt: average(speeds),
      maxGustKt: gusts.length ? Math.max(...gusts) : undefined,
      prevailingDirectionDeg: circularAverageDeg(directions),
      speedDeltaKt,
      trend:
        speedDeltaKt == null
          ? "unknown"
          : speedDeltaKt >= 3
            ? "building"
            : speedDeltaKt <= -3
              ? "easing"
              : "steady",
      observations: observations.slice(0, 6),
    },
  };
}

export async function GET() {
  try {
    const [response, historyTrend, cbibsAnnapolis, thomasPoint] = await Promise.all([
      fetch(SOURCE_URL, {
        headers: {
          Accept: "application/geo+json",
          "User-Agent": "Layline sailing tactics app (local development)",
        },
        next: { revalidate: 300 },
      }),
      getNoaaHistoryTrend().catch(() => undefined),
      getCbibsAnnapolisSnapshot().catch(() => undefined),
      getThomasPointSnapshot().catch(() => undefined),
    ]);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `NOAA wind request failed with ${response.status}`,
          source: "noaa",
          stationId: STATION_ID,
          stationName: STATION_NAME,
        },
        { status: response.status }
      );
    }

    const data = (await response.json()) as NoaaObservationResponse;
    const props = data.properties;

    return NextResponse.json({
      source: "noaa",
      stationId: STATION_ID,
      stationName: STATION_NAME,
      stationUse: "River reference; not a bay wind source.",
      sourceUrl:
        "https://forecast.weather.gov/MapClick.php?lat=38.9834&lon=-76.5292",
      fetchedAt: new Date().toISOString(),
      observedAt: props?.timestamp,
      description: props?.textDescription,
      windAvgKt: metersPerSecondToKt(props?.windSpeed?.value),
      windGustKt: metersPerSecondToKt(props?.windGust?.value),
      windDirectionDeg:
        typeof props?.windDirection?.value === "number"
          ? Math.round(props.windDirection.value)
          : undefined,
      historyTrend,
      cbibsAnnapolis,
      thomasPoint,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown NOAA wind error",
        source: "noaa",
        stationId: STATION_ID,
        stationName: STATION_NAME,
      },
      { status: 500 }
    );
  }
}
