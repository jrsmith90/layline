import { gunzipSync } from "zlib";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HistoricalWeatherSample = {
  atISO: string;
  source: "historical-weather";
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

type SourceObservation = {
  atISO: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  waveHeightFt?: number;
  wavePeriodSec?: number;
};

type NwsObservationResponse = {
  features?: Array<{
    properties?: {
      timestamp?: string;
      windSpeed?: {
        unitCode?: string;
        value?: number | null;
      };
      windGust?: {
        unitCode?: string;
        value?: number | null;
      };
      windDirection?: {
        value?: number | null;
      };
    };
  }>;
};

type CbibsQueryResponse = {
  stations?: Array<{
    variable?: Array<{
      reportName?: string;
      actualName?: string;
      units?: string;
      measurements?: Array<{
        time?: string;
        value?: number | null;
      }>;
    }>;
  }>;
};

const KNAK_HISTORY_URL = "https://api.weather.gov/stations/KNAK/observations";
const CBIBS_QUERY_URL = "https://mw.buoybay.noaa.gov/api/v1/json/query/AN";
const THOMAS_POINT_REALTIME_URL = "https://www.ndbc.noaa.gov/data/realtime2/TPLM2.txt";
const CBIBS_TESTING_KEY =
  process.env.CBIBS_API_KEY ?? "f159959c117f473477edbdf3245cc2a4831ac61f";
const MONTH_DIRS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function metersPerSecondToKt(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Number((value * 1.943844).toFixed(1));
}

function kilometersPerHourToKt(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Number((value * 0.539957).toFixed(1));
}

function metersToFeet(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Number((value * 3.28084).toFixed(1));
}

function parseJsonDate(value: string | undefined) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function monthCode(monthIndex: number) {
  if (monthIndex < 9) return String(monthIndex + 1);
  if (monthIndex === 9) return "a";
  if (monthIndex === 10) return "b";
  return "c";
}

function enumerateMonthStarts(start: Date, end: Date) {
  const months: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor.getTime() <= endMonth.getTime()) {
    months.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickNearestObservation(
  observations: SourceObservation[],
  atMs: number,
  maxDeltaMs: number,
) {
  let nearest: SourceObservation | null = null;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (const observation of observations) {
    const observationMs = parseJsonDate(observation.atISO);
    if (observationMs == null) continue;
    const delta = Math.abs(observationMs - atMs);
    if (delta > maxDeltaMs || delta >= nearestDelta) continue;
    nearest = observation;
    nearestDelta = delta;
  }

  return nearest;
}

function sourceAverageKt(observation: SourceObservation | null) {
  if (!observation) return null;
  return observation.windAvgKt ?? observation.windGustKt ?? null;
}

function sortObservations(observations: SourceObservation[]) {
  return observations
    .slice()
    .sort((left, right) => left.atISO.localeCompare(right.atISO));
}

function formatCbibsIso(iso: string) {
  return iso.replace(".000Z", "z").replace("Z", "z");
}

async function fetchNwsRiverObservations(startISO: string, endISO: string) {
  const url = new URL(KNAK_HISTORY_URL);
  url.searchParams.set("start", startISO);
  url.searchParams.set("end", endISO);
  url.searchParams.set("limit", "1000");

  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "Layline sailing tactics app (historical import)",
    },
    cache: "no-store",
  });

  if (!response.ok) return [] as SourceObservation[];

  const payload = (await response.json()) as NwsObservationResponse;

  const observations: SourceObservation[] = (payload.features ?? [])
    .map<SourceObservation | null>((feature) => {
      const properties = feature.properties;
      const atISO = properties?.timestamp;
      if (!atISO) return null;

      const windSpeed =
        properties.windSpeed?.unitCode === "wmoUnit:km_h-1"
          ? kilometersPerHourToKt(properties.windSpeed.value)
          : metersPerSecondToKt(properties.windSpeed?.value);
      const windGust =
        properties.windGust?.unitCode === "wmoUnit:km_h-1"
          ? kilometersPerHourToKt(properties.windGust.value)
          : metersPerSecondToKt(properties.windGust?.value);

      return {
        atISO,
        windAvgKt: windSpeed ?? undefined,
        windGustKt: windGust ?? undefined,
        windDirectionDeg:
          typeof properties.windDirection?.value === "number"
            ? Math.round(properties.windDirection.value)
            : undefined,
      };
    })
    .filter((item): item is SourceObservation => item != null);

  return sortObservations(observations);
}

function measurementValueByTime(
  measurementSets: Array<{
    reportName?: string;
    actualName?: string;
    units?: string;
    measurements?: Array<{
      time?: string;
      value?: number | null;
    }>;
  }>,
  reportNames: string[],
  actualNames: string[],
) {
  const entry = measurementSets.find(
    (candidate) =>
      (candidate.reportName && reportNames.includes(candidate.reportName)) ||
      (candidate.actualName && actualNames.includes(candidate.actualName)),
  );

  if (!entry) return new Map<string, { value?: number; units?: string }>();

  return new Map(
    (entry.measurements ?? [])
      .filter((measurement) => measurement.time)
      .map((measurement) => [
        measurement.time as string,
        {
          value:
            typeof measurement.value === "number" && Number.isFinite(measurement.value)
              ? measurement.value
              : undefined,
          units: entry.units,
        },
      ]),
  );
}

