"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, RotateCcw, Waves, ZoomIn, ZoomOut } from "lucide-react";
import { formatCourseLabel, getAllCourseIds, getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";

type CurrentDirection = "flood" | "ebb" | "slack" | "unknown";

type CurrentStationSnapshot = {
  stationId: string;
  label: string;
  lat: number;
  lon: number;
  role: string;
  time: string;
  displayTime: string;
  direction: CurrentDirection;
  directionDeg: number | null;
  speedKt: number;
  signedVelocityKt: number | null;
  strength: "weak" | "moderate" | "strong";
  nextSlackTime: string | null;
  source: string;
};

type TideCurrentSnapshot = {
  time: string;
  displayTime: string;
  tide: {
    heightFt?: number | null;
  };
  currents: CurrentStationSnapshot[];
};

type TideCurrentPayload = {
  date: string;
  eventId?: string;
  generatedAt: string;
  source: string;
  tide: {
    stationId: string;
    label: string;
    lat: number;
    lon: number;
    time: string;
    displayTime: string;
    heightFt: number | null;
    stage: string;
    nextHighTime: { displayTime: string; heightFt: number } | null;
    nextLowTime: { displayTime: string; heightFt: number } | null;
    series: Array<{
      time: string;
      displayTime: string;
      heightFt: number | null;
    }>;
  };
  currentStations: CurrentStationSnapshot[];
  snapshots: TideCurrentSnapshot[];
  raceWindow: {
    firstWarning: string;
    timeLimit: string;
  };
  error?: string;
};

type ChartPoint = {
  lat: number;
  lon: number;
};

type ProjectedPoint = ChartPoint & {
  xNm: number;
  yNm: number;
};

type CoursePoint = ChartPoint & {
  id: string;
  label: string;
  name: string;
};

const WIDTH = 860;
const HEIGHT = 560;
const PADDING = 54;
const courseIds = getAllCourseIds();

const shorelineWest: ChartPoint[] = [
  { lat: 39.02, lon: -76.54 },
  { lat: 38.995, lon: -76.515 },
  { lat: 38.965, lon: -76.505 },
  { lat: 38.95, lon: -76.49 },
  { lat: 38.925, lon: -76.50 },
  { lat: 38.885, lon: -76.49 },
  { lat: 38.835, lon: -76.52 },
];

const shorelineEast: ChartPoint[] = [
  { lat: 39.04, lon: -76.30 },
  { lat: 39.005, lon: -76.29 },
  { lat: 38.965, lon: -76.275 },
  { lat: 38.92, lon: -76.28 },
  { lat: 38.875, lon: -76.305 },
  { lat: 38.835, lon: -76.32 },
];

const channelCenterline: ChartPoint[] = [
  { lat: 39.01, lon: -76.385 },
  { lat: 38.965, lon: -76.389 },
  { lat: 38.925, lon: -76.393 },
  { lat: 38.875, lon: -76.402 },
  { lat: 38.84, lon: -76.413 },
];

const depthSoundings: Array<ChartPoint & { value: number }> = [
  { lat: 39.0, lon: -76.42, value: 22 },
  { lat: 38.985, lon: -76.38, value: 45 },
  { lat: 38.96, lon: -76.43, value: 18 },
  { lat: 38.945, lon: -76.397, value: 53 },
  { lat: 38.93, lon: -76.46, value: 9 },
  { lat: 38.912, lon: -76.426, value: 21 },
  { lat: 38.895, lon: -76.392, value: 38 },
  { lat: 38.875, lon: -76.455, value: 13 },
  { lat: 38.86, lon: -76.37, value: 44 },
  { lat: 38.975, lon: -76.455, value: 7 },
  { lat: 38.905, lon: -76.34, value: 31 },
  { lat: 38.955, lon: -76.335, value: 49 },
];

const shoalContourWest: ChartPoint[] = [
  { lat: 38.995, lon: -76.48 },
  { lat: 38.96, lon: -76.462 },
  { lat: 38.925, lon: -76.468 },
  { lat: 38.888, lon: -76.455 },
];

const shoalContourEast: ChartPoint[] = [
  { lat: 39.0, lon: -76.355 },
  { lat: 38.965, lon: -76.345 },
  { lat: 38.925, lon: -76.35 },
  { lat: 38.875, lon: -76.365 },
];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatKt(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(1)} kt` : "--";
}

function formatHeight(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(2)} ft` : "--";
}

