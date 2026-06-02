"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import { AiCoachCard } from "@/components/ai/AiCoachCard";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { WorkflowDisclosure } from "@/components/layout/WorkflowDisclosure";
import { WorkflowQuickLinks } from "@/components/navigation/WorkflowQuickLinks";
import CourseChart from "@/components/race/CourseChart";
import {
  formatCourseLabel,
  getAllCourseIds,
  getCourseData,
} from "@/data/race/getCourseData";
import { buildReviewCoachBrief } from "@/lib/ai/coach";
import {
  formatOpeningLegTypeShort,
  formatOpeningBiasAction,
  formatOpeningBiasConfidence,
} from "@/lib/race/openingBias";
import {
  getLegalityOverallLabel,
  type RaceLegalityOverall,
} from "@/lib/race/legality";
import {
  deleteLog as deleteStoredLog,
  rateLog as rateStoredLog,
  type LaylineLog,
  type Rating,
} from "@/lib/logStore";
import { parseGpxText } from "@/lib/race/gpxImport";
import type { RaceStateSnapshot } from "@/lib/race/state/types";
import {
  selectShiftHeadline,
  selectStartLineHeadline,
} from "@/lib/race/tacticalBoard/selectors";
import type { TacticalBoardSnapshot } from "@/lib/race/tacticalBoard/types";
import { readJsonResponse } from "@/lib/readJsonResponse";
import {
  buildRaceSessionReview,
  archiveRaceSessionOutsideWindow,
  clearSessionTrimLogs,
  deleteRaceSession,
  deleteSessionTrimLog,
  downloadTextFile,
  editRaceSessionTimeRange,
  exportRaceSessionJson,
  getMostRecentRaceSession,
  getRaceSessions,
  importRaceSession,
  reevaluateRaceSession,
  recoverRaceSessionsFromRepository,
  recoverTodayRaceSession,
  subscribeRaceSessionStore,
  updateRaceDecision,
  updateSessionTrimLog,
  type RaceDecisionRecord,
  type RaceWeatherSample,
  type RaceSessionRepositoryRecoveryResult,
} from "@/lib/raceSessionStore";
import type { GpsTrackPoint } from "@/lib/useGpsCourse";

const SessionReplayMap = dynamic(
  () => import("@/components/race/SessionReplayMap"),
  { ssr: false },
);

const IMPORTABLE_COURSE_IDS = getAllCourseIds();

type HistoricalWeatherImportResponse = {
  error?: string;
  samples?: RaceWeatherSample[];
  sources?: {
    topCount: number;
    bottomCount: number;
    riverCount: number;
  };
};

function formatDateTime(iso?: string) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString();
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(decimals)
    : "--";
}

function formatSignedNumber(value: number | null | undefined, decimals = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}`;
}

function formatDuration(startISO: string, endISO: string) {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return "--";
  const totalSeconds = Math.round((endMs - startMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function readDecisionInputString(decision: RaceDecisionRecord, key: string) {
  const value = decision.inputs?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readDecisionInputNumber(decision: RaceDecisionRecord, key: string) {
  const value = decision.inputs?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDecisionInputStringArray(decision: RaceDecisionRecord, key: string) {
  const value = decision.inputs?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

type DecisionTrackWindow = {
  label: string;
  startISO: string;
  endISO: string;
};

function getDecisionTrackWindow(decision: RaceDecisionRecord): DecisionTrackWindow | null {
  const segmentStartAtISO = readDecisionInputString(decision, "segmentStartAtISO");
  const segmentEndAtISO = readDecisionInputString(decision, "segmentEndAtISO");
  if (segmentStartAtISO && segmentEndAtISO) {
    return {
      label: "Segment path",
      startISO: segmentStartAtISO,
      endISO: segmentEndAtISO,
    };
  }

  const autoWindowStartAtISO = readDecisionInputString(decision, "autoWindowStartAtISO");
  const autoWindowEndAtISO = readDecisionInputString(decision, "autoWindowEndAtISO");
  if (autoWindowStartAtISO && autoWindowEndAtISO) {
    return {
      label: "Post-call path",
      startISO: autoWindowStartAtISO,
      endISO: autoWindowEndAtISO,
    };
  }

  return null;
}

function sliceTrackBetween(track: GpsTrackPoint[], startISO: string, endISO: string) {
  return track.filter((point) => point.at >= startISO && point.at <= endISO);
}

type DecisionSegmentMetrics = {
  averageSogKt: number | null;
  deltaSogKt: number | null;
  extraDistancePct: number | null;
  lowSpeedSharePct: number | null;
  headingChurnDeg: number | null;
  likelyManeuverCount: number | null;
  pauseCount: number | null;
  sailedDistanceNm: number | null;
  straightLineDistanceNm: number | null;
};

function getDecisionSegmentMetrics(decision: RaceDecisionRecord): DecisionSegmentMetrics {
  return {
    averageSogKt:
      readDecisionInputNumber(decision, "segmentAverageSogKt") ??
      readDecisionInputNumber(decision, "afterAverageSogKt"),
    deltaSogKt: readDecisionInputNumber(decision, "segmentDeltaSogKt"),
    extraDistancePct:
      readDecisionInputNumber(decision, "segmentExtraDistancePct") ??
      readDecisionInputNumber(decision, "afterExtraDistancePct"),
    lowSpeedSharePct: readDecisionInputNumber(decision, "segmentLowSpeedSharePct"),
    headingChurnDeg:
      readDecisionInputNumber(decision, "segmentHeadingChurnDeg") ??
      readDecisionInputNumber(decision, "afterHeadingChurnDeg"),
    likelyManeuverCount: readDecisionInputNumber(decision, "segmentLikelyManeuverCount"),
    pauseCount: readDecisionInputNumber(decision, "segmentPauseCount"),
    sailedDistanceNm: readDecisionInputNumber(decision, "segmentSailedDistanceNm"),
    straightLineDistanceNm: readDecisionInputNumber(decision, "segmentStraightLineDistanceNm"),
  };
}

function buildDecisionSignals(decision: RaceDecisionRecord) {
  const metrics = getDecisionSegmentMetrics(decision);
  const signals: string[] = [];

  if (decision.outcome === "worse") {
    if ((metrics.extraDistancePct ?? 0) >= 18) {
      signals.push("Extra distance paid");
    }
    if ((metrics.lowSpeedSharePct ?? 0) >= 25) {
      signals.push("Pace stayed below target");
    }
    if ((metrics.headingChurnDeg ?? 0) >= 12) {
      signals.push("Too many course corrections");
    }
    if ((metrics.likelyManeuverCount ?? 0) >= 2) {
      signals.push("Maneuver cost likely mattered");
    }
    if ((metrics.pauseCount ?? 0) >= 1) {
      signals.push("Speed dropped near stop-speed");
    }
  } else if (decision.outcome === "better") {
    if (metrics.extraDistancePct != null && metrics.extraDistancePct <= 10) {
      signals.push("Direct path");
    }
    if (metrics.headingChurnDeg != null && metrics.headingChurnDeg <= 8) {
      signals.push("Stable lane");
    }
    if (metrics.lowSpeedSharePct != null && metrics.lowSpeedSharePct <= 12) {
      signals.push("Speed stayed alive");
    }
    if (metrics.likelyManeuverCount === 0) {
      signals.push("No maneuver tax");
    }
  } else {
    if ((metrics.extraDistancePct ?? 0) >= 20) {
      signals.push("Average pace, expensive path");
    }
    if ((metrics.headingChurnDeg ?? 0) >= 12) {
      signals.push("Neutral pace, unstable course");
    }
    if ((metrics.lowSpeedSharePct ?? 0) >= 25) {
      signals.push("Repeated rebuilds of speed");
    }
  }

  return signals.slice(0, 4);
}

type DecisionMetricTile = {
  label: string;
  value: string;
};

function buildDecisionMetricTiles(
  decision: RaceDecisionRecord,
  windowLabel: string | null,
): DecisionMetricTile[] {
  const metrics = getDecisionSegmentMetrics(decision);
  const tiles: DecisionMetricTile[] = [];

  if (metrics.averageSogKt != null) {
    tiles.push({
      label: windowLabel === "Post-call path" ? "Post-call avg" : "Segment avg",
      value: `${formatNumber(metrics.averageSogKt)} kt`,
    });
  }

  if (metrics.deltaSogKt != null) {
    tiles.push({
      label: "Vs race avg",
      value: `${formatSignedNumber(metrics.deltaSogKt)} kt`,
    });
  }

  if (metrics.extraDistancePct != null) {
    tiles.push({
      label: "Extra distance",
      value: `${formatNumber(metrics.extraDistancePct, 0)}%`,
    });
  }

  if (metrics.headingChurnDeg != null) {
    tiles.push({
      label: "COG churn",
      value: `${formatNumber(metrics.headingChurnDeg, 0)} deg`,
    });
  }

  if (metrics.lowSpeedSharePct != null && tiles.length < 4) {
    tiles.push({
      label: "Slow share",
      value: `${formatNumber(metrics.lowSpeedSharePct, 0)}%`,
    });
  }

  if (metrics.likelyManeuverCount != null && tiles.length < 4) {
    tiles.push({
      label: "Maneuvers",
      value: String(metrics.likelyManeuverCount),
    });
  }

  if (metrics.sailedDistanceNm != null && metrics.straightLineDistanceNm != null && tiles.length < 4) {
    tiles.push({
      label: "Path / direct",
      value: `${formatNumber(metrics.sailedDistanceNm, 2)} / ${formatNumber(metrics.straightLineDistanceNm, 2)} nm`,
    });
  }

  return tiles.slice(0, 4);
}

function distanceNmBetweenGpsPoints(start: GpsTrackPoint, end: GpsTrackPoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusMeters = 6_371_000;
  const phi1 = toRad(start.lat);
  const phi2 = toRad(end.lat);
  const deltaPhi = toRad(end.lat - start.lat);
  const deltaLambda = toRad(end.lon - start.lon);
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (radiusMeters * c) / 1852;
}

function headingDeltaDeg(left: number, right: number) {
  return Math.abs(((right - left + 540) % 360) - 180);
}

function formatCoordinate(
  value: number | null | undefined,
  positiveHemisphere: string,
  negativeHemisphere: string,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${Math.abs(value).toFixed(5)} deg ${value >= 0 ? positiveHemisphere : negativeHemisphere}`;
}