async function fetchCbibsTopObservations(startISO: string, endISO: string) {
  const url = new URL(CBIBS_QUERY_URL);
  url.searchParams.set("key", CBIBS_TESTING_KEY);
  url.searchParams.set("sd", formatCbibsIso(startISO));
  url.searchParams.set("ed", formatCbibsIso(endISO));
  url.searchParams.set("var", "all");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Layline sailing tactics app (historical import)",
    },
    cache: "no-store",
  });

  if (!response.ok) return [] as SourceObservation[];

  const payload = (await response.json()) as CbibsQueryResponse;
  const variables = payload.stations?.[0]?.variable ?? [];
  const windSpeedByTime = measurementValueByTime(variables, ["Wind Speed"], ["wind_speed"]);
  const windGustByTime = measurementValueByTime(variables, ["Wind Gust"], [
    "wind_speed_of_gust",
  ]);
  const windDirectionByTime = measurementValueByTime(variables, ["Wind Direction"], [
    "wind_from_direction",
  ]);
  const waveHeightByTime = measurementValueByTime(
    variables,
    ["Significant Wave Height"],
    ["sea_surface_wave_significant_height"],
  );
  const wavePeriodByTime = measurementValueByTime(
    variables,
    ["Wave Period"],
    ["sea_surface_wind_wave_period"],
  );
  const times = new Set<string>([
    ...windSpeedByTime.keys(),
    ...windGustByTime.keys(),
    ...windDirectionByTime.keys(),
    ...waveHeightByTime.keys(),
    ...wavePeriodByTime.keys(),
  ]);

  return sortObservations(
    Array.from(times)
      .map((atISO) => {
        const windSpeed = windSpeedByTime.get(atISO);
        const windGust = windGustByTime.get(atISO);
        const windDirection = windDirectionByTime.get(atISO);
        const waveHeight = waveHeightByTime.get(atISO);
        const wavePeriod = wavePeriodByTime.get(atISO);

        return {
          atISO,
          windAvgKt:
            windSpeed?.units === "m/s"
              ? metersPerSecondToKt(windSpeed.value)
              : windSpeed?.value,
          windGustKt:
            windGust?.units === "m/s"
              ? metersPerSecondToKt(windGust.value)
              : windGust?.value,
          windDirectionDeg:
            typeof windDirection?.value === "number"
              ? Math.round(windDirection.value)
              : undefined,
          waveHeightFt:
            waveHeight?.units === "m"
              ? metersToFeet(waveHeight.value)
              : waveHeight?.value,
          wavePeriodSec: wavePeriod?.value,
        } satisfies SourceObservation;
      })
      .filter((observation) => {
        return (
          observation.windAvgKt != null ||
          observation.windGustKt != null ||
          observation.windDirectionDeg != null ||
          observation.waveHeightFt != null ||
          observation.wavePeriodSec != null
        );
      }),
  );
}

function parseNdbcNumber(value: string) {
  if (!value || value === "MM" || value === "999" || value === "99.0") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseThomasPointStandardMet(text: string) {
  return sortObservations(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/))
      .filter((cells) => cells.length >= 18 && /^\d{4}$/.test(cells[0] ?? ""))
      .map((cells) => {
        const [year, month, day, hour, minute] = cells;
        return {
          atISO: `${year}-${month}-${day}T${hour}:${minute}:00Z`,
          windDirectionDeg: parseNdbcNumber(cells[5]),
          windAvgKt: metersPerSecondToKt(parseNdbcNumber(cells[6])),
          windGustKt: metersPerSecondToKt(parseNdbcNumber(cells[7])),
        } satisfies SourceObservation;
      }),
  );
}

async function fetchTextResponse(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/plain,application/gzip,application/x-gzip",
      "User-Agent": "Layline sailing tactics app (historical import)",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const looksGzipped =
      contentType.includes("gzip") ||
      url.endsWith(".gz") ||
      (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b);

    if (looksGzipped) {
      return gunzipSync(bytes).toString("utf8");
    }
  } catch {
    // Fall back to treating the response as plain text.
  }

  return new TextDecoder().decode(bytes);
}

function buildThomasPointUrls(start: Date, end: Date) {
  const now = new Date();
  const urls = new Set<string>();

  for (const monthStart of enumerateMonthStarts(start, end)) {
    const year = monthStart.getUTCFullYear();
    const monthIndex = monthStart.getUTCMonth();
    const monthDir = MONTH_DIRS[monthIndex];

    if (year < now.getUTCFullYear()) {
      urls.add(
        `https://www.ndbc.noaa.gov/download_data.php?filename=tplm2h${year}.txt.gz&dir=data/historical/stdmet/`,
      );
      continue;
    }

    urls.add(`https://www.ndbc.noaa.gov/data/stdmet/${monthDir}/tplm2.txt`);
    urls.add(
      `https://www.ndbc.noaa.gov/download_data.php?filename=tplm2${monthCode(monthIndex)}${year}.txt.gz&dir=data/stdmet/${monthDir}/`,
    );
  }

  if (end.getTime() >= now.getTime() - 45 * 24 * 60 * 60 * 1000) {
    urls.add(THOMAS_POINT_REALTIME_URL);
  }

  return Array.from(urls);
}