function directionLabel(direction: CurrentDirection) {
  if (direction === "flood") return "Flood";
  if (direction === "ebb") return "Ebb";
  if (direction === "slack") return "Slack";
  return "Unknown";
}

function bearingVector(deg: number, length: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return {
    x: Math.cos(rad) * length,
    y: Math.sin(rad) * length,
  };
}

function getProjectionOrigin(points: ChartPoint[]) {
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);

  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  };
}

function toProjectedPoint(point: ChartPoint, origin: ChartPoint): ProjectedPoint {
  const latRadians = (origin.lat * Math.PI) / 180;

  return {
    ...point,
    xNm: (point.lon - origin.lon) * 60 * Math.cos(latRadians),
    yNm: (point.lat - origin.lat) * 60,
  };
}

function boundsFor(points: ChartPoint[]) {
  const origin = getProjectionOrigin(points);
  const projected = points.map((point) => toProjectedPoint(point, origin));
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const xValues = projected.map((point) => point.xNm);
  const yValues = projected.map((point) => point.yNm);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const rawMinX = Math.min(...xValues);
  const rawMaxX = Math.max(...xValues);
  const rawMinY = Math.min(...yValues);
  const rawMaxY = Math.max(...yValues);
  const xPad = Math.max((rawMaxX - rawMinX) * 0.18, 0.5);
  const yPad = Math.max((rawMaxY - rawMinY) * 0.18, 0.5);
  let minXNm = rawMinX - xPad;
  let maxXNm = rawMaxX + xPad;
  let minYNm = rawMinY - yPad;
  let maxYNm = rawMaxY + yPad;
  const targetAspect = (WIDTH - PADDING * 2) / (HEIGHT - PADDING * 2);
  const xSpan = maxXNm - minXNm || 1;
  const ySpan = maxYNm - minYNm || 1;
  const actualAspect = xSpan / ySpan;

  if (actualAspect > targetAspect) {
    const nextYSpan = xSpan / targetAspect;
    const extraY = (nextYSpan - ySpan) / 2;
    minYNm -= extraY;
    maxYNm += extraY;
  } else {
    const nextXSpan = ySpan * targetAspect;
    const extraX = (nextXSpan - xSpan) / 2;
    minXNm -= extraX;
    maxXNm += extraX;
  }

  return {
    origin,
    minLat,
    maxLat,
    minLon,
    maxLon,
    minXNm,
    maxXNm,
    minYNm,
    maxYNm,
  };
}

function project(point: ChartPoint, bounds: ReturnType<typeof boundsFor>) {
  const plotted = toProjectedPoint(point, bounds.origin);
  const xSpan = bounds.maxXNm - bounds.minXNm || 1;
  const ySpan = bounds.maxYNm - bounds.minYNm || 1;

  return {
    x: PADDING + ((plotted.xNm - bounds.minXNm) / xSpan) * (WIDTH - PADDING * 2),
    y: PADDING + ((bounds.maxYNm - plotted.yNm) / ySpan) * (HEIGHT - PADDING * 2),
  };
}

function pathFor(points: ChartPoint[], bounds: ReturnType<typeof boundsFor>) {
  return points
    .map((point, index) => {
      const plotted = project(point, bounds);
      return `${index === 0 ? "M" : "L"} ${plotted.x.toFixed(1)} ${plotted.y.toFixed(1)}`;
    })
    .join(" ");
}

function formatLat(value: number) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? "N" : "S"}`;
}

function formatLon(value: number) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? "E" : "W"}`;
}