function replayPolyline(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function orderReplayWindow(startISO: string, endISO: string) {
  return startISO.localeCompare(endISO) <= 0
    ? { startISO, endISO }
    : { startISO: endISO, endISO: startISO };
}

function nearestTrackIndex(points: GpsTrackPoint[], atISO: string) {
  const targetMs = new Date(atISO).getTime();
  if (!Number.isFinite(targetMs) || points.length === 0) return 0;

  let nearestIndex = 0;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const pointMs = new Date(points[index].at).getTime();
    if (!Number.isFinite(pointMs)) continue;
    const delta = Math.abs(pointMs - targetMs);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

function nearestWeatherSample(samples: RaceWeatherSample[], atISO?: string | null) {
  if (!atISO || samples.length === 0) return null;
  const targetMs = new Date(atISO).getTime();
  if (!Number.isFinite(targetMs)) return null;

  let nearestSample: RaceWeatherSample | null = null;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (const sample of samples) {
    const sampleMs = new Date(sample.atISO).getTime();
    if (!Number.isFinite(sampleMs)) continue;
    const delta = Math.abs(sampleMs - targetMs);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestSample = sample;
    }
  }

  return nearestSample;
}

function replayWindSummary(sample: RaceWeatherSample | null) {
  if (!sample) return null;

  if (sample.riverWindAvgKt != null || sample.riverWindDirectionDeg != null) {
    return {
      label: "River",
      speedKt: sample.riverWindAvgKt ?? null,
      directionDeg: sample.riverWindDirectionDeg ?? null,
    };
  }

  if (sample.topWindAvgKt != null || sample.topWindDirectionDeg != null) {
    return {
      label: "Top",
      speedKt: sample.topWindAvgKt ?? null,
      directionDeg: sample.topWindDirectionDeg ?? null,
    };
  }

  if (sample.bottomWindAvgKt != null || sample.bottomWindDirectionDeg != null) {
    return {
      label: "Bottom",
      speedKt: sample.bottomWindAvgKt ?? null,
      directionDeg: sample.bottomWindDirectionDeg ?? null,
    };
  }

  return null;
}

function elapsedTrackDistanceNm(points: GpsTrackPoint[], endIndex: number) {
  if (points.length < 2 || endIndex <= 0) return 0;

  let totalDistanceNm = 0;

  for (let index = 1; index <= Math.min(endIndex, points.length - 1); index += 1) {
    totalDistanceNm += distanceNmBetweenGpsPoints(points[index - 1], points[index]);
  }

  return totalDistanceNm;
}

function buildSegmentPreviewGeometry(
  points: GpsTrackPoint[],
  dimensions: { width?: number; height?: number } = {},
) {
  if (points.length < 2) return null;

  const width = dimensions.width ?? 240;
  const height = dimensions.height ?? 132;
  const padding = 12;
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const safeLatSpan = latSpan === 0 ? 0.0001 : latSpan;
  const safeLonSpan = lonSpan === 0 ? 0.0001 : lonSpan;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(availableWidth / safeLonSpan, availableHeight / safeLatSpan);
  const drawnWidth = lonSpan * scale;
  const drawnHeight = latSpan * scale;
  const offsetX = padding + (availableWidth - drawnWidth) / 2;
  const offsetY = padding + (availableHeight - drawnHeight) / 2;

  const projectPoint = (point: GpsTrackPoint) => ({
    x: offsetX + (point.lon - minLon) * scale,
    y: height - offsetY - (point.lat - minLat) * scale,
  });

  const projected = points.map(projectPoint);
  const start = projected[0];
  const end = projected[projected.length - 1];

  return {
    width,
    height,
    start,
    end,
    projected,
    polyline: replayPolyline(projected),
  };
}

function SessionReplayPanel({
  track,
  weatherSamples,
  initialFocusISO,
  hasCourseOverlay,
  onArchiveOutsideWindow,
  onDeleteWindow,
  onRunReevaluation,
}: {
  track: GpsTrackPoint[];
  weatherSamples: RaceWeatherSample[];
  initialFocusISO?: string | null;
  hasCourseOverlay: boolean;
  onArchiveOutsideWindow: (startISO: string, endISO: string) => void;
  onDeleteWindow: (startISO: string, endISO: string) => void;
  onRunReevaluation: () => void;
}) {
  const points = track.filter(
    (point) =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lon) &&
      typeof point.at === "string" &&
      point.at.length > 0,
  );
  const [currentIndex, setCurrentIndex] = useState(() =>
    initialFocusISO ? nearestTrackIndex(points, initialFocusISO) : 0,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 4 | 8>(4);
  const [selectionStartISO, setSelectionStartISO] = useState<string | null>(null);
  const [selectionEndISO, setSelectionEndISO] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlaying || points.length < 2) return;
    const lastIndex = points.length - 1;

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => {
        if (current >= lastIndex) {
          setIsPlaying(false);
          return current;
        }

        const next = Math.min(lastIndex, current + playbackRate);
        if (next >= lastIndex) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, playbackRate, points.length]);

  if (points.length < 2) return null;

  const safeIndex = Math.min(currentIndex, points.length - 1);
  const currentPoint = points[safeIndex] ?? points[0];
  const nearestWeather = nearestWeatherSample(weatherSamples, currentPoint?.at);
  const windSummary = replayWindSummary(nearestWeather);
  const angleToWindDeg =
    currentPoint?.cogDeg != null && windSummary?.directionDeg != null
      ? headingDeltaDeg(currentPoint.cogDeg, windSummary.directionDeg)
      : null;
  const currentSogKt =
    currentPoint?.sogMps == null ? null : currentPoint.sogMps * 1.943844;
  const topBottomSpreadKt =
    nearestWeather?.topWindAvgKt == null || nearestWeather.bottomWindAvgKt == null
      ? null
      : Math.abs(nearestWeather.topWindAvgKt - nearestWeather.bottomWindAvgKt);
  const distanceSailedNm = elapsedTrackDistanceNm(points, safeIndex);
  const selectedWindow =
    selectionStartISO && selectionEndISO
      ? orderReplayWindow(selectionStartISO, selectionEndISO)
      : null;
  const selectionStartIndex =
    selectionStartISO == null ? null : nearestTrackIndex(points, selectionStartISO);
  const selectionEndIndex = selectionEndISO == null ? null : nearestTrackIndex(points, selectionEndISO);
  const selectionMinIndex =
    selectionStartIndex == null || selectionEndIndex == null
      ? null
      : Math.min(selectionStartIndex, selectionEndIndex);
  const selectionMaxIndex =
    selectionStartIndex == null || selectionEndIndex == null
      ? null
      : Math.max(selectionStartIndex, selectionEndIndex);
  const selectionPointCount =
    selectionMinIndex == null || selectionMaxIndex == null
      ? 0
      : selectionMaxIndex - selectionMinIndex + 1;
  const pastTrackPoints = points.slice(0, safeIndex + 1);
  const selectionTrackPoints =
    selectionMinIndex == null || selectionMaxIndex == null
      ? []
      : points.slice(selectionMinIndex, selectionMaxIndex + 1);
  const selectionStartPoint =
    selectionStartIndex == null ? null : points[selectionStartIndex] ?? null;
  const selectionEndPoint = selectionEndIndex == null ? null : points[selectionEndIndex] ?? null;
  const startedAtISO = points[0]?.at;
  const endedAtISO = points[points.length - 1]?.at;

  return (
    <section id="session-replay" className="layline-panel overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">Replay</div>
          <h2 className="mt-1 text-xl font-black">Interactive session replay</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Scrub through the sailed track with time-linked telemetry and weather, closer to the
            Windii-style replay you pointed to.
            {hasCourseOverlay
              ? " The course overlay is also available below in Replay."
              : " Attach a course on import if you want the marks and planned shape overlaid too."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Track points" value={String(points.length)} />
          <Metric
            label="Elapsed"
            value={startedAtISO && currentPoint?.at ? formatDuration(startedAtISO, currentPoint.at) : "--"}
          />
          <Metric label="Replay" value={`${Math.round((safeIndex / Math.max(points.length - 1, 1)) * 100)}%`} />
          <Metric label="Distance" value={`${formatNumber(distanceSailedNm, 2)} nm`} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentIndex((current) => Math.max(0, current - 15))}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
          >
            -15
          </button>
          <button
            type="button"
            onClick={() => {
              if (safeIndex >= points.length - 1) {
                setCurrentIndex(0);
                setIsPlaying(true);
                return;
              }

              setIsPlaying((current) => !current);
            }}
            className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-50"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((current) => Math.min(points.length - 1, current + 15))}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
          >
            +15
          </button>
          {([1, 4, 8] as const).map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className={[
                "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide",
                playbackRate === rate
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50"
                  : "border-white/10 bg-black/20",
              ].join(" ")}
            >
              {rate}x
            </button>
          ))}
        </div>

        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={Math.max(points.length - 1, 0)}
            step={1}
            value={safeIndex}
            onChange={(event) => {
              setCurrentIndex(Number(event.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-cyan-400"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]">
            <span>{formatDateTime(startedAtISO)}</span>
            <span>{currentPoint?.at ? formatDateTime(currentPoint.at) : "--"}</span>
            <span>{formatDateTime(endedAtISO)}</span>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectionStartISO(currentPoint?.at ?? null)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Mark Start Here
            </button>
            <button
              type="button"
              onClick={() => setSelectionEndISO(currentPoint?.at ?? null)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Mark End Here
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectionStartISO(null);
                setSelectionEndISO(null);
              }}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Clear Marks
            </button>
            <button
              type="button"
              disabled={!selectedWindow || selectionPointCount < 2}
              onClick={() => {
                if (!selectedWindow) return;
                onArchiveOutsideWindow(selectedWindow.startISO, selectedWindow.endISO);
              }}
              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Archive Outside Window
            </button>
            <button
              type="button"
              disabled={!selectedWindow || selectionPointCount < 2}
              onClick={() => {
                if (!selectedWindow) return;
                onDeleteWindow(selectedWindow.startISO, selectedWindow.endISO);
              }}
              className="rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Marked Window
            </button>
            <button
              type="button"
              onClick={onRunReevaluation}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-50"
            >
              Run Reevaluation
            </button>
          </div>

          <div className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
            {selectedWindow ? (
              <>
                Selected window: {formatDateTime(selectedWindow.startISO)} to{" "}
                {formatDateTime(selectedWindow.endISO)} ({formatDuration(selectedWindow.startISO, selectedWindow.endISO)} ·{" "}
                {selectionPointCount} pts)
              </>
            ) : (
              "Mark a start and end point on the replay, then archive everything outside that window or delete a middle block."
            )}
            {" "}Run reevaluation after trimming if you want the app to rebuild auto tack detections and refresh the coaching from the kept track.
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="SOG" value={`${formatNumber(currentSogKt)} kt`} />
        <Metric label="COG" value={formatDeg(currentPoint?.cogDeg ?? null)} />
        <Metric
          label={windSummary ? `${windSummary.label} wind` : "Wind"}
          value={windSummary?.speedKt == null ? "--" : `${formatNumber(windSummary.speedKt)} kt`}
        />
        <Metric label="Angle to wind" value={angleToWindDeg == null ? "--" : `${formatNumber(angleToWindDeg, 0)} deg`} />
        <Metric label="Latitude" value={formatCoordinate(currentPoint?.lat, "N", "S")} />
        <Metric label="Longitude" value={formatCoordinate(currentPoint?.lon, "E", "W")} />
        <Metric label="Wind source" value={nearestWeather ? nearestWeather.source.replace(/-/g, " ") : "--"} />
        <Metric label="Top-bottom" value={topBottomSpreadKt == null ? "--" : `${formatNumber(topBottomSpreadKt)} kt`} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[color:var(--divider)] bg-[#bfdfe9]">
        <SessionReplayMap
          track={points}
          pastTrack={pastTrackPoints}
          selectionTrack={selectionTrackPoints}
          currentPoint={currentPoint ?? null}
          selectionStartPoint={selectionStartPoint}
          selectionEndPoint={selectionEndPoint}
        />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-[color:var(--muted)]">
        {nearestWeather
          ? `Weather nearest this point was observed ${formatDateTime(nearestWeather.atISO)}`
          : "No weather sample is attached near this replay point yet."}
        {windSummary?.directionDeg != null ? ` Wind direction was ${formatDeg(windSummary.directionDeg)} from.` : ""}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Start: white</div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">End: teal</div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Live point: amber</div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Sailed so far: pink</div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Trim window: cyan</div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
          Direct progress: dashed
        </div>
      </div>
    </section>
  );
}

function SegmentPreview({
  decision,
  track,
}: {
  decision: RaceDecisionRecord;
  track: GpsTrackPoint[];
}) {
  const window = getDecisionTrackWindow(decision);
  if (!window) return null;

  const points = sliceTrackBetween(track, window.startISO, window.endISO);
  const geometry = buildSegmentPreviewGeometry(points);
  if (!geometry) return null;

  const stroke =
    decision.outcome === "better"
      ? "#2dd4bf"
      : decision.outcome === "worse"
        ? "#f87171"
        : "#f8fafc";

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {window.label}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {formatDuration(window.startISO, window.endISO)}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="mt-3 h-36 w-full rounded-lg border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))]"
      >
        <line
          x1={geometry.start.x}
          y1={geometry.start.y}
          x2={geometry.end.x}
          y2={geometry.end.y}
          stroke="rgba(255,255,255,0.35)"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />
        <polyline
          points={geometry.polyline}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <circle cx={geometry.start.x} cy={geometry.start.y} r="4" fill="#f8fafc" />
        <circle cx={geometry.end.x} cy={geometry.end.y} r="4.5" fill={stroke} />
      </svg>
      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
        Solid line is the sailed path. Dashed line is direct progress from the start of this
        window to the end.
      </p>
    </div>
  );
}

function decisionTone(decision: RaceDecisionRecord) {
  if (decision.outcome === "worse" || decision.userAction === "ignored") {
    return "border-red-400/40 bg-red-400/10";
  }
  if (decision.outcome === "better") return "border-emerald-400/35 bg-emerald-400/10";
  if (decision.outcome === "same") return "border-white/10 bg-white/5";
  return "border-amber-300/35 bg-amber-300/10";
}

function gradeLabel(grade: string) {
  if (grade === "sharp") return "Sharp";
  if (grade === "solid") return "Solid";
  if (grade === "mixed") return "Mixed";
  if (grade === "needs_work") return "Needs work";
  return "Needs ratings";
}

function formatSnapshotCall(call: RaceStateSnapshot["primaryCall"]) {
  return call.replace(/_/g, " ").toUpperCase();
}

function formatSnapshotLeg(snapshot: RaceStateSnapshot) {
  if (snapshot.course.activeLeg) {
    return `${snapshot.course.activeLeg.fromMark} to ${snapshot.course.activeLeg.toMark}`;
  }

  if (snapshot.course.fromMark && snapshot.course.toMark) {
    return `${snapshot.course.fromMark.name} to ${snapshot.course.toMark.name}`;
  }

  return `Leg ${snapshot.course.safeLegIndex + 1}`;
}

function confidenceTone(level: RaceStateSnapshot["confidence"]["overall"]) {
  if (level === "high") {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-50";
  }

  if (level === "medium") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-50";
  }

  if (level === "low") {
    return "border-amber-300/35 bg-amber-300/10 text-amber-50";
  }

  return "border-red-400/35 bg-red-400/10 text-red-100";
}

