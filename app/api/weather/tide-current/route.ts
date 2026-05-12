import { NextRequest, NextResponse } from "next/server";
import { getActiveRaceEvent, raceEvents } from "@/data/race/eventDatabase";

type NoaaPredictionPoint = {
  t?: string;
  v?: string;
  type?: "H" | "L";
};

type NoaaCurrentPoint = {
  Type?: "flood" | "ebb" | "slack";
  meanFloodDir?: number | string;
  meanEbbDir?: number | string;
  Time?: string;
  Velocity_Major?: number | string;
  Bin?: string;
  Depth?: string | null;
};

type CurrentStationConfig = {
  stationId: string;
  label: string;
  lat: number;
  lon: number;
  role: string;
};

const TIDE_STATION = {
  stationId: "8575512",
  label: "Annapolis",
  lat: 38.9833,
  lon: -76.4816,
};

const CURRENT_STATIONS: CurrentStationConfig[] = [
  {
    stationId: "ACT4976",
    label: "Tolly Point",
    lat: 38.9345,
    lon: -76.417,
    role: "Severn mouth / start-area set",
  },
  {
    stationId: "ACT6106",
    label: "Greenbury Point",
    lat: 38.97333,
    lon: -76.41667,
    role: "Northern bay approach",
  },
  {
    stationId: "cb1102",
    label: "Bay Bridge LB91",
    lat: 38.97999954223633,
    lon: -76.38999938964844,
    role: "Open-bay northern channel",
  },
  {
    stationId: "ACT4971",
    label: "Thomas Point SE",
    lat: 38.891,
    lon: -76.427,
    role: "Southern exposed bay water",
  },
  {
    stationId: "ACT4966",
    label: "Thomas Point East",
    lat: 38.89583,
    lon: -76.38683,
    role: "Eastern side pressure/current check",
  },
];

const SNAPSHOT_MINUTES = [
  10 * 60,
  10 * 60 + 30,
  11 * 60,
  11 * 60 + 30,
  12 * 60,
  12 * 60 + 30,
  13 * 60,
  13 * 60 + 30,
  14 * 60,
  14 * 60 + 30,
  15 * 60,
  15 * 60 + 30,
  16 * 60,
  16 * 60 + 30,
  17 * 60,
];

function formatApiDate(date: string) {
  return date.replaceAll("-", "");
}

function defaultRaceDate() {
  const activeEvent = getActiveRaceEvent();
  return activeEvent.dates.split(" to ")[0] ?? new Date().toISOString().slice(0, 10);
}

function getRaceWindow(eventId?: string | null) {
  if (eventId === "2026-scc-ewe-spirit-cup-annapolis-md") {
    return {
      firstWarning: "12:00 PM",
      timeLimit: "4:30 PM",
    };
  }

  return {
    firstWarning: "Race window",
    timeLimit: "See SIs",
  };
}

function parseMinutes(value?: string) {
  if (!value) return null;
  const match = value.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[2]) * 60 + Number(match[3]);
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function displayLocalTime(minutes: number) {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferDirection(velocityKt: number) {
  if (Math.abs(velocityKt) < 0.05) return "slack";
  return velocityKt > 0 ? "flood" : "ebb";
}

function strengthFor(speedKt: number) {
  if (speedKt < 0.75) return "weak";
  if (speedKt < 1.5) return "moderate";
  return "strong";
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Layline race planning app / NOAA CO-OPS client",
    },
    next: { revalidate: 5 * 60 },
  });

  if (!response.ok) {
    throw new Error(`NOAA request failed with ${response.status}`);
  }

  return response.json();
}

function interpolateValue(
  points: Array<{ minute: number; value: number }>,
  targetMinute: number,
) {
  if (points.length === 0) return null;
  const sorted = points.toSorted((a, b) => a.minute - b.minute);
  const exact = sorted.find((point) => point.minute === targetMinute);
  if (exact) return exact.value;

  const previous = [...sorted].reverse().find((point) => point.minute < targetMinute);
  const next = sorted.find((point) => point.minute > targetMinute);

  if (!previous && !next) return null;
  if (!previous) return next?.value ?? null;
  if (!next) return previous.value;

  const span = next.minute - previous.minute;
  if (span <= 0) return previous.value;
  const ratio = (targetMinute - previous.minute) / span;
  return previous.value + (next.value - previous.value) * ratio;
}