async function fetchThomasPointBottomObservations(start: Date, end: Date) {
  const texts = await Promise.all(
    buildThomasPointUrls(start, end).map((url) => fetchTextResponse(url).catch(() => null)),
  );

  const byTime = new Map<string, SourceObservation>();

  texts
    .filter((text): text is string => typeof text === "string" && text.length > 0)
    .flatMap((text) => parseThomasPointStandardMet(text))
    .forEach((observation) => {
      byTime.set(observation.atISO, observation);
    });

  const startMs = start.getTime();
  const endMs = end.getTime();

  return sortObservations(
    Array.from(byTime.values()).filter((observation) => {
      const observedAtMs = parseJsonDate(observation.atISO);
      return observedAtMs != null && observedAtMs >= startMs && observedAtMs <= endMs;
    }),
  );
}

function sampleIntervalMs(start: Date, end: Date) {
  const durationMs = Math.max(0, end.getTime() - start.getTime());

  if (durationMs <= 2 * 60 * 60 * 1000) return 15 * 60 * 1000;
  if (durationMs <= 8 * 60 * 60 * 1000) return 30 * 60 * 1000;
  return 60 * 60 * 1000;
}

function buildSampleTimes(start: Date, end: Date) {
  const intervalMs = sampleIntervalMs(start, end);
  const times: number[] = [];

  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += intervalMs) {
    times.push(cursor);
  }

  if (times[times.length - 1] !== end.getTime()) {
    times.push(end.getTime());
  }

  return times;
}

function buildHistoricalSamples(params: {
  start: Date;
  end: Date;
  top: SourceObservation[];
  bottom: SourceObservation[];
  river: SourceObservation[];
}) {
  const times = buildSampleTimes(params.start, params.end);
  const samples: HistoricalWeatherSample[] = [];
  let previousCompositeWind: number | null = null;

  for (const atMs of times) {
    const top = pickNearestObservation(params.top, atMs, 20 * 60 * 1000);
    const bottom = pickNearestObservation(params.bottom, atMs, 90 * 60 * 1000);
    const river = pickNearestObservation(params.river, atMs, 90 * 60 * 1000);

    if (!top && !bottom && !river) continue;

    const compositeWind = average(
      [sourceAverageKt(top), sourceAverageKt(bottom), sourceAverageKt(river)].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      ),
    );
    const trend =
      compositeWind == null || previousCompositeWind == null
        ? "unknown"
        : compositeWind - previousCompositeWind >= 2
          ? "building"
          : compositeWind - previousCompositeWind <= -2
            ? "easing"
            : "steady";

    if (compositeWind != null) {
      previousCompositeWind = compositeWind;
    }

    samples.push({
      atISO: new Date(atMs).toISOString(),
      source: "historical-weather",
      topWindAvgKt: top?.windAvgKt,
      topWindGustKt: top?.windGustKt,
      topWindDirectionDeg: top?.windDirectionDeg,
      bottomWindAvgKt: bottom?.windAvgKt,
      bottomWindGustKt: bottom?.windGustKt,
      bottomWindDirectionDeg: bottom?.windDirectionDeg,
      riverWindAvgKt: river?.windAvgKt,
      riverWindGustKt: river?.windGustKt,
      riverWindDirectionDeg: river?.windDirectionDeg,
      waveHeightFt: top?.waveHeightFt,
      wavePeriodSec: top?.wavePeriodSec,
      trend,
    });
  }

  return samples;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      startISO?: string;
      endISO?: string;
    };
    const start = new Date(body.startISO ?? "");
    const end = new Date(body.endISO ?? "");

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Valid startISO and endISO are required." },
        { status: 400 },
      );
    }

    if (end.getTime() <= start.getTime()) {
      return NextResponse.json(
        { error: "endISO must be later than startISO." },
        { status: 400 },
      );
    }

    if (end.getTime() - start.getTime() > 10 * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Historical weather import is limited to ranges up to 10 days." },
        { status: 400 },
      );
    }

    const [river, top, bottom] = await Promise.all([
      fetchNwsRiverObservations(start.toISOString(), end.toISOString()).catch(() => []),
      fetchCbibsTopObservations(start.toISOString(), end.toISOString()).catch(() => []),
      fetchThomasPointBottomObservations(start, end).catch(() => []),
    ]);

    const samples = buildHistoricalSamples({
      start,
      end,
      top,
      bottom,
      river,
    });

    return NextResponse.json({
      samples,
      sources: {
        topCount: top.length,
        bottomCount: bottom.length,
        riverCount: river.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Historical weather import failed.",
      },
      { status: 500 },
    );
  }
}