function legalityTone(level: RaceLegalityOverall | undefined) {
  if (level === "clear") {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-50";
  }

  if (level === "warning") {
    return "border-amber-300/35 bg-amber-300/10 text-amber-50";
  }

  if (level === "violated") {
    return "border-red-400/35 bg-red-400/10 text-red-100";
  }

  return "border-white/15 bg-white/5 text-white/80";
}

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatSignedDeg(value: number | null) {
  if (value == null) return "--";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} deg`;
}

function formatTacticalBoardStatus(
  status: TacticalBoardSnapshot["board"]["readiness"]["status"],
) {
  switch (status) {
    case "ready":
      return "Board ready";
    case "partial":
      return "Partial board";
    default:
      return "Setup needed";
  }
}

function formatTacticalBoardLegMode(
  mode: TacticalBoardSnapshot["liveContext"]["legMode"],
) {
  switch (mode) {
    case "upwind":
      return "Upwind focus";
    case "downwind":
      return "Run focus";
    case "reach":
      return "Reach focus";
    default:
      return "General read";
  }
}

function formatTacticalBoardCurrentWindSource(
  source: TacticalBoardSnapshot["liveContext"]["currentWindSource"],
) {
  switch (source) {
    case "live":
      return "Live feed";
    case "setup":
      return "Setup fallback";
    default:
      return "Missing";
  }
}

function formatTacticalBoardSide(
  value:
    | TacticalBoardSnapshot["board"]["upwind"]["favoredTack"]
    | TacticalBoardSnapshot["board"]["startLine"]["favoredEnd"],
) {
  switch (value) {
    case "starboard":
      return "Starboard";
    case "port":
      return "Port";
    case "even":
      return "Even";
    case "square":
      return "Square";
    default:
      return "Unknown";
  }
}

function buildTacticalBoardThoughts(snapshot: TacticalBoardSnapshot) {
  const thoughts: string[] = [];

  if (snapshot.liveContext.legMode === "upwind") {
    if (snapshot.board.upwind.favoredTack === "even") {
      thoughts.push("The board read the windward leg as centered enough that lane and pressure mattered more than a forced-side bias.");
    } else if (snapshot.board.upwind.favoredTack !== "unknown") {
      thoughts.push(
        `${formatTacticalBoardSide(snapshot.board.upwind.favoredTack)} tack had the cleaner first look on this upwind leg.`,
      );
    }
  } else if (snapshot.liveContext.legMode === "downwind") {
    if (snapshot.board.downwind.dominantReach === "even") {
      thoughts.push("Run geometry looked balanced around the jibe bearing at this moment.");
    } else if (snapshot.board.downwind.dominantReach !== "unknown") {
      thoughts.push(
        `${formatTacticalBoardSide(snapshot.board.downwind.dominantReach)} reach was the cleaner pressure-side setup on the run.`,
      );
    }
  } else if (snapshot.board.startLine.favoredEnd !== "unknown") {
    thoughts.push(selectStartLineHeadline(snapshot.board));
  }

  thoughts.push(selectShiftHeadline(snapshot.board));

  if (snapshot.liveContext.currentWindSource === "setup") {
    thoughts.push("Live wind was missing here, so the board fell back to the saved current-wind setup.");
  } else if (snapshot.liveContext.currentWindSource === "missing") {
    thoughts.push("Current wind was not set yet, so this frame still depended on saved geometry more than live inputs.");
  }

  if (!snapshot.liveContext.usesActiveLegBearing) {
    thoughts.push("Mark geometry in this frame still came from the saved tactical-board setup instead of the active-leg bearing.");
  }

  return thoughts.slice(0, 4);
}

function tacticalBoardSourceDetail(snapshot: TacticalBoardSnapshot) {
  const windCopy =
    snapshot.liveContext.currentWindSource === "live"
      ? `Live wind came from ${snapshot.liveContext.windSourceLabel} in ${snapshot.liveContext.windSourceMode} mode with ${snapshot.liveContext.windFreshness} freshness.`
      : snapshot.liveContext.currentWindSource === "setup"
        ? "Live wind was unavailable, so the board used the saved current-wind setup."
        : "No current-wind source was available for this frame.";
  const geometryCopy = snapshot.liveContext.usesActiveLegBearing
    ? " Active-leg bearing was feeding the board geometry automatically."
    : " Board geometry was still coming from the saved tactical setup.";

  return `${windCopy}${geometryCopy}`;
}

function getTacticalBoardReplayMetrics(snapshot: TacticalBoardSnapshot) {
  if (snapshot.liveContext.legMode === "downwind") {
    return [
      { label: "Jibe", value: formatDeg(snapshot.board.downwind.jibeBearingDeg) },
      { label: "Stbd Gybe", value: formatDeg(snapshot.board.downwind.starboardGybeHeadingDeg) },
      { label: "Port Gybe", value: formatDeg(snapshot.board.downwind.portGybeHeadingDeg) },
      { label: "Reach", value: formatTacticalBoardSide(snapshot.board.downwind.dominantReach) },
    ];
  }

  if (snapshot.liveContext.legMode === "upwind") {
    return [
      { label: "Stbd Tack", value: formatDeg(snapshot.board.upwind.starboardTackHeadingDeg) },
      { label: "Port Tack", value: formatDeg(snapshot.board.upwind.portTackHeadingDeg) },
      { label: "Mark Offset", value: formatSignedDeg(snapshot.board.upwind.windwardMarkOffsetDeg) },
      { label: "Favored Tack", value: formatTacticalBoardSide(snapshot.board.upwind.favoredTack) },
    ];
  }

  return [
    { label: "Shift", value: formatSignedDeg(snapshot.board.shift.deltaDeg) },
    { label: "Bias", value: formatSignedDeg(snapshot.board.startLine.biasDeg) },
    { label: "Favored End", value: formatTacticalBoardSide(snapshot.board.startLine.favoredEnd) },
    { label: "Jibe", value: formatDeg(snapshot.board.downwind.jibeBearingDeg) },
  ];
}

function formatDecisionSourceMode(mode?: string) {
  if (!mode) return "--";
  return mode.replace(/_/g, " ");
}

function logStatusTone(status: LaylineLog["status"]) {
  if (status === "pending") {
    return "border-blue-400/30 bg-blue-400/10 text-blue-100";
  }

  if (status === "unrated") {
    return "border-amber-300/35 bg-amber-300/10 text-amber-50";
  }

  return "border-emerald-400/35 bg-emerald-400/10 text-emerald-50";
}

function formatLogRating(rating?: Rating) {
  if (!rating) return "--";
  if (rating === "better") return "Better";
  if (rating === "same") return "Same";
  return "Worse";
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportSessionTrimLogsToJson(logs: LaylineLog[]) {
  return JSON.stringify(logs, null, 2);
}

function exportSessionTrimLogsToCsv(logs: LaylineLog[]) {
  const header = [
    "id",
    "createdAtISO",
    "updatedAtISO",
    "status",
    "rating",
    "page",
    "sailMode",
    "windDirTrueFromDeg",
    "windSpeedKt",
    "boatMode",
    "symptom",
    "telltales",
    "carBefore",
    "carSuggested",
    "carDelta",
    "cogDeg",
    "sogMps",
    "accuracyM",
    "lat",
    "lon",
    "logicVersion",
    "call",
    "why",
    "next",
    "ifthen",
  ].join(",");

  const rows = logs.map((log) => {
    const gps = log.gps ?? {
      lat: null,
      lon: null,
      cogDeg: null,
      sogMps: null,
      accuracyM: null,
    };

    return [
      escapeCsv(log.id),
      escapeCsv(log.createdAtISO),
      escapeCsv(log.updatedAtISO),
      escapeCsv(log.status),
      escapeCsv(log.rating ?? ""),
      escapeCsv(log.page),
      escapeCsv(log.sailMode),
      escapeCsv(log.windDirTrueFromDeg == null ? "" : String(log.windDirTrueFromDeg)),
      escapeCsv(log.windSpeedKt == null ? "" : String(log.windSpeedKt)),
      escapeCsv(log.boatMode ?? ""),
      escapeCsv(log.symptom),
      escapeCsv(log.telltales),
      escapeCsv(String(log.carBefore)),
      escapeCsv(String(log.carSuggested)),
      escapeCsv(String(log.carDelta)),
      escapeCsv(gps.cogDeg == null ? "" : String(gps.cogDeg)),
      escapeCsv(gps.sogMps == null ? "" : String(gps.sogMps)),
      escapeCsv(gps.accuracyM == null ? "" : String(gps.accuracyM)),
      escapeCsv(gps.lat == null ? "" : String(gps.lat)),
      escapeCsv(gps.lon == null ? "" : String(gps.lon)),
      escapeCsv(log.logicVersion),
      escapeCsv(log.recommendation.call),
      escapeCsv(log.recommendation.why),
      escapeCsv(log.recommendation.next),
      escapeCsv(log.recommendation.ifthen),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

function formatCourseSectionRelevance(value?: string) {
  if (!value) return "--";

  if (value === "local_to_boat") return "Local to boat";
  if (value === "top_of_course") return "Top of course";
  if (value === "bottom_of_course") return "Bottom of course";
  if (value === "river_corridor") return "River corridor";
  if (value === "manual_override") return "Manual override";
  return value.replace(/_/g, " ");
}

function buildRecoveryNotice(
  recovery: RaceSessionRepositoryRecoveryResult,
): { message: string; tone: "info" | "warning" } | null {
  if (recovery.error && recovery.source === "empty") {
    return {
      message: "Shared session recovery failed, and no local race sessions were available.",
      tone: "warning",
    };
  }

  if (recovery.error && recovery.source === "local") {
    return {
      message: "Shared session recovery failed. Review is using this browser's saved race data.",
      tone: "warning",
    };
  }

  if (recovery.source === "shared") {
    return {
      message: "Loaded race sessions from shared storage.",
      tone: "info",
    };
  }

  if (recovery.source === "merged") {
    return {
      message: "Loaded shared race sessions and merged local browser fallback data.",
      tone: "info",
    };
  }

  if (recovery.source === "local") {
    return {
      message: "Shared storage had no race sessions, so review resumed from this browser.",
      tone: "warning",
    };
  }

  return null;
}

function GpxImportPanel({
  onImported,
}: {
  onImported: (sessionId: string, message: string, tone?: "info" | "warning") => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [courseId, setCourseId] = useState("");
  const [attachHistoricalWeather, setAttachHistoricalWeather] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "info" | "warning";
  } | null>(null);
  const [inputKey, setInputKey] = useState(0);

  async function importSelectedFiles() {
    if (files.length === 0 || isImporting) return;

    setIsImporting(true);
    setNotice(null);

    const importedSessionIds: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const parsed = parseGpxText(await file.text(), file.name);
        let weatherSamples: RaceWeatherSample[] = [];
        const warnings = [...parsed.warnings];

        if (attachHistoricalWeather) {
          try {
            const response = await fetch("/api/weather/history", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                startISO: parsed.startedAtISO,
                endISO: parsed.endedAtISO,
              }),
            });
            const payload = await readJsonResponse<HistoricalWeatherImportResponse>(response);

            if (!response.ok) {
              throw new Error(payload.error ?? "Historical weather import failed.");
            }

            weatherSamples = Array.isArray(payload.samples) ? payload.samples : [];

            if (weatherSamples.length === 0) {
              warnings.push(
                "No historical weather observations matched this session's time range.",
              );
            }
          } catch (error) {
            warnings.push(
              error instanceof Error
                ? `Historical weather import failed: ${error.message}`
                : "Historical weather import failed.",
            );
          }
        }

        const imported = importRaceSession({
          fileName: file.name,
          name: parsed.suggestedSessionName,
          gpsTrack: parsed.track,
          startedAtISO: parsed.startedAtISO,
          endedAtISO: parsed.endedAtISO,
          courseId: courseId || undefined,
          weatherSamples,
          warnings,
        });

        importedSessionIds.push(imported.id);
      } catch (error) {
        errors.push(
          `${file.name}: ${
            error instanceof Error ? error.message : "The file could not be imported."
          }`,
        );
      }
    }

    setIsImporting(false);

    if (importedSessionIds.length === 0) {
      setNotice({
        message: errors.join(" "),
        tone: "warning",
      });
      return;
    }

    const importedCount = importedSessionIds.length;
    const message = [
      `Imported ${importedCount} GPX session${importedCount === 1 ? "" : "s"}.`,
      courseId ? `Attached course ${formatCourseLabel(courseId)}.` : "No course attached.",
      attachHistoricalWeather
        ? "Historical weather was attached when observations were available."
        : "Historical weather was skipped.",
      errors.length
        ? `${errors.length} file${errors.length === 1 ? "" : "s"} still failed to import.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const tone = errors.length ? "warning" : "info";

    setNotice({
      message,
      tone,
    });
    setFiles([]);
    setInputKey((current) => current + 1);
    onImported(importedSessionIds[importedSessionIds.length - 1], message, tone);
  }

  return (
    <section className="layline-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            GPX Import
          </div>
          <h2 className="mt-1 text-xl font-black">Import track files into review</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            GPX tracks become ended race sessions with derived COG and SOG. You can also attach a
            course and fetch historical weather for the session timeline.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide">
          {files.length} file{files.length === 1 ? "" : "s"} selected
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <label className="space-y-1">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            GPX files
          </div>
          <input
            key={inputKey}
            type="file"
            accept=".gpx"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-bold"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Optional course
          </div>
          <select
            className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">No course attachment</option>
            {IMPORTABLE_COURSE_IDS.map((candidate) => (
              <option key={candidate} value={candidate} className="bg-slate-900">
                {formatCourseLabel(candidate)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 flex items-start gap-3 rounded-xl border border-[color:var(--divider)] bg-black/20 p-3 text-sm">
        <input
          type="checkbox"
          checked={attachHistoricalWeather}
          onChange={(event) => setAttachHistoricalWeather(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Attach historical weather from official Annapolis, Thomas Point, and KNAK sources when
          those observations are available for the GPX time range.
        </span>
      </label>

      {files.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6">
          {files.map((file) => file.name).join(" · ")}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={importSelectedFiles}
          disabled={files.length === 0 || isImporting}
          className="rounded-xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 px-4 py-3 text-sm font-black uppercase tracking-wide text-teal-50 disabled:opacity-50"
        >
          {isImporting ? "Importing..." : "Import GPX"}
        </button>
        <div className="text-xs text-[color:var(--muted)]">
          Derived sessions keep the track, auto-detect tacks, and can feed the full review screen.
        </div>
      </div>

      {notice && (
        <div
          className={[
            "mt-3 rounded-xl border p-3 text-sm",
            notice.tone === "warning"
              ? "border-amber-300/35 bg-amber-300/10 text-amber-50"
              : "border-cyan-400/30 bg-cyan-400/10 text-cyan-50",
          ].join(" ")}
        >
          {notice.message}
        </div>
      )}
    </section>
  );
}

export default function RaceReviewPage() {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const sessions = getRaceSessions();
  const mostRecent = getMostRecentRaceSession();
  const [selectedId, setSelectedId] = useState(mostRecent?.id ?? "");
  const [logFilter, setLogFilter] = useState<"all" | "pending" | "unrated" | "rated">("all");
  const [recoveryNotice, setRecoveryNotice] = useState<{
    message: string;
    tone: "info" | "warning";
  } | null>(null);
  const effectiveSelectedId = selectedId || mostRecent?.id || "";
  const session =
    sessions.find((candidate) => candidate.id === effectiveSelectedId) ?? mostRecent;
  const review = session ? buildRaceSessionReview(session) : null;
  const reviewCourseData = session?.courseId ? getCourseData(session.courseId) : null;
  const latestRaceStateSnapshot = session?.raceStateSnapshots.at(-1) ?? null;
  const latestTacticalBoardSnapshot = session?.tacticalBoardSnapshots.at(-1) ?? null;
  const [selectedTacticalBoardSnapshotISO, setSelectedTacticalBoardSnapshotISO] = useState("");
  const [replayFocusRequest, setReplayFocusRequest] = useState<{
    sessionId: string;
    atISO: string;
    nonce: number;
  } | null>(null);
  const tacticalBoardReplayFrames =
    session?.tacticalBoardSnapshots
      .slice()
      .sort((left, right) => right.capturedAtISO.localeCompare(left.capturedAtISO)) ?? [];
  const selectedTacticalBoardSnapshot =
    tacticalBoardReplayFrames.find(
      (snapshot) => snapshot.capturedAtISO === selectedTacticalBoardSnapshotISO,
    ) ?? latestTacticalBoardSnapshot;
  const manualNotes = session?.decisions.filter((decision) => decision.kind === "manual") ?? [];
  const trimLogCounts = {
    all: session?.trimLogs.length ?? 0,
    pending: session?.trimLogs.filter((log) => log.status === "pending").length ?? 0,
    unrated: session?.trimLogs.filter((log) => log.status === "unrated").length ?? 0,
    rated: session?.trimLogs.filter((log) => log.status === "rated").length ?? 0,
  };
  const filteredTrimLogs =
    session == null
      ? []
      : logFilter === "all"
        ? session.trimLogs
        : session.trimLogs.filter((log) => log.status === logFilter);
  const reviewCoachBrief = buildReviewCoachBrief(review);

  useEffect(() => subscribeRaceSessionStore(() => refresh()), []);

  useEffect(() => {
    let cancelled = false;

    void recoverRaceSessionsFromRepository().then((recovery) => {
      if (cancelled) return;

      setSelectedId((current) =>
        current &&
        recovery.snapshot.sessions.some((candidate) => candidate.id === current)
          ? current
          : recovery.snapshot.activeSessionId ?? recovery.snapshot.sessions[0]?.id ?? "",
      );
      setRecoveryNotice(buildRecoveryNotice(recovery));
      refresh();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function recoverToday() {
    const recovered = await recoverTodayRaceSession();
    setSelectedId(recovered.session.id);
    setRecoveryNotice(buildRecoveryNotice(recovered.recovery));
    refresh();
  }

  function patchDecision(decisionId: string, patch: Partial<RaceDecisionRecord>) {
    if (!session) return;
    updateRaceDecision(session.id, decisionId, patch);
    refresh();
  }

  function jumpReplayToISO(atISO: string) {
    if (!session) return;

    setReplayFocusRequest((current) => ({
      sessionId: session.id,
      atISO,
      nonce: (current?.nonce ?? 0) + 1,
    }));

    document.getElementById("session-replay")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function archiveOutsideReplayWindow(startISO: string, endISO: string) {
    if (!session) return;

    const confirmed = window.confirm(
      `This will keep only the replay window from ${new Date(startISO).toLocaleString()} to ${new Date(
        endISO,
      ).toLocaleString()} in the current session, archive the time outside that window as separate session segments, and then redo the review coaching. Continue?`,
    );

    if (!confirmed) return;

    try {
      const result = archiveRaceSessionOutsideWindow(session.id, {
        startISO,
        endISO,
      });
      setReplayFocusRequest(null);
      setRecoveryNotice({
        message: `Kept the replay window from ${formatDateTime(result.session.startedAtISO)} to ${formatDateTime(
          result.session.endedAtISO,
        )} and created ${result.archivedSessions.length} archived session${
          result.archivedSessions.length === 1 ? "" : "s"
        } from the outside time.`,
        tone: "info",
      });
      refresh();
    } catch (error) {
      setRecoveryNotice({
        message: error instanceof Error ? error.message : "Archiving outside the replay window failed.",
        tone: "warning",
      });
    }
  }

  function deleteReplayWindow(startISO: string, endISO: string) {
    if (!session) return;

    const confirmed = window.confirm(
      `This will permanently remove the replay window from ${new Date(startISO).toLocaleString()} to ${new Date(
        endISO,
      ).toLocaleString()} from the current session and then redo the review coaching. Continue?`,
    );

    if (!confirmed) return;

    try {
      const updated = editRaceSessionTimeRange(session.id, {
        startISO,
        endISO,
        mode: "delete_window",
      });
      setReplayFocusRequest(null);
      setRecoveryNotice({
        message: `Deleted the window from ${formatDateTime(startISO)} to ${formatDateTime(
          endISO,
        )}. Review coaching was recalculated for the remaining track.`,
        tone: "info",
      });
      setSelectedId(updated.id);
      refresh();
    } catch (error) {
      setRecoveryNotice({
        message: error instanceof Error ? error.message : "Deleting the replay window failed.",
        tone: "warning",
      });
    }
  }

  function runReplayReevaluation() {
    if (!session) return;

    try {
      const result = reevaluateRaceSession(session.id);
      setReplayFocusRequest(null);
      setSelectedId(result.session.id);
      setRecoveryNotice({
        message: `Reevaluation complete. Rebuilt auto tack analysis from ${result.session.gpsTrack.length} track points and found ${result.autoTackRecordCount} likely tack${
          result.autoTackRecordCount === 1 ? "" : "s"
        }. The debrief now reflects the current kept track.`,
        tone: "info",
      });
      refresh();
      document.getElementById("debrief")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      setRecoveryNotice({
        message: error instanceof Error ? error.message : "Reevaluation failed.",
        tone: "warning",
      });
    }
  }

  function removeSession(id: string) {
    deleteRaceSession(id);
    const next = getMostRecentRaceSession();
    setSelectedId(next?.id ?? "");
    refresh();
  }

  function rateSessionLog(logId: string, rating: Rating) {
    if (!session) return;
    updateSessionTrimLog(session.id, logId, {
      rating,
      status: "rated",
      updatedAtISO: new Date().toISOString(),
    });
    rateStoredLog(logId, rating);
    refresh();
  }

  function removeSessionLog(logId: string) {
    if (!session) return;
    deleteSessionTrimLog(session.id, logId);
    deleteStoredLog(logId);
    refresh();
  }

  function clearLogsForSession() {
    if (!session) return;
    clearSessionTrimLogs(session.id);
    refresh();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-16">
      <AppPageHeader
        eyebrow="Post-Race"
        title="Debrief the race."
        badges={["Debrief", "Replay", "Archive"]}
        actions={
          <Link
            href="/race/live"
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
          >
            Race Live
          </Link>
        }
      />

      <WorkflowQuickLinks
        title="Review Flow"
        items={[
          {
            href: "#debrief",
            label: "Debrief",
          },
          {
            href: "#replay",
            label: "Replay",
          },
          {
            href: "#archive",
            label: "Archive",
          },
          {
            href: "/race/live",
            label: "Back to Live",
          },
        ]}
      />

      <section className="layline-panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="space-y-1">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Session
            </div>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={session?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {sessions.length === 0 && <option value="">No sessions yet</option>}
              {sessions.map((candidate) => (
                <option key={candidate.id} value={candidate.id} className="bg-slate-900">
                  {candidate.name} · {formatDateTime(candidate.startedAtISO)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={recoverToday}
            className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 px-4 py-3 text-sm font-black uppercase tracking-wide text-teal-50"
          >
            <RotateCcw size={16} />
            Recover Today
          </button>

          {session && (
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `layline-race-${session.startedAtISO.slice(0, 10)}.json`,
                  exportRaceSessionJson(session),
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>

        {recoveryNotice && (
          <div
            className={[
              "mt-3 rounded-xl border p-3 text-sm",
              recoveryNotice.tone === "warning"
                ? "border-amber-300/35 bg-amber-300/10 text-amber-50"
                : "border-cyan-400/30 bg-cyan-400/10 text-cyan-50",
            ].join(" ")}
          >
            {recoveryNotice.message}
          </div>
        )}
      </section>

      <GpxImportPanel
        onImported={(sessionId, message, tone = "info") => {
          setSelectedId(sessionId);
          setRecoveryNotice({
            message,
            tone,
          });
          refresh();
        }}
      />

      {!session || !review ? (
        <>
          <AiCoachCard brief={reviewCoachBrief} />
          <section className="layline-panel p-5">
            <h2 className="text-xl font-black">No race session yet</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              On the phone you used today, tap Recover Today. For future races, start the Race
              Recorder in the live cockpit before the warning signal.
            </p>
          </section>
        </>
      ) : (
        <>
          <section className="layline-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{session.name}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {formatDateTime(session.startedAtISO)} to {formatDateTime(session.endedAtISO)}
                  {session.courseId ? ` · ${formatCourseLabel(session.courseId)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSession(session.id)}
                className="flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
              <Metric label="Minutes" value={formatNumber(review.durationMin, 0)} />
              <Metric label="GPS" value={String(review.gpsPointCount)} />
              <Metric label="Weather" value={String(review.weatherSampleCount)} />
              <Metric label="Choices" value={String(review.decisionCount)} />
              <Metric label="State" value={String(session.raceStateSnapshots.length)} />
              <Metric label="Board" value={String(session.tacticalBoardSnapshots.length)} />
              <Metric label="Tacks" value={String(session.tackCalibrations.length)} />
              <Metric label="Avg SOG" value={`${formatNumber(review.averageSogKt)} kt`} />
              <Metric label="Max SOG" value={`${formatNumber(review.maxSogKt)} kt`} />
            </div>
          </section>

          <AiCoachCard brief={reviewCoachBrief} />

          {session.openingBias && (
            <section className="layline-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Opening Bias Pick</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    The saved first-leg bias from pre-race.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide">
                  {formatOpeningBiasConfidence(session.openingBias.confidence)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Pick" value={session.openingBias.label} />
                <Metric
                  label="Leg"
                  value={formatOpeningLegTypeShort(session.openingBias.openingLegType)}
                />
                <Metric
                  label="Wind"
                  value={
                    session.openingBias.windDirectionDeg == null
                      ? "--"
                      : `${Math.round(session.openingBias.windDirectionDeg)} deg`
                  }
                />
                <Metric
                  label="Speed"
                  value={
                    session.openingBias.windSpeedKt == null
                      ? "--"
                      : `${session.openingBias.windSpeedKt.toFixed(1)} kt`
                  }
                />
              </div>

              {(session.openingBias.reason || session.openingBias.latestActionLabel) && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {session.openingBias.reason ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6">
                      {session.openingBias.reason}
                    </div>
                  ) : null}
                  {session.openingBias.latestActionLabel ? (
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm leading-6">
                      {formatOpeningBiasAction(session.openingBias.latestAction) ??
                        session.openingBias.latestActionLabel}
                      {session.openingBias.latestReason
                        ? ` · ${session.openingBias.latestReason}`
                        : ""}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}

          <section id="debrief" className="space-y-5 scroll-mt-24">
            <section className="layline-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Decision Score</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Auto-rated against the goal: cross the finish line in the least time.
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 px-4 py-3 text-right">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Overall
                </div>
                <div className="mt-1 text-2xl font-black">
                  {review.decisionScorePct == null ? "--" : `${review.decisionScorePct}%`}
                </div>
                <div className="text-xs font-bold uppercase tracking-wide">
                  {gradeLabel(review.decisionGrade)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Good" value={String(review.goodDecisionCount)} />
              <Metric label="Neutral" value={String(review.neutralDecisionCount)} />
              <Metric label="Bad" value={String(review.badDecisionCount)} />
              <Metric label="Unrated" value={String(review.unratedDecisionCount)} />
            </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <section className="layline-panel p-4">
                <h2 className="text-xl font-black">Coaching Signals</h2>
                <div className="mt-3 grid gap-3">
                  {review.coachingSignals.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                      No coaching signals yet. Keep rating calls so review can stay evidence-driven.
                    </div>
                  ) : (
                    review.coachingSignals.map((signal) => (
                      <div
                        key={signal}
                        className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6"
                      >
                        {signal}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="layline-panel p-4">
                <h2 className="text-xl font-black">Work On Next</h2>
                <div className="mt-3 grid gap-3">
                  {review.workOnNext.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                      No next-step items yet. More rated decisions will sharpen this lane.
                    </div>
                  ) : (
                    review.workOnNext.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-[color:var(--favorable)]/30 bg-[color:var(--favorable)]/10 p-4 text-sm leading-6"
                      >
                        {item}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </section>

            <section className="layline-panel p-4">
              <h2 className="text-xl font-black">Weather and Course Split</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric
                  label="Top-bottom speed"
                  value={`${formatNumber(review.topBottomWindSpreadKt)} kt`}
                />
                <Metric
                  label="Top-bottom dir"
                  value={`${formatNumber(review.topBottomDirectionSpreadDeg, 0)} deg`}
                />
                <Metric label="Building" value={review.buildingWeather ? "Yes" : "No"} />
                <Metric label="Trim logs" value={String(session.trimLogs.length)} />
              </div>
            </section>

            {session.gpsTrack.length >= 2 && (
              <SessionReplayPanel
                key={`${session.id}:${session.startedAtISO}:${session.endedAtISO ?? "active"}:${session.gpsTrack.length}:${
                  replayFocusRequest?.sessionId === session.id ? replayFocusRequest.nonce : "base"
                }`}
                track={session.gpsTrack}
                weatherSamples={session.weatherSamples}
                initialFocusISO={
                  replayFocusRequest?.sessionId === session.id ? replayFocusRequest.atISO : null
                }
                hasCourseOverlay={reviewCourseData != null}
                onArchiveOutsideWindow={archiveOutsideReplayWindow}
                onDeleteWindow={deleteReplayWindow}
                onRunReevaluation={runReplayReevaluation}
              />
            )}

            <section className="layline-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Decision Review</h2>
              <div className="text-xs text-[color:var(--muted)]">
                Auto-rated from recorded calls and GPS pace segments.
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {review.assessedDecisions.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                  No rated decisions yet. Recover GPS data or record the next race from the cockpit.
                </div>
              )}

              {review.assessedDecisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  track={session.gpsTrack}
                  onJumpToReplay={jumpReplayToISO}
                  onPatch={(patch) => patchDecision(decision.id, patch)}
                />
              ))}
            </div>
            </section>
          </section>

          <WorkflowDisclosure
            id="replay"
            badge="Replay"
            title="Saved state and tactical replay"
          >
            <div className="space-y-5">
              <section className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Saved App State</h2>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Latest fused snapshot recorded during the race, loaded directly from the stored session.
                    </p>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    {session.raceStateSnapshots.length} saved snapshot
                    {session.raceStateSnapshots.length === 1 ? "" : "s"}
                  </div>
                </div>

                {!latestRaceStateSnapshot ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                    No fused race-state snapshots were saved for this session.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                          Captured
                        </div>
                        <div className="mt-1 text-lg font-black">
                          {formatDateTime(latestRaceStateSnapshot.capturedAtISO)}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--muted)]">
                          App state generated {formatDateTime(latestRaceStateSnapshot.stateGeneratedAt)}
                        </div>
                      </div>
                      <div
                        className={[
                          "rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide",
                          confidenceTone(latestRaceStateSnapshot.confidence.overall),
                        ].join(" ")}
                      >
                        {latestRaceStateSnapshot.confidence.overall} confidence
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                      <Metric
                        label="Call"
                        value={formatSnapshotCall(latestRaceStateSnapshot.primaryCall)}
                      />
                      <Metric
                        label="Leg"
                        value={formatSnapshotLeg(latestRaceStateSnapshot)}
                      />
                      <Metric
                        label="Wind Source"
                        value={latestRaceStateSnapshot.wind.sourceLabel}
                      />
                      <Metric
                        label="Mode"
                        value={
                          latestRaceStateSnapshot.approachingMark
                            ? "Mark approach"
                            : "Leg tracking"
                        }
                      />
                      <Metric
                        label="Legality"
                        value={
                          latestRaceStateSnapshot.legality
                            ? getLegalityOverallLabel(latestRaceStateSnapshot.legality.overall)
                            : "--"
                        }
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Metric
                        label="GPS Freshness"
                        value={latestRaceStateSnapshot.sources.gps.freshness}
                      />
                      <Metric
                        label="Wind Freshness"
                        value={latestRaceStateSnapshot.sources.wind.freshness}
                      />
                      <Metric
                        label="Dist To Mark"
                        value={
                          latestRaceStateSnapshot.progress?.distanceToMarkNm == null
                            ? "--"
                            : `${formatNumber(
                                latestRaceStateSnapshot.progress.distanceToMarkNm,
                                2,
                              )} nm`
                        }
                      />
                      <Metric
                        label="VMG"
                        value={
                          latestRaceStateSnapshot.progress?.vmgToMarkKt == null
                            ? "--"
                            : `${formatNumber(
                                latestRaceStateSnapshot.progress.vmgToMarkKt,
                                1,
                              )} kt`
                        }
                      />
                    </div>

                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Source detail
                      </div>
                      <div className="mt-2 text-sm leading-6">
                        GPS was {latestRaceStateSnapshot.sources.gps.status} with{" "}
                        {latestRaceStateSnapshot.sources.gps.permission} permission. Wind came from{" "}
                        {latestRaceStateSnapshot.wind.sourceLabel} in{" "}
                        {latestRaceStateSnapshot.wind.sourceMode} mode.
                      </div>
                    </div>

                    {latestRaceStateSnapshot.legality && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                              Legality
                            </div>
                            <div className="mt-2 text-sm leading-6">
                              {latestRaceStateSnapshot.legality.summary}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                              {latestRaceStateSnapshot.legality.detail}
                            </div>
                          </div>
                          <div
                            className={[
                              "rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide",
                              legalityTone(latestRaceStateSnapshot.legality.overall),
                            ].join(" ")}
                          >
                            {getLegalityOverallLabel(latestRaceStateSnapshot.legality.overall)}
                          </div>
                        </div>

                        {latestRaceStateSnapshot.legality.activeConstraints.length > 0 && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {latestRaceStateSnapshot.legality.activeConstraints
                              .slice(0, 4)
                              .map((assessment) => (
                                <div
                                  key={assessment.constraintId}
                                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                                >
                                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
                                    {assessment.headline}
                                  </div>
                                  <div className="mt-2 text-sm leading-6">
                                    {assessment.detail}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {latestRaceStateSnapshot.confidence.signals.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {latestRaceStateSnapshot.confidence.signals
                          .slice(0, 4)
                          .map((signal) => (
                            <div
                              key={signal.key}
                              className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6"
                            >
                              {signal.message}
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Tactical Board Replay</h2>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Replay saved board frames to see what the tactical overlay was signaling during the race.
                    </p>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    {session.tacticalBoardSnapshots.length} saved frame
                    {session.tacticalBoardSnapshots.length === 1 ? "" : "s"}
                  </div>
                </div>

                {!selectedTacticalBoardSnapshot ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                    No tactical-board snapshots were saved for this session.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <label className="space-y-1">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                          Replay frame
                        </div>
                        <select
                          className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
                          value={selectedTacticalBoardSnapshot.capturedAtISO}
                          onChange={(event) =>
                            setSelectedTacticalBoardSnapshotISO(event.target.value)
                          }
                        >
                          {tacticalBoardReplayFrames.map((snapshot) => (
                            <option
                              key={snapshot.capturedAtISO}
                              value={snapshot.capturedAtISO}
                              className="bg-slate-900"
                            >
                              {formatDateTime(snapshot.capturedAtISO)} ·{" "}
                              {snapshot.liveContext.activeLegLabel ??
                                formatTacticalBoardLegMode(snapshot.liveContext.legMode)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div
                        className={[
                          "rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide",
                          confidenceTone(selectedTacticalBoardSnapshot.liveContext.overallConfidence),
                        ].join(" ")}
                      >
                        {selectedTacticalBoardSnapshot.liveContext.overallConfidence} confidence
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Metric
                        label="Status"
                        value={formatTacticalBoardStatus(selectedTacticalBoardSnapshot.board.readiness.status)}
                      />
                      <Metric
                        label="Focus"
                        value={formatTacticalBoardLegMode(selectedTacticalBoardSnapshot.liveContext.legMode)}
                      />
                      <Metric
                        label="Leg"
                        value={selectedTacticalBoardSnapshot.liveContext.activeLegLabel ?? "--"}
                      />
                      <Metric
                        label="Wind Feed"
                        value={formatTacticalBoardCurrentWindSource(
                          selectedTacticalBoardSnapshot.liveContext.currentWindSource,
                        )}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Metric
                        label="Baseline"
                        value={formatDeg(selectedTacticalBoardSnapshot.board.shift.referenceFromDeg)}
                      />
                      <Metric
                        label="Live Wind"
                        value={formatDeg(selectedTacticalBoardSnapshot.board.shift.currentFromDeg)}
                      />
                      {getTacticalBoardReplayMetrics(selectedTacticalBoardSnapshot)
                        .slice(0, 2)
                        .map((metric) => (
                          <Metric key={metric.label} label={metric.label} value={metric.value} />
                        ))}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      {getTacticalBoardReplayMetrics(selectedTacticalBoardSnapshot)
                        .slice(2)
                        .map((metric) => (
                          <Metric key={metric.label} label={metric.label} value={metric.value} />
                        ))}
                      <Metric
                        label="Shift"
                        value={formatSignedDeg(selectedTacticalBoardSnapshot.board.shift.deltaDeg)}
                      />
                      <Metric
                        label="Trend"
                        value={selectedTacticalBoardSnapshot.board.setup.windTrend}
                      />
                    </div>

                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Source detail
                      </div>
                      <div className="mt-2 text-sm leading-6">
                        {tacticalBoardSourceDetail(selectedTacticalBoardSnapshot)}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {buildTacticalBoardThoughts(selectedTacticalBoardSnapshot).map((thought) => (
                        <div
                          key={thought}
                          className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm leading-6"
                        >
                          {thought}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {reviewCourseData && (
                <CourseChart
                  courseData={reviewCourseData}
                  track={session.gpsTrack}
                  title="Course vs sailed track"
                  subtitle="Use the GPS overlay to spot missed laylines, extra distance, and sections sailed away from the planned shape."
                />
              )}
            </div>
          </WorkflowDisclosure>

          <WorkflowDisclosure
            id="archive"
            badge="Archive"
            title="Notes and trim logs"
          >
            <div className="space-y-5">
              <section id="notes" className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4 scroll-mt-24">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Notes</h2>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Cockpit notes now live inside review, so debrief stays in one place.
                    </p>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    {manualNotes.length + (session.crewNotes ? 1 : 0)} saved note
                    {manualNotes.length + (session.crewNotes ? 1 : 0) === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {!session.crewNotes && manualNotes.length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                      No race notes were saved for this session yet. Manual notes from the live recorder
                      will show up here automatically.
                    </p>
                  )}

                  {session.crewNotes && (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Crew note
                      </div>
                      <p className="mt-2 text-sm leading-6">{session.crewNotes}</p>
                    </div>
                  )}

                  {manualNotes.map((note) => (
                    <div key={note.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {formatDateTime(note.atISO)}
                      </div>
                      <h3 className="mt-1 text-sm font-black">{note.label}</h3>
                      <p className="mt-2 text-sm leading-6">{note.recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="logs" className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4 scroll-mt-24">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Trim Logs</h2>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Rate, export, and prune the trim changes attached to this race session.
                    </p>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    {session.trimLogs.length} attached log{session.trimLogs.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {([
                      ["all", "All"],
                      ["unrated", "Unrated"],
                      ["pending", "Pending"],
                      ["rated", "Rated"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLogFilter(value)}
                        className={[
                          "rounded-xl border px-3 py-3 text-sm font-black uppercase tracking-wide transition active:scale-[0.98]",
                          logFilter === value
                            ? "border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 text-teal-50"
                            : "border-[color:var(--divider)] bg-black/20 text-[color:var(--text)]",
                        ].join(" ")}
                      >
                        {label} ({trimLogCounts[value]})
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `layline-trim-logs-${session.startedAtISO.slice(0, 10)}.json`,
                          exportSessionTrimLogsToJson(session.trimLogs),
                        )
                      }
                      className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadTextFile(
                          `layline-trim-logs-${session.startedAtISO.slice(0, 10)}.csv`,
                          exportSessionTrimLogsToCsv(session.trimLogs),
                          "text/csv",
                        )
                      }
                      className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={clearLogsForSession}
                      className="rounded-xl border border-red-400/35 bg-red-400/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-red-100"
                    >
                      Clear Session Logs
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredTrimLogs.length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                      {session.trimLogs.length === 0
                        ? "No trim logs are attached to this session yet. Recover Today on the race phone if you made trim calls."
                        : "No logs match this filter right now."}
                    </p>
                  )}

                  {filteredTrimLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black">{formatDateTime(log.createdAtISO)}</div>
                          <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                            {log.page} · {log.sailMode} · Wind {log.windSpeedKt ?? "--"} kt · Dir{" "}
                            {log.windDirTrueFromDeg ?? "--"} deg
                          </div>
                          <div className="text-xs leading-5 text-[color:var(--muted)]">
                            Symptom {log.symptom} · Telltales {log.telltales}
                            {log.boatMode ? ` · Boat mode ${log.boatMode}` : ""}
                          </div>
                        </div>

                        <div
                          className={[
                            "rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide",
                            logStatusTone(log.status),
                          ].join(" ")}
                        >
                          {log.status}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Metric label="Before" value={String(log.carBefore)} />
                        <Metric label="Suggested" value={String(log.carSuggested)} />
                        <Metric
                          label="Delta"
                          value={`${log.carDelta >= 0 ? "+" : ""}${log.carDelta}`}
                        />
                        <Metric label="Rated" value={formatLogRating(log.rating)} />
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                          Call
                        </div>
                        <div className="mt-2 text-sm leading-6 whitespace-pre-line">
                          {log.recommendation.call}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => rateSessionLog(log.id, "better")}
                          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-50"
                        >
                          Better
                        </button>
                        <button
                          type="button"
                          onClick={() => rateSessionLog(log.id, "same")}
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
                        >
                          Same
                        </button>
                        <button
                          type="button"
                          onClick={() => rateSessionLog(log.id, "worse")}
                          className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
                        >
                          Worse
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSessionLog(log.id)}
                        className="mt-2 w-full rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
                      >
                        Delete Log
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </WorkflowDisclosure>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-black leading-none">{value}</div>
    </div>
  );
}

function DecisionCard({
  decision,
  track,
  onJumpToReplay,
  onPatch,
}: {
  decision: RaceDecisionRecord;
  track: GpsTrackPoint[];
  onJumpToReplay?: (atISO: string) => void;
  onPatch: (patch: Partial<RaceDecisionRecord>) => void;
}) {
  const autoGenerated = decision.inputs?.autoGenerated === true;
  const weatherSource = decision.sourceMeta?.weather;
  const analysisFeedback = readDecisionInputStringArray(decision, "analysisFeedback");
  const decisionSignals = buildDecisionSignals(decision);
  const decisionWindow = getDecisionTrackWindow(decision);
  const metricTiles = buildDecisionMetricTiles(decision, decisionWindow?.label ?? null);
  const hasSegmentContext =
    analysisFeedback.length > 0 || decisionSignals.length > 0 || metricTiles.length > 0 || decisionWindow;
  const feedbackHeading =
    decision.outcome === "better"
      ? "What worked here"
      : decision.outcome === "worse"
        ? "What likely went wrong"
        : "What the track suggests";

  return (
    <div className={`rounded-xl border p-4 ${decisionTone(decision)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            {decision.kind} · {formatDateTime(decision.atISO)}
          </div>
          <h3 className="mt-1 text-base font-black">{decision.label}</h3>
        </div>
        <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
          {decision.userAction ?? "unmarked"} · {decision.outcome ?? "unrated"}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6">{decision.recommendation}</p>
      {decision.coachingNote && (
        <p className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-[color:var(--muted)]">
          {decision.coachingNote}
        </p>
      )}

      {decisionWindow && onJumpToReplay && (
        <button
          type="button"
          onClick={() => onJumpToReplay(decisionWindow.startISO)}
          className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-50"
        >
          Replay this segment
        </button>
      )}

      {hasSegmentContext && (
        <div className="mt-3 space-y-3">
          {decisionSignals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {decisionSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]"
                >
                  {signal}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <SegmentPreview decision={decision} track={track} />

            {metricTiles.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Segment readout
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {metricTiles.map((metric) => (
                    <Metric key={`${metric.label}-${metric.value}`} label={metric.label} value={metric.value} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {analysisFeedback.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                {feedbackHeading}
              </div>
              <div className="mt-3 grid gap-2">
                {analysisFeedback.map((feedback) => (
                  <div
                    key={feedback}
                    className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6"
                  >
                    {feedback}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {weatherSource && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Stored Source Context
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label="Source" value={weatherSource.sourceLabel} />
            <Metric label="Freshness" value={weatherSource.freshness} />
            <Metric label="Confidence" value={weatherSource.confidence} />
            <Metric
              label="Section"
              value={formatCourseSectionRelevance(weatherSource.courseSectionRelevance)}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
            {weatherSource.sourceDetail}
            {weatherSource.sourceObservedAt
              ? ` · observed ${formatDateTime(weatherSource.sourceObservedAt)}`
              : ""}
            {` · ${formatDecisionSourceMode(weatherSource.sourceMode)} mode`}
            {` · status ${weatherSource.status}`}
            {decision.sourceMeta
              ? ` · overall app confidence ${decision.sourceMeta.overallConfidence}`
              : ""}
          </p>
        </div>
      )}

      {autoGenerated ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-[color:var(--muted)]">
          Auto-generated from GPS. No manual rating needed.
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onPatch({ userAction: "followed" })}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Followed
            </button>
            <button
              type="button"
              onClick={() => onPatch({ userAction: "modified" })}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Modified
            </button>
            <button
              type="button"
              onClick={() => onPatch({ userAction: "ignored" })}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Ignored
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onPatch({ outcome: "better" })}
              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-50"
            >
              Better
            </button>
            <button
              type="button"
              onClick={() => onPatch({ outcome: "same" })}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              Same
            </button>
            <button
              type="button"
              onClick={() => onPatch({ outcome: "worse" })}
              className="rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
            >
              Worse
            </button>
          </div>
        </>
      )}
    </div>
  );
}