function gridTicks(min: number, max: number, count: number) {
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

function latAtYNm(yNm: number, bounds: ReturnType<typeof boundsFor>) {
  return bounds.origin.lat + yNm / 60;
}

function lonAtXNm(xNm: number, bounds: ReturnType<typeof boundsFor>) {
  const latRadians = (bounds.origin.lat * Math.PI) / 180;
  return bounds.origin.lon + xNm / (60 * Math.cos(latRadians));
}

function zoomedViewBox(
  coursePoints: CoursePoint[],
  bounds: ReturnType<typeof boundsFor>,
  zoomLevel: number,
) {
  if (zoomLevel === 0 || coursePoints.length === 0) {
    return `0 0 ${WIDTH} ${HEIGHT}`;
  }

  const plotted = coursePoints.map((point) => project(point, bounds));
  const minX = Math.min(...plotted.map((point) => point.x));
  const maxX = Math.max(...plotted.map((point) => point.x));
  const minY = Math.min(...plotted.map((point) => point.y));
  const maxY = Math.max(...plotted.map((point) => point.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const scale = zoomLevel === 1 ? 0.66 : 0.42;
  const width = WIDTH * scale;
  const height = HEIGHT * scale;

  return [
    Math.max(0, Math.min(WIDTH - width, centerX - width / 2)).toFixed(1),
    Math.max(0, Math.min(HEIGHT - height, centerY - height / 2)).toFixed(1),
    width.toFixed(1),
    height.toFixed(1),
  ].join(" ");
}

function directionColor(direction: CurrentDirection, speedKt: number) {
  if (direction === "slack" || speedKt < 0.08) return "#d8e0e8";
  if (direction === "flood") return "#38bdf8";
  if (direction === "ebb") return "#f97316";
  return "#a3a3a3";
}

function getSnapshot(payload: TideCurrentPayload | null, index: number) {
  return payload?.snapshots[index] ?? null;
}

function stageFromSeries(
  series: TideCurrentPayload["tide"]["series"] | undefined,
  selectedTime: string | undefined,
  fallback: string | undefined,
) {
  if (!series || !selectedTime) return fallback ?? "--";
  const index = series.findIndex((point) => point.time === selectedTime);
  const previous = index > 0 ? series[index - 1]?.heightFt : null;
  const next = index >= 0 ? series[index + 1]?.heightFt : null;

  if (previous == null || next == null) return fallback ?? "--";
  const slope = next - previous;
  if (Math.abs(slope) < 0.04) return "near slack";
  return slope > 0 ? "rising" : "falling";
}

function averageStationCurrent(stations: CurrentStationSnapshot[]) {
  if (stations.length === 0) return null;
  const sorted = stations.toSorted((a, b) => b.speedKt - a.speedKt);
  return sorted[0] ?? null;
}

function pickScaleBarNm(bounds: ReturnType<typeof boundsFor>) {
  const xSpan = bounds.maxXNm - bounds.minXNm;

  if (xSpan >= 12) return 2;
  if (xSpan >= 6) return 1;
  return 0.5;
}

export default function RaceConditionsMap() {
  const [courseId, setCourseId] = useState<string>(getDefaultCourseId);
  const [payload, setPayload] = useState<TideCurrentPayload | null>(null);
  const [snapshotIndex, setSnapshotIndex] = useState(4);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          date: courseData.raceDate,
          eventId: courseData.eventId,
          time: "12:00",
        });
        const response = await fetch(`/api/weather/tide-current?${params}`);
        const data = (await response.json()) as TideCurrentPayload;

        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Unable to load tide/current data.");
        }

        if (!cancelled) {
          setPayload(data);
          setSnapshotIndex(Math.min(4, Math.max(data.snapshots.length - 1, 0)));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load NOAA data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [courseData.eventId, courseData.raceDate]);

  const coursePoints =
    courseData.course.sequence
      ?.map<CoursePoint | null>((markId) => {
        const mark = courseData.marks[markId];
        return mark
          ? {
              id: String(markId),
              label: String(markId),
              name: mark.name,
              lat: mark.lat,
              lon: mark.lon,
            }
          : null;
      })
      .filter((point): point is CoursePoint => point != null) ?? [];
  const snapshot = getSnapshot(payload, snapshotIndex);
  const currentStations = snapshot?.currents ?? payload?.currentStations ?? [];
  const tidePoint = payload?.tide ? [{ lat: payload.tide.lat, lon: payload.tide.lon }] : [];
  const allPoints = [
    ...coursePoints,
    ...currentStations,
    ...tidePoint,
    ...shorelineWest,
    ...shorelineEast,
    ...channelCenterline,
  ];
  const bounds = boundsFor(allPoints);
  const selectedTideHeight =
    payload?.tide.series.find((point) => point.time === snapshot?.time)?.heightFt ??
    payload?.tide.heightFt ??
    null;
  const selectedTideStage = stageFromSeries(payload?.tide.series, snapshot?.time, payload?.tide.stage);
  const dominantCurrent = averageStationCurrent(currentStations);
  const yGridTicks = gridTicks(bounds.minYNm, bounds.maxYNm, 5);
  const xGridTicks = gridTicks(bounds.minXNm, bounds.maxXNm, 5);
  const mapViewBox = zoomedViewBox(coursePoints, bounds, zoomLevel);
  const scaleBarNm = pickScaleBarNm(bounds);
  const pixelsPerNm = (WIDTH - PADDING * 2) / (bounds.maxXNm - bounds.minXNm || 1);
  const scaleBarWidth = scaleBarNm * pixelsPerNm;

  return (
    <section className="layline-panel overflow-hidden">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="layline-kicker">Race map</div>
              <h2 className="mt-1 text-xl font-black">NOAA-style planning chart</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                NOAA tide and current predictions layered over a chart-style bay map. The view is scaled for pre-race planning.
              </p>
            </div>
            <label className="w-44 space-y-1">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Course
              </span>
              <select
                className="w-full rounded-lg border border-[color:var(--divider)] bg-black/30 p-2 text-sm"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
              >
                {courseIds.map((id) => (
                  <option key={id} value={id} className="bg-slate-900">
                    {formatCourseLabel(id)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-[color:var(--divider)] bg-[#0a2d3b]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7f6751]/30 bg-[#f5f0dc] px-3 py-2 text-[#25313a]">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em]">
                  Chesapeake Bay planning chart
                </div>
                <div className="mt-1 text-xs font-bold">
                  {courseData.eventName} · {courseData.eventLocation} · conditions date{" "}
                  {formatDate(courseData.raceDate)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#7f6751]/40 bg-white/70 text-[#25313a] transition active:scale-95"
                  onClick={() => setZoomLevel((level) => Math.min(level + 1, 2))}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#7f6751]/40 bg-white/70 text-[#25313a] transition active:scale-95"
                  onClick={() => setZoomLevel((level) => Math.max(level - 1, 0))}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#7f6751]/40 bg-white/70 text-[#25313a] transition active:scale-95"
                  onClick={() => setZoomLevel(0)}
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
            <svg
              viewBox={mapViewBox}
              role="img"
              aria-label="NOAA-style Chesapeake Bay race chart with tide and current overlays"
              className="aspect-[1.536] w-full bg-[#b9d8df]"
            >
              <defs>
                <marker
                  id="currentArrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="context-stroke" />
                </marker>
                <pattern id="chartPaper" width="18" height="18" patternUnits="userSpaceOnUse">
                  <rect width="18" height="18" fill="#bfdfe9" />
                  <path d="M 0 18 L 18 0" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={WIDTH} height={HEIGHT} fill="url(#chartPaper)" />
              <path
                d={`${pathFor(shorelineWest, bounds)} L 0 ${HEIGHT} L 0 0 Z`}
                fill="#e8ddbd"
                stroke="#7f6751"
                strokeWidth="2"
              />
              <path
                d={`${pathFor(shorelineEast, bounds)} L ${WIDTH} ${HEIGHT} L ${WIDTH} 0 Z`}
                fill="#e8ddbd"
                stroke="#7f6751"
                strokeWidth="2"
              />
              <path
                d={pathFor(shoalContourWest, bounds)}
                fill="none"
                stroke="#2d7e9f"
                strokeDasharray="7 6"
                strokeOpacity="0.65"
                strokeWidth="2"
              />
              <path
                d={pathFor(shoalContourEast, bounds)}
                fill="none"
                stroke="#2d7e9f"
                strokeDasharray="7 6"
                strokeOpacity="0.65"
                strokeWidth="2"
              />
              <path
                d={pathFor(channelCenterline, bounds)}
                fill="none"
                stroke="#7c3aed"
                strokeDasharray="10 9"
                strokeOpacity="0.52"
                strokeWidth="5"
              />

              <g stroke="#244b5a" strokeOpacity="0.33" strokeWidth="1">
                {xGridTicks.map((xNm) => {
                  const lon = lonAtXNm(xNm, bounds);
                  const plotted = project({ lat: bounds.origin.lat, lon }, bounds);
                  return (
                    <g key={`lon-${xNm}`}>
                      <line x1={plotted.x} x2={plotted.x} y1={PADDING} y2={HEIGHT - PADDING} />
                      <text x={plotted.x + 4} y={HEIGHT - 21} fill="#25313a" fontSize="11" fontWeight="700">
                        {formatLon(lon)}
                      </text>
                    </g>
                  );
                })}
                {yGridTicks.map((yNm) => {
                  const lat = latAtYNm(yNm, bounds);
                  const plotted = project({ lat, lon: bounds.origin.lon }, bounds);
                  return (
                    <g key={`lat-${yNm}`}>
                      <line x1={PADDING} x2={WIDTH - PADDING} y1={plotted.y} y2={plotted.y} />
                      <text x={18} y={plotted.y - 4} fill="#25313a" fontSize="11" fontWeight="700">
                        {formatLat(lat)}
                      </text>
                    </g>
                  );
                })}
              </g>

              <g fill="#263642" fontFamily="ui-serif, Georgia, serif" fontSize="13" fontWeight="700">
                {depthSoundings.map((sounding) => {
                  const plotted = project(sounding, bounds);
                  return (
                    <text key={`${sounding.lat}-${sounding.lon}`} x={plotted.x} y={plotted.y}>
                      {sounding.value}
                    </text>
                  );
                })}
              </g>
              <text x={WIDTH - 190} y={62} fill="#7c3aed" fontSize="12" fontWeight="900">
                MAIN CHANNEL
              </text>
              <text x={82} y={96} fill="#4f3f30" fontSize="13" fontWeight="900">
                ANNAPOLIS
              </text>
              <text x={94} y={420} fill="#4f3f30" fontSize="12" fontWeight="900">
                TOLLY POINT
              </text>
              <g transform={`translate(${WIDTH - 88} 94)`}>
                <circle r="34" fill="none" stroke="#25313a" strokeWidth="1.5" />
                <path d="M 0 -27 L 7 0 L 0 27 L -7 0 Z" fill="none" stroke="#25313a" strokeWidth="1.5" />
                <text x="0" y="-39" textAnchor="middle" fill="#25313a" fontSize="12" fontWeight="900">
                  N
                </text>
              </g>

              {coursePoints.length >= 2 && (
                <path
                  d={pathFor(coursePoints, bounds)}
                  fill="none"
                  stroke="#facc15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
              )}

              {courseData.course.legs.map((leg) => {
                const from = courseData.marks[leg.fromMark];
                const to = courseData.marks[leg.toMark];
                if (!from || !to) return null;
                const fromPoint = project(from, bounds);
                const toPoint = project(to, bounds);
                const station = dominantCurrent;
                const length = station ? 14 + Math.min(station.speedKt, 1.8) * 16 : 18;
                const vector =
                  station?.directionDeg == null
                    ? { x: 0, y: 0 }
                    : bearingVector(station.directionDeg, length);
                const color = station
                  ? directionColor(station.direction, station.speedKt)
                  : "#d8e0e8";
                const x = (fromPoint.x + toPoint.x) / 2;
                const y = (fromPoint.y + toPoint.y) / 2;

                return (
                  <g key={`leg-current-${leg.legNumber}`}>
                    <line
                      x1={x - vector.x / 2}
                      y1={y - vector.y / 2}
                      x2={x + vector.x / 2}
                      y2={y + vector.y / 2}
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      markerEnd="url(#currentArrow)"
                      opacity="0.9"
                    />
                    <circle cx={x} cy={y} r="15" fill="#071625" stroke="#facc15" />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="900"
                      fill="#f4f6f8"
                    >
                      {leg.legNumber}
                    </text>
                  </g>
                );
              })}

              {currentStations.map((station) => {
                const plotted = project(station, bounds);
                const length = 16 + Math.min(station.speedKt, 1.8) * 16;
                const vector =
                  station.directionDeg == null
                    ? { x: 0, y: 0 }
                    : bearingVector(station.directionDeg, length);
                const color = directionColor(station.direction, station.speedKt);

                return (
                  <g key={station.stationId}>
                    <circle cx={plotted.x} cy={plotted.y} r="12" fill="#f7fbff" stroke={color} strokeWidth="2.5" />
                    <line
                      x1={plotted.x - vector.x / 2}
                      y1={plotted.y - vector.y / 2}
                      x2={plotted.x + vector.x / 2}
                      y2={plotted.y + vector.y / 2}
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      markerEnd="url(#currentArrow)"
                    />
                    <text
                      x={Math.min(WIDTH - 100, plotted.x + 18)}
                      y={plotted.y - 14}
                      fill="#15283a"
                      fontSize="12"
                      fontWeight="800"
                    >
                      {station.label}
                    </text>
                    <text
                      x={Math.min(WIDTH - 100, plotted.x + 18)}
                      y={plotted.y + 1}
                      fill="#254d60"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {directionLabel(station.direction)} {formatKt(station.speedKt)}
                    </text>
                  </g>
                );
              })}

              {payload?.tide && (
                <g>
                  {(() => {
                    const plotted = project(payload.tide, bounds);
                    return (
                      <>
                        <circle cx={plotted.x} cy={plotted.y} r="13" fill="#f7fbff" stroke="#047857" strokeWidth="3" />
                        <text
                          x={plotted.x + 17}
                          y={plotted.y - 8}
                          fill="#064e3b"
                          fontSize="12"
                          fontWeight="900"
                        >
                          Tide {payload.tide.label}
                        </text>
                        <text
                          x={plotted.x + 17}
                          y={plotted.y + 8}
                          fill="#065f46"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {formatHeight(selectedTideHeight)}
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {coursePoints.map((point) => {
                const plotted = project(point, bounds);
                return (
                  <g key={`${point.id}-${point.lat}-${point.lon}`}>
                    <circle cx={plotted.x} cy={plotted.y} r="11" fill="#fff7ed" stroke="#d97706" strokeWidth="3" />
                    <text
                      x={plotted.x}
                      y={plotted.y + 4}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="11"
                      fontWeight="900"
                    >
                      {point.label}
                    </text>
                  </g>
                );
              })}

              <text x={WIDTH - 238} y={HEIGHT - 24} fill="#9f1239" fontSize="11" fontWeight="900">
                PLANNING VIEW - NOT FOR NAVIGATION
              </text>
              <g transform={`translate(${PADDING + 10} ${HEIGHT - 54})`}>
                <line x1="0" x2={scaleBarWidth} y1="0" y2="0" stroke="#25313a" strokeWidth="4" />
                <line x1="0" x2="0" y1="-8" y2="8" stroke="#25313a" strokeWidth="3" />
                <line x1={scaleBarWidth} x2={scaleBarWidth} y1="-8" y2="8" stroke="#25313a" strokeWidth="3" />
                <text x={scaleBarWidth / 2} y="-12" textAnchor="middle" fill="#25313a" fontSize="12" fontWeight="900">
                  {scaleBarNm} NM
                </text>
              </g>
            </svg>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-[color:var(--text-soft)]">
                {snapshot?.displayTime ?? "Loading time"}
              </span>
              <span className="text-xs text-[color:var(--muted)]">
                First warning {payload?.raceWindow.firstWarning ?? "12:00 PM"} · limit{" "}
                {payload?.raceWindow.timeLimit ?? "4:30 PM"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max((payload?.snapshots.length ?? 1) - 1, 0)}
              step={1}
              value={snapshotIndex}
              onChange={(event) => setSnapshotIndex(Number(event.target.value))}
              className="mt-2 w-full accent-sky-400"
              disabled={!payload}
            />
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-[color:var(--divider)] bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              <Waves className="h-4 w-4" />
              Water read
            </div>
            <div className="mt-3 text-2xl font-black">{snapshot?.displayTime ?? "--"}</div>
            <div className="mt-1 text-sm text-[color:var(--muted)]">
              {payload
                ? `${courseData.eventName} · ${formatDate(payload.date)}`
                : "Loading NOAA predictions"}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--divider)] bg-black/20 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Tide
            </div>
            <div className="mt-2 text-lg font-black">{formatHeight(selectedTideHeight)}</div>
            <div className="text-sm capitalize text-[color:var(--text-soft)]">
              {selectedTideStage}
            </div>
            <div className="mt-2 text-xs text-[color:var(--muted)]">
              {payload?.tide.label ?? "Tide reference"} · High {payload?.tide.nextHighTime?.displayTime ?? "--"} · Low{" "}
              {payload?.tide.nextLowTime?.displayTime ?? "--"}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--divider)] bg-black/20 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Strongest station
            </div>
            <div className="mt-2 text-lg font-black">{dominantCurrent?.label ?? "--"}</div>
            <div className="text-sm text-[color:var(--text-soft)]">
              {dominantCurrent
                ? `${directionLabel(dominantCurrent.direction)} ${formatKt(dominantCurrent.speedKt)}`
                : "--"}
            </div>
            <div className="mt-2 text-xs text-[color:var(--muted)]">
              {dominantCurrent?.role ?? "Current reference"} · Next slack {dominantCurrent?.nextSlackTime ?? "--"}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--divider)] bg-black/20 p-3">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              Legend
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-8 rounded-full bg-sky-400" />
                Flood
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-8 rounded-full bg-orange-500" />
                Ebb
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-8 rounded-full bg-yellow-300" />
                Course
              </div>
            </div>
          </div>

          {(loading || error) && (
            <div className="rounded-lg border border-[color:var(--divider)] bg-black/20 p-3 text-sm">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-[color:var(--muted)]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading NOAA tide/current predictions...
                </span>
              ) : (
                <span className="text-red-200">{error}</span>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
