import { NextRequest, NextResponse } from "next/server";

const CONOWINGO_SITE = "01578310";
const DISCHARGE_PARAM = "00060"; // Discharge, cubic feet per second

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
  value: {
    timeSeries: UsgsTimeSeries[];
  };
};

export type DamReleaseLevel = "normal" | "elevated" | "high" | "flood";

export type DamDayStats = {
  date: string;
  avgCfs: number;
  peakCfs: number;
  level: DamReleaseLevel;
  readingsCount: number;
};

export type DamReleasePayload = {
  date: string;
  previousDay: string;
  generatedAt: string;
  source: string;
  stationName: string;
  stationId: string;
  previousDayDischarge: DamDayStats | null;
  raceDayDischarge: DamDayStats | null;
  currentInfluence: {
    level: DamReleaseLevel;
    peakCfs: number;
    note: string;
  };
  error?: string;
};

function classifyDischarge(cfs: number): DamReleaseLevel {
  if (cfs < 30_000) return "normal";
  if (cfs < 80_000) return "elevated";
  if (cfs < 200_000) return "high";
  return "flood";
}

function currentImpactNote(level: DamReleaseLevel, peak: number): string {
  const k = Math.round(peak / 1000);
  switch (level) {
    case "normal":
      return "Standard flow. NOAA harmonic current predictions should be accurate.";
    case "elevated":
      return `${k}k CFS peak yesterday — freshwater pulse arriving. Expect slightly stronger ebb and weaker flood vs NOAA predictions.`;
    case "high":
      return `${k}k CFS peak yesterday — significant release. Ebb likely 10–25% stronger than NOAA predicts. River side advantaged on ebb legs.`;
    case "flood":
      return `${k}k CFS flood release yesterday. Ebb will significantly exceed NOAA predictions. May suppress flood and shift current timing.`;
  }
}

function parseDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function addDays(dateStr: string, days: number): string {
  const dt = parseDateOnly(dateStr);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
    headers: {
      "User-Agent": "Layline race planning app / USGS NWIS client",
    },
    next: { revalidate: 15 * 60 },
  });

  if (!response.ok) {
    throw new Error(`USGS request failed with status ${response.status}`);
  }

  const data: UsgsResponse = await response.json();
  return data.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
}

function parseDischargeValues(values: UsgsValue[]): number[] {
  return values
    .map((v) => {
      const n = Number(v.value);
      // USGS uses -999999 for missing/impaired values
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .filter((n): n is number => n !== null);
}

function statsFor(values: number[], date: string): DamDayStats | null {
  if (values.length === 0) return null;
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const peak = Math.round(Math.max(...values));
  return {
    date,
    avgCfs: avg,
    peakCfs: peak,
    level: classifyDischarge(peak),
    readingsCount: values.length,
  };
}

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Use date=YYYY-MM-DD." }, { status: 400 });
  }

  const previousDay = addDays(dateParam, -1);
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [prevRaw, raceDayRaw] = await Promise.all([
      // Previous day is almost always fetchable (only exception: tomorrow is the first day of record)
      previousDay <= today ? fetchUsgsDischarge(previousDay, previousDay) : Promise.resolve([]),
      // Race day is only fetchable if it's not in the future
      dateParam <= today ? fetchUsgsDischarge(dateParam, dateParam) : Promise.resolve([]),
    ]);

    const prevStats = statsFor(parseDischargeValues(prevRaw), previousDay);
    const raceDayStats = statsFor(parseDischargeValues(raceDayRaw), dateParam);

    // Current influence is driven by previous day's discharge arriving at Annapolis
    const influenceLevel = prevStats?.level ?? "normal";
    const influencePeak = prevStats?.peakCfs ?? 0;

    return NextResponse.json({
      date: dateParam,
      previousDay,
      generatedAt: new Date().toISOString(),
      source: "USGS NWIS Instantaneous Values — Susquehanna River at Conowingo, MD (01578310)",
      stationName: "Susquehanna River at Conowingo, MD",
      stationId: CONOWINGO_SITE,
      previousDayDischarge: prevStats,
      raceDayDischarge: raceDayStats,
      currentInfluence: {
        level: influenceLevel,
        peakCfs: influencePeak,
        note: currentImpactNote(influenceLevel, influencePeak),
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
