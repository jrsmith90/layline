"use client";

import { useEffect, useMemo, useState } from "react";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import { readJsonResponse } from "@/lib/readJsonResponse";
import {
  buildTroubleshootContextCues,
  buildTroubleshootContextSummary,
  type TroubleshootLiveContext,
} from "@/data/logic/troubleshootLogic";

const starterContext: Omit<TroubleshootLiveContext, "sogKt" | "cogDeg"> = {
  currentDirection: "ebb",
  currentSpeedKt: 1.2,
  tideStage: "falling",
  sourceNote:
    "Phone GPS is live when enabled. NOAA KNAK is a river wind reference; current/tide are starter context from the Weather page.",
};

type NoaaWind = {
  source: "noaa";
  stationId: string;
  stationName: string;
  stationUse?: string;
  observedAt?: string;
  description?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  historyTrend?: {
    historyUrl: string;
    sampleSize: number;
    lookbackLabel: string;
    avgWindKt?: number;
    maxGustKt?: number;
    prevailingDirectionDeg?: number;
    speedDeltaKt?: number;
    trend: "building" | "easing" | "steady" | "unknown";
    observations: Array<{
      day: number;
      time: string;
      windText: string;
      windAvgKt?: number;
      windGustKt?: number;
      windDirectionText?: string;
    }>;
  };
  cbibsAnnapolis?: {
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
  thomasPoint?: {
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
    };
  };
  error?: string;
};

type NearbyObservations = {
  source: "ndbc-radial-observations";
  sourceUrl: string;
  fetchedAt: string;
  center: {
    lat: number;
    lon: number;
  };
  radiusNm: number;
  hours: number;
  reportCount: number;
  avgWindKt?: number;
  maxGustKt?: number;
  trends: Array<{
    id: string;
    type: string;
    lat: number;
    lon: number;
    sampleSize: number;
    avgWindKt?: number;
    speedDeltaKt?: number;
    trend: "building" | "easing" | "steady" | "unknown";
  }>;
  reports: Array<{
    id: string;
    type: string;
    observedAt: string;
    lat: number;
    lon: number;
    distanceNm: number;
    windDirectionDeg?: number;
    windAvgKt?: number;
    windGustKt?: number;
    waveHeightFt?: number;
    wavePeriodSec?: number;
  }>;
  error?: string;
};

const toneClasses = {
  neutral: "border-white/10 bg-black/20",
  good: "border-emerald-400/30 bg-emerald-400/10",
  warning: "border-amber-300/35 bg-amber-300/10",
  danger: "border-red-400/40 bg-red-400/10",
};

function formatStatus(context: TroubleshootLiveContext) {
  const windStatus =
    typeof context.windAvgKt === "number" ? "Wind feed available" : "Wind feed pending";
  const gpsStatus = typeof context.sogKt === "number" ? "GPS live" : "GPS off";

  return `${gpsStatus} · ${windStatus}`;
}

function formatKt(value?: number) {
  return typeof value === "number" ? `${value.toFixed(1)} kt` : "--";
}

function formatDeg(value?: number) {
  return typeof value === "number" ? `${Math.round(value)} deg` : "--";
}

function getTrendGuidance(trend?: NoaaWind["historyTrend"]) {
  if (!trend) return "Trend unavailable from NOAA history right now.";

  if (trend.trend === "building") {
    return "Building trend: expect heavier loads soon. Favor depower, wider grooves, and conservative spinnaker settings.";
  }

  if (trend.trend === "easing") {
    return "Easing trend: be ready to add power back, keep flow attached, and avoid leaving sails too flat.";
  }

  if (trend.trend === "steady") {
    return "Steady trend: current trim changes should be easier to validate against SOG and nearby boats.";
  }

  return "Trend is unclear, so trust the latest observation and on-water visual pressure.";
}

