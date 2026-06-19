import { NextRequest, NextResponse } from "next/server";

const CONOWINGO_SITE = "01578310";
const DISCHARGE_PARAM = "00060"; // Discharge, cubic feet per second

// Conowingo is a run-of-river hydroelectric dam. It releases water daily during
// peak power demand (typically afternoon/evening), creating a predictable spike-and-drop
// cycle. Baseline trickle-through is ~5,500–7,000 CFS. Peaking releases reach 30–80k+ CFS.
// The freshwater pulse travels the Susquehanna (~40 mi to Bay head) in roughly 6–14 hours,
// then disperses into the Bay over another 4–12 hours reaching Annapolis race waters.
const BASELINE_CFS = 7_500; // threshold below which we consider flow "normal/trickle"
const RELEASE_TRIGGER_RATIO = 3.0; // peak must be ≥ 3x baseline to count as a release event
const RELEASE_TRIGGER_ABS = 20_000; // or ≥ this absolute CFS floor

// Approximate travel time from Conowingo to Annapolis race area (hours)
// Faster at higher flows; slower at lower flows.
const TRAVEL_HOURS: Array<{ minCfs: number; minH: number; maxH: number }> = [
  { minCfs: 100_000, minH: 8,  maxH: 14 },
  { minCfs: 50_000,  minH: 10, maxH: 18 },
  { minCfs: 20_000,  minH: 12, maxH: 22 },
  { minCfs: 0,       minH: 16, maxH: 28 },
];

type UsgsValue = {
  value: string;
  qualifiers: string[];
  dateTime: string;
};

type UsgsTimeSeries = {
  variable: { variableDescription: string };
  values: [{ value: UsgsValue[] }];
};

type UsgsResponse = {
  value: { timeSeries: UsgsTimeSeries[] };
};

export type DamReleaseLevel = "normal" | "elevated" | "high" | "flood";

export type ReleaseEvent = {
  detected: boolean;
  // If detected:
  peakCfs: number | null;
  peakTimeLabel: string | null;   // e.g. "7:20 PM"
  baselineCfs: number | null;     // estimated pre-release trickle-through
  spikeMultiple: number | null;   // peak / baseline (e.g. 9.7x)
  dropOffPct: number | null;      // how far it dropped from peak at last reading (0–100%)
  decayStatus: "still_elevated" | "dropping" | "recovered" | null;
  // Estimated window when the pulse reaches Annapolis waters
  arrivalWindowLabel: string | null; // e.g. "3 AM – 11 AM"
  impactWindowLabel: string | null;  // e.g. "7 AM – 3 PM"
};

export type DamReleaseInfluence = {
  level: DamReleaseLevel;
  peakCfs: number;
  note: string;
  releaseEvent: ReleaseEvent;
};

export type DamReleasePayload = {
  date: string;
  previousDay: string;
  generatedAt: string;
  source: string;
  stationName: string;
  stationId: string;
  releaseEvent: ReleaseEvent;
  currentInfluence: DamReleaseInfluence;
  error?: string;
};

function parseDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function addDays(dateStr: string, days: number): string {
  const dt = parseDateOnly(dateStr);
  dt.setDate(dt.getDate() + days);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatLocalTime(isoDateTime: string): string {
  // Parse local clock time from USGS datetime string "2026-06-18T19:20:00.000-04:00"
  const match = isoDateTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  const h24 = Number(match[1]);
  const min = Number(match[2]);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${suffix}`;
}

function addHoursToIso(isoDateTime: string, hours: number): string {
  // Shift an ISO string by N hours and return a human-readable time label
  const date = new Date(isoDateTime);
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  const h24 = date.getUTCHours(); // approximate — good enough for a planning window
  const min = date.getUTCMinutes();
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${suffix}`;
}

function addHoursLabel(isoDateTime: string, minH: number, maxH: number): {
  arrival: string;
  impact: string;
} {
  return {
    arrival: `${addHoursToIso(isoDateTime, minH)} – ${addHoursToIso(isoDateTime, maxH)}`,
    impact:  `${addHoursToIso(isoDateTime, minH + 2)} – ${addHoursToIso(isoDateTime, maxH + 4)}`,
  };
}

function travelTimeFor(peakCfs: number) {
  return TRAVEL_HOURS.find((row) => peakCfs >= row.minCfs) ?? TRAVEL_HOURS[TRAVEL_HOURS.length - 1]!;
}

function classifyDischarge(cfs: number): DamReleaseLevel {
  if (cfs < 30_000)  return "normal";
  if (cfs < 80_000)  return "elevated";
  if (cfs < 200_000) return "high";
  return "flood";
}

function decayStatus(peakCfs: number, latestCfs: number, baselineCfs: number): ReleaseEvent["decayStatus"] {
  const dropFraction = (peakCfs - latestCfs) / Math.max(1, peakCfs - baselineCfs);
  if (dropFraction >= 0.85) return "recovered";
  if (dropFraction >= 0.35) return "dropping";
  return "still_elevated";
}

type TimedReading = { cfs: number; dateTime: string };

function parseTimeSeries(raw: UsgsValue[]): TimedReading[] {
  return raw
    .map((v) => {
      const n = Number(v.value);
      return Number.isFinite(n) && n > 0 ? { cfs: n, dateTime: v.dateTime } : null;
    })
    .filter((v): v is TimedReading => v !== null);
}

function detectReleaseEvent(series: TimedReading[]): ReleaseEvent {
  if (series.length === 0) {
    return {
      detected: false,
      peakCfs: null,
      peakTimeLabel: null,
      baselineCfs: null,
      spikeMultiple: null,
      dropOffPct: null,
      decayStatus: null,
      arrivalWindowLabel: null,
      impactWindowLabel: null,
    };
  }

  // Estimate baseline from low-end readings (bottom 20th percentile), capped at BASELINE_CFS
  const sorted = [...series].sort((a, b) => a.cfs - b.cfs);
  const p20index = Math.max(0, Math.floor(sorted.length * 0.2) - 1);
  const estimatedBaseline = Math.min(BASELINE_CFS, sorted[p20index]?.cfs ?? BASELINE_CFS);

  // Find peak
  const peakReading = series.reduce((best, r) => (r.cfs > best.cfs ? r : best), series[0]!);
  const peakCfs = peakReading.cfs;

  // Check if this qualifies as a release event
  const isRelease =
    peakCfs >= estimatedBaseline * RELEASE_TRIGGER_RATIO &&
    peakCfs >= RELEASE_TRIGGER_ABS;

  if (!isRelease) {
    return {
      detected: false,
      peakCfs,
      peakTimeLabel: formatLocalTime(peakReading.dateTime),
      baselineCfs: estimatedBaseline,
      spikeMultiple: Number((peakCfs / estimatedBaseline).toFixed(1)),
      dropOffPct: null,
      decayStatus: null,
      arrivalWindowLabel: null,
      impactWindowLabel: null,
    };
  }

  // Latest reading (last in series after peak)
  const peakIndex = series.indexOf(peakReading);
  const latestAfterPeak = series.slice(peakIndex).at(-1) ?? peakReading;
  const latestCfs = latestAfterPeak.cfs;

  const dropPct = Math.round(((peakCfs - latestCfs) / peakCfs) * 100);
  const status = decayStatus(peakCfs, latestCfs, estimatedBaseline);

  // Estimate arrival window at Annapolis
  const travel = travelTimeFor(peakCfs);
  const windows = addHoursLabel(peakReading.dateTime, travel.minH, travel.maxH);

  return {
    detected: true,
    peakCfs: Math.round(peakCfs),
    peakTimeLabel: formatLocalTime(peakReading.dateTime),
    baselineCfs: Math.round(estimatedBaseline),
    spikeMultiple: Number((peakCfs / estimatedBaseline).toFixed(1)),
    dropOffPct: dropPct,
    decayStatus: status,
    arrivalWindowLabel: windows.arrival,
    impactWindowLabel: windows.impact,
  };
}

function buildImpactNote(
  release: ReleaseEvent,
  level: DamReleaseLevel,
): string {
  if (!release.detected) {
    if (level === "normal") {
      return "No release event detected. NOAA harmonic current predictions should be accurate.";
    }
    return `Discharge elevated (~${Math.round((release.peakCfs ?? 0) / 1000)}k CFS) but no sharp spike detected. Minor ebb amplification possible.`;
  }

  const k = Math.round((release.peakCfs ?? 0) / 1000);
  const mult = release.spikeMultiple ?? 1;
  const drop = release.dropOffPct ?? 0;
  const decay =
    release.decayStatus === "recovered"
      ? "fully recovered to baseline before race day"
      : release.decayStatus === "dropping"
        ? `dropped ${drop}% from peak`
        : `still elevated at the dam (${drop}% drop so far)`;

  const pulseTiming = release.impactWindowLabel
    ? ` Pulse expected at Annapolis race area roughly ${release.impactWindowLabel}.`
    : "";

  switch (level) {
    case "elevated":
      return `Release event: peaked at ${k}k CFS (${mult}x baseline), ${decay}.${pulseTiming} Expect slightly stronger ebb vs NOAA predictions.`;
    case "high":
      return `Significant release: peaked at ${k}k CFS (${mult}x baseline), ${decay}.${pulseTiming} Ebb likely 10–25% stronger than NOAA predicts. River/shoal side advantaged on ebb legs.`;
    case "flood":
      return `Major flood release: peaked at ${k}k CFS (${mult}x baseline), ${decay}.${pulseTiming} Ebb will significantly exceed NOAA predictions. May suppress flood and shift timing.`;
    default:
      return `Release spike to ${k}k CFS detected, ${decay}. Current impact appears minor.`;
  }
}

async function fetchUsgsDischarge(startDate: string, endDate: string): Promise<UsgsValue[]> {
  const params = new URLSearchParams({
    sites: CONOWINGO_SITE,
    parameterCd: DISCHARGE_PARAM,
    startDT: startDate,
    endDT: endDate,
    format: "json",
    siteStatus: "all",
  });

  const response = await fetch(`https://waterservices.usgs.gov/nwis/iv/?${params}`, {
    headers: { "User-Agent": "Layline race planning app / USGS NWIS client" },
    next: { revalidate: 15 * 60 },
  });

  if (!response.ok) {
    throw new Error(`USGS request failed with status ${response.status}`);
  }

  const data: UsgsResponse = await response.json();
  return data.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
}

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Use date=YYYY-MM-DD." }, { status: 400 });
  }

  const previousDay = addDays(dateParam, -1);
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Fetch previous day + race day in one call so we can see if a release is still tailing off
    const startFetch = previousDay <= today ? previousDay : dateParam;
    const endFetch   = dateParam <= today   ? dateParam   : previousDay;

    const raw = await fetchUsgsDischarge(startFetch, endFetch);
    const allSeries = parseTimeSeries(raw);

    // Split into previous-day and race-day series
    const prevSeries  = allSeries.filter((r) => r.dateTime.startsWith(previousDay));
    const raceSeries  = allSeries.filter((r) => r.dateTime.startsWith(dateParam));

    // Detect release event from the previous day (the one that creates race-day impact)
    const release = detectReleaseEvent(prevSeries);

    // Overall influence level is driven by the previous day's peak
    const prevPeak = prevSeries.reduce((max, r) => Math.max(max, r.cfs), 0);
    const level = classifyDischarge(prevPeak);

    return NextResponse.json({
      date: dateParam,
      previousDay,
      generatedAt: new Date().toISOString(),
      source: "USGS NWIS Instantaneous Values — Susquehanna River at Conowingo, MD (01578310)",
      stationName: "Susquehanna River at Conowingo, MD",
      stationId: CONOWINGO_SITE,
      releaseEvent: release,
      currentInfluence: {
        level,
        peakCfs: Math.round(prevPeak),
        note: buildImpactNote(release, level),
        releaseEvent: release,
      },
    } satisfies DamReleasePayload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Conowingo Dam release data.",
      },
      { status: 502 },
    );
  }
}