function nearestSlope(
  points: Array<{ minute: number; value: number }>,
  targetMinute: number,
) {
  const sorted = points.toSorted((a, b) => a.minute - b.minute);
  const previous = [...sorted].reverse().find((point) => point.minute <= targetMinute);
  const next = sorted.find((point) => point.minute >= targetMinute);

  if (!previous || !next || previous.minute === next.minute) return 0;
  return next.value - previous.value;
}

function normalizeCurrentPoints(points: NoaaCurrentPoint[]) {
  return points
    .map((point) => {
      const minute = parseMinutes(point.Time);
      const velocity = toNumber(point.Velocity_Major);
      const floodDir = toNumber(point.meanFloodDir);
      const ebbDir = toNumber(point.meanEbbDir);

      if (minute == null || velocity == null) return null;

      return {
        minute,
        velocityKt: velocity,
        floodDirDeg: floodDir,
        ebbDirDeg: ebbDir,
        type: point.Type,
        bin: point.Bin,
        depth: point.Depth,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point != null)
    .toSorted((a, b) => a.minute - b.minute);
}

function buildCurrentSnapshot(
  station: CurrentStationConfig,
  points: ReturnType<typeof normalizeCurrentPoints>,
  targetMinute: number,
) {
  const velocity = interpolateValue(
    points.map((point) => ({ minute: point.minute, value: point.velocityKt })),
    targetMinute,
  );
  const nearestPoint =
    points.find((point) => point.minute >= targetMinute) ?? points[points.length - 1];
  const speedKt = Math.abs(velocity ?? 0);
  const direction = velocity == null ? "unknown" : inferDirection(velocity);
  const directionDeg =
    direction === "flood"
      ? nearestPoint?.floodDirDeg
      : direction === "ebb"
        ? nearestPoint?.ebbDirDeg
        : null;
  const nextSlack = points.find(
    (point) => point.minute > targetMinute && Math.abs(point.velocityKt) < 0.05,
  );

  return {
    stationId: station.stationId,
    label: station.label,
    lat: station.lat,
    lon: station.lon,
    role: station.role,
    time: formatMinutes(targetMinute),
    displayTime: displayLocalTime(targetMinute),
    direction,
    directionDeg,
    speedKt: Number(speedKt.toFixed(2)),
    signedVelocityKt: velocity == null ? null : Number(velocity.toFixed(2)),
    strength: strengthFor(speedKt),
    nextSlackTime: nextSlack ? displayLocalTime(nextSlack.minute) : null,
    source: nearestPoint?.type ? "NOAA max/slack prediction interpolated" : "NOAA interval prediction",
  };
}

async function fetchTide(date: string, targetMinute: number) {
  const apiDate = formatApiDate(date);
  const baseParams = new URLSearchParams({
    product: "predictions",
    application: "layline",
    begin_date: apiDate,
    end_date: apiDate,
    datum: "MLLW",
    station: TIDE_STATION.stationId,
    time_zone: "lst_ldt",
    units: "english",
    format: "json",
  });

  const [seriesData, hiloData] = await Promise.all([
    fetchJson(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${baseParams}&interval=6`),
    fetchJson(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${baseParams}&interval=hilo`),
  ]);

  const series = ((seriesData.predictions ?? []) as NoaaPredictionPoint[])
    .map((point) => {
      const minute = parseMinutes(point.t);
      const height = toNumber(point.v);
      return minute == null || height == null ? null : { minute, heightFt: height };
    })
    .filter((point): point is { minute: number; heightFt: number } => point != null);

  const hilo = ((hiloData.predictions ?? []) as NoaaPredictionPoint[])
    .map((point) => {
      const minute = parseMinutes(point.t);
      const height = toNumber(point.v);
      if (minute == null || height == null || !point.type) return null;
      return {
        minute,
        displayTime: displayLocalTime(minute),
        heightFt: Number(height.toFixed(2)),
        type: point.type === "H" ? "high" : "low",
      };
    })
    .filter((point): point is NonNullable<typeof point> => point != null);

  const height = interpolateValue(
    series.map((point) => ({ minute: point.minute, value: point.heightFt })),
    targetMinute,
  );
  const slope = nearestSlope(
    series.map((point) => ({ minute: point.minute, value: point.heightFt })),
    targetMinute,
  );

  return {
    stationId: TIDE_STATION.stationId,
    label: TIDE_STATION.label,
    lat: TIDE_STATION.lat,
    lon: TIDE_STATION.lon,
    time: formatMinutes(targetMinute),
    displayTime: displayLocalTime(targetMinute),
    heightFt: height == null ? null : Number(height.toFixed(2)),
    stage: Math.abs(slope) < 0.01 ? "near slack" : slope > 0 ? "rising" : "falling",
    nextHighTime: hilo.find((point) => point.minute > targetMinute && point.type === "high") ?? null,
    nextLowTime: hilo.find((point) => point.minute > targetMinute && point.type === "low") ?? null,
    hilo,
    series: SNAPSHOT_MINUTES.map((minute) => {
      const value = interpolateValue(
        series.map((point) => ({ minute: point.minute, value: point.heightFt })),
        minute,
      );

      return {
        time: formatMinutes(minute),
        displayTime: displayLocalTime(minute),
        heightFt: value == null ? null : Number(value.toFixed(2)),
      };
    }),
  };
}

async function fetchCurrentStation(station: CurrentStationConfig, date: string) {
  const params = new URLSearchParams({
    product: "currents_predictions",
    application: "layline",
    begin_date: formatApiDate(date),
    end_date: formatApiDate(date),
    station: station.stationId,
    time_zone: "lst_ldt",
    units: "english",
    interval: "30",
    format: "json",
  });
  const data = await fetchJson(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`);
  const points = normalizeCurrentPoints(data.current_predictions?.cp ?? []);

  return {
    station,
    points,
  };
}

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  const event = eventId ? raceEvents.find((candidate) => candidate.id === eventId) : null;
  const date =
    request.nextUrl.searchParams.get("date") ??
    event?.dates.split(" to ")[0] ??
    defaultRaceDate();
  const requestedTime = request.nextUrl.searchParams.get("time");
  const targetMinute = requestedTime
    ? Number(requestedTime.split(":")[0]) * 60 + Number(requestedTime.split(":")[1])
    : 12 * 60;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(targetMinute)) {
    return NextResponse.json(
      { error: "Use date=YYYY-MM-DD and optional time=HH:mm." },
      { status: 400 },
    );
  }

  try {
    const [tide, currentResults] = await Promise.all([
      fetchTide(date, targetMinute),
      Promise.all(CURRENT_STATIONS.map((station) => fetchCurrentStation(station, date))),
    ]);

    const snapshots = SNAPSHOT_MINUTES.map((minute) => ({
      time: formatMinutes(minute),
      displayTime: displayLocalTime(minute),
      tide:
        minute === targetMinute
          ? tide
          : {
              heightFt: tide.series.find((point) => point.time === formatMinutes(minute))?.heightFt ?? null,
            },
      currents: currentResults.map(({ station, points }) =>
        buildCurrentSnapshot(station, points, minute),
      ),
    }));

    return NextResponse.json({
      date,
      eventId: event?.id,
      generatedAt: new Date().toISOString(),
      source: "NOAA CO-OPS predictions and currents_predictions",
      tide,
      currentStations: currentResults.map(({ station, points }) =>
        buildCurrentSnapshot(station, points, targetMinute),
      ),
      snapshots,
      raceWindow: getRaceWindow(eventId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load NOAA tide/current predictions.",
      },
      { status: 502 },
    );
  }
}