function getBuoyGuidance(buoy?: NoaaWind["cbibsAnnapolis"]) {
  if (!buoy) return "Annapolis buoy data is unavailable right now.";

  const waveHeight = buoy.waveHeightFt ?? 0;
  const gustSpread =
    typeof buoy.windAvgKt === "number" && typeof buoy.windGustKt === "number"
      ? buoy.windGustKt - buoy.windAvgKt
      : null;

  if (waveHeight >= 1.2 && gustSpread != null && gustSpread >= 4) {
    return "Buoy shows chop and gust spread: favor fast mode, wider grooves, and conservative spinnaker trim.";
  }

  if (waveHeight >= 1.2) {
    return "Buoy wave height is meaningful for the river mouth: avoid pinching and keep the boat powered through chop.";
  }

  if (gustSpread != null && gustSpread >= 4) {
    return "Buoy gust spread is meaningful: keep main and spinnaker releases ready.";
  }

  return "Buoy context looks manageable; use it to validate whether local water state matches what you see on course.";
}

function getThomasPointGuidance(source?: NoaaWind["thomasPoint"]) {
  if (!source) return "Thomas Point data is unavailable right now.";

  const wind = source.windAvgKt ?? 0;
  const gustSpread =
    typeof source.windAvgKt === "number" && typeof source.windGustKt === "number"
      ? source.windGustKt - source.windAvgKt
      : null;

  if (wind >= 16) {
    return "Thomas Point is showing open-Bay breeze: favor depower, lane control, and conservative kite handling.";
  }

  if (gustSpread != null && gustSpread >= 5) {
    return "Thomas Point gust spread is meaningful: keep main and spinnaker releases active.";
  }

  return "Thomas Point is a useful bay truth source; compare it against the river and Severn-mouth reads before choosing mode.";
}

export function TroubleshootLiveContextPanel() {
  const gps = usePhoneGps();
  const [noaaWind, setNoaaWind] = useState<NoaaWind | null>(null);
  const [shipReports, setShipReports] = useState<NearbyObservations | null>(null);
  const [windLoading, setWindLoading] = useState(true);
  const [windError, setWindError] = useState<string | null>(null);
  const [shipReportsLoading, setShipReportsLoading] = useState(false);
  const [shipReportsError, setShipReportsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNoaaWind() {
      try {
        setWindLoading(true);
        setWindError(null);

        const response = await fetch("/api/weather/noaa-wind", {
          cache: "no-store",
        });
        const data = await readJsonResponse<NoaaWind>(response);

        if (cancelled) return;

        if (!response.ok || data.error) {
          setWindError(data.error ?? "NOAA wind feed unavailable.");
          setNoaaWind(null);
          return;
        }

        setNoaaWind(data);
      } catch (error) {
        if (!cancelled) {
          setWindError(
            error instanceof Error ? error.message : "NOAA wind feed unavailable."
          );
          setNoaaWind(null);
        }
      } finally {
        if (!cancelled) setWindLoading(false);
      }
    }

    loadNoaaWind();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gps.lat == null || gps.lon == null) {
      setShipReports(null);
      setShipReportsError(null);
      setShipReportsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadShipReports() {
      try {
        setShipReportsLoading(true);
        setShipReportsError(null);

        const params = new URLSearchParams({
          lat: String(gps.lat),
          lon: String(gps.lon),
          radiusNm: "5",
          hours: "6",
        });
        const response = await fetch(`/api/weather/ship-reports?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await readJsonResponse<NearbyObservations>(response);

        if (cancelled) return;

        if (!response.ok || data.error) {
          setShipReportsError(data.error ?? "NDBC observations unavailable.");
          setShipReports(null);
          return;
        }

        setShipReports(data);
      } catch (error) {
        if (!cancelled) {
          setShipReportsError(
            error instanceof Error
              ? error.message
              : "NDBC observations unavailable."
          );
          setShipReports(null);
        }
      } finally {
        if (!cancelled) setShipReportsLoading(false);
      }
    }

    loadShipReports();

    return () => {
      cancelled = true;
    };
  }, [gps.lat, gps.lon]);

  const context = useMemo<TroubleshootLiveContext>(() => {
    const sogKt = gps.sogMps == null ? undefined : gps.sogMps * 1.943844;

    return {
      ...starterContext,
      windAvgKt:
        noaaWind?.thomasPoint?.windAvgKt ??
        noaaWind?.cbibsAnnapolis?.windAvgKt ??
        noaaWind?.windAvgKt,
      windGustKt:
        noaaWind?.thomasPoint?.windGustKt ??
        noaaWind?.cbibsAnnapolis?.windGustKt ??
        noaaWind?.windGustKt,
      windDirectionDeg:
        noaaWind?.thomasPoint?.windDirectionDeg ??
        noaaWind?.cbibsAnnapolis?.windDirectionDeg ??
        noaaWind?.windDirectionDeg,
      sogKt,
      cogDeg: gps.cogDeg ?? undefined,
    };
  }, [gps.cogDeg, gps.sogMps, noaaWind]);

  const cues = buildTroubleshootContextCues(context);
  const summary = buildTroubleshootContextSummary(context);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Live context
          </div>
          <h2 className="mt-1 text-lg font-bold">Wind, Water, and Speed Check</h2>
          <p className="mt-1 text-xs leading-5 opacity-60">
            Wind source:{" "}
            {noaaWind?.thomasPoint?.stationName ??
              noaaWind?.cbibsAnnapolis?.platformName ??
              noaaWind?.stationName ??
              "NOAA KNAK"}{" "}
            {noaaWind?.thomasPoint?.observedAt
              ? `· observed ${new Date(noaaWind.thomasPoint.observedAt).toLocaleTimeString()}`
              : noaaWind?.cbibsAnnapolis?.observedAt
              ? `· observed ${noaaWind.cbibsAnnapolis.observedAt}`
              : noaaWind?.observedAt
                ? `· observed ${new Date(noaaWind.observedAt).toLocaleTimeString()}`
              : ""}
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold opacity-80">
          {windLoading ? "Loading wind..." : formatStatus(context)}
        </div>
      </div>

      <p className="text-sm leading-6 opacity-85">{summary}</p>

      <div className="grid gap-3 md:grid-cols-2">
        {cues.map((cue) => (
          <div
            key={cue.label}
            className={`rounded-xl border p-4 ${toneClasses[cue.tone]}`}
          >
            <div className="text-xs uppercase tracking-wide opacity-60">
              {cue.label}
            </div>
            <div className="mt-1 text-base font-bold">{cue.value}</div>
            <p className="mt-2 text-sm leading-6 opacity-80">{cue.guidance}</p>
          </div>
        ))}
      </div>

      {windError && (
        <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-sm leading-6 opacity-85">
          NOAA wind is unavailable right now: {windError}
        </div>
      )}

      {noaaWind?.stationUse && (
        <div className="rounded-xl border border-blue-300/25 bg-blue-300/10 p-3 text-sm leading-6 opacity-85">
          {noaaWind.stationUse}
        </div>
      )}

      {noaaWind?.thomasPoint && (
        <div className="rounded-xl border border-sky-300/30 bg-sky-300/10 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60">
                Thomas Point
              </div>
              <div className="mt-1 text-base font-bold">
                {noaaWind.thomasPoint.stationName}
              </div>
              <p className="mt-1 text-xs leading-5 opacity-60">
                {noaaWind.thomasPoint.locationName}
              </p>
            </div>
            <div className="text-xs leading-5 opacity-60">
              {noaaWind.thomasPoint.stationId}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Bay Wind
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatKt(noaaWind.thomasPoint.windAvgKt)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Bay Gust
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatKt(noaaWind.thomasPoint.windGustKt)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Direction
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatDeg(noaaWind.thomasPoint.windDirectionDeg)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Trend
              </div>
              <div className="mt-1 text-sm font-bold capitalize">
                {noaaWind.thomasPoint.trend?.trend ?? "--"}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 opacity-80">
            {getThomasPointGuidance(noaaWind.thomasPoint)}
          </p>
          <p className="mt-2 text-xs leading-5 opacity-60">
            {noaaWind.thomasPoint.stationUse}
          </p>
        </div>
      )}

      {noaaWind?.cbibsAnnapolis && (
        <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60">
                Annapolis buoy
              </div>
              <div className="mt-1 text-base font-bold">
                {noaaWind.cbibsAnnapolis.platformName}
              </div>
              <p className="mt-1 text-xs leading-5 opacity-60">
                {noaaWind.cbibsAnnapolis.locationName}
              </p>
            </div>
            <div className="text-xs leading-5 opacity-60">
              {noaaWind.cbibsAnnapolis.platformId}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Buoy Wind
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatKt(noaaWind.cbibsAnnapolis.windAvgKt)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Buoy Gust
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatKt(noaaWind.cbibsAnnapolis.windGustKt)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Waves
              </div>
              <div className="mt-1 text-sm font-bold">
                {noaaWind.cbibsAnnapolis.waveHeightFt == null
                  ? "--"
                  : `${noaaWind.cbibsAnnapolis.waveHeightFt.toFixed(2)} ft`}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Period
              </div>
              <div className="mt-1 text-sm font-bold">
                {noaaWind.cbibsAnnapolis.wavePeriodSec == null
                  ? "--"
                  : `${noaaWind.cbibsAnnapolis.wavePeriodSec.toFixed(1)} s`}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 opacity-80">
            {getBuoyGuidance(noaaWind.cbibsAnnapolis)}
          </p>
        </div>
      )}

      {noaaWind?.historyTrend && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60">
                KNAK trend
              </div>
              <div className="mt-1 text-base font-bold capitalize">
                {noaaWind.historyTrend.trend}
              </div>
            </div>
            <div className="text-xs leading-5 opacity-60">
              {noaaWind.historyTrend.lookbackLabel}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Avg
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatKt(noaaWind.historyTrend.avgWindKt)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Max Gust
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatKt(noaaWind.historyTrend.maxGustKt)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Prev Dir
              </div>
              <div className="mt-1 text-sm font-bold">
                {formatDeg(noaaWind.historyTrend.prevailingDirectionDeg)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">
                Delta
              </div>
              <div className="mt-1 text-sm font-bold">
                {noaaWind.historyTrend.speedDeltaKt == null
                  ? "--"
                  : `${noaaWind.historyTrend.speedDeltaKt > 0 ? "+" : ""}${noaaWind.historyTrend.speedDeltaKt.toFixed(1)} kt`}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 opacity-80">
            {getTrendGuidance(noaaWind.historyTrend)}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">
              Nearby observations
            </div>
            <div className="mt-1 text-base font-bold">
              5 nm radius · last 6 hours
            </div>
          </div>
          <div className="text-xs leading-5 opacity-60">
            {shipReportsLoading
              ? "Loading..."
              : shipReports
                ? `${shipReports.reportCount} nearby`
                : "GPS needed"}
          </div>
        </div>

        {gps.lat == null || gps.lon == null ? (
          <p className="mt-3 text-sm leading-6 opacity-80">
            Turn on Phone GPS to filter NDBC radial observations around your
            current position.
          </p>
        ) : shipReportsError ? (
          <p className="mt-3 text-sm leading-6 opacity-80">
            Nearby observations unavailable: {shipReportsError}
          </p>
        ) : shipReports && shipReports.reportCount > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wide opacity-50">
                  Obs
                </div>
                <div className="mt-1 text-sm font-bold">
                  {shipReports.reportCount}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wide opacity-50">
                  Avg Wind
                </div>
                <div className="mt-1 text-sm font-bold">
                  {formatKt(shipReports.avgWindKt)}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wide opacity-50">
                  Max Gust
                </div>
                <div className="mt-1 text-sm font-bold">
                  {formatKt(shipReports.maxGustKt)}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wide opacity-50">
                  Trends
                </div>
                <div className="mt-1 text-sm font-bold">
                  {shipReports.trends.length}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {shipReports.reports.slice(0, 3).map((report) => (
                <div
                  key={`${report.id}-${report.observedAt}-${report.lat}-${report.lon}`}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm leading-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">
                      {report.id} · {report.type}
                    </span>
                    <span className="text-xs opacity-60">
                      {report.distanceNm.toFixed(1)} nm
                    </span>
                  </div>
                  <div className="opacity-80">
                    Wind {formatKt(report.windAvgKt)}
                    {report.windGustKt != null
                      ? ` · gust ${formatKt(report.windGustKt)}`
                      : ""}
                    {report.windDirectionDeg != null
                      ? ` · ${formatDeg(report.windDirectionDeg)}`
                      : ""}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm leading-6 opacity-80">
              {shipReports.trends.length > 0
                ? "Repeated observations from the same station or ship/location are being treated as local trend signals."
                : "No repeated local trend yet; use these as spot checks against the fixed stations."}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 opacity-80">
            No NDBC observations found within 5 nm in the last 6 hours. Fixed
            stations remain the primary read.
          </p>
        )}
      </div>

      <p className="text-xs leading-5 opacity-60">{context.sourceNote}</p>
    </section>
  );
}
