"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  WMSTileLayer,
  useMap,
} from "react-leaflet";
import { Navigation } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

type LiveWeatherPayload = {
  observedAt?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  cbibsAnnapolis?: {
    platformId: string;
    platformName: string;
    locationName: string;
    observedAt?: string;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
  };
  thomasPoint?: {
    stationId: string;
    stationName: string;
    locationName: string;
    observedAt?: string;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
  };
  error?: string;
};

type WindMarker = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  role: string;
  observedAt?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
};

const courseIds = getAllCourseIds();
const NOAA_CHART_WMS_URL =
  "https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer";
const NOAA_CHART_LAYERS = "1,2,3,4,5,6,7,8,9,10,11,12";
const DEFAULT_CENTER: [number, number] = [38.95, -76.35];
const HOLLOW_ARROW_FILL = "#f7fbff";
const WIND_MARKERS: WindMarker[] = [
  {
    id: "annapolis-buoy",
    label: "Annapolis buoy",
    lat: 38.99,
    lon: -76.42,
    role: "Top-of-course wind reference",
  },
  {
    id: "thomas-point",
    label: "Thomas Point",
    lat: 38.891,
    lon: -76.427,
    role: "Bottom-of-course wind reference",
  },
];

type MapBounds = {
  center: [number, number];
  bounds: [[number, number], [number, number]];
  zoom: number;
};

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

function directionColor(direction: CurrentDirection, speedKt: number) {
  if (direction === "slack" || speedKt < 0.08) return "#d8e0e8";
  if (direction === "flood") return "#38bdf8";
  if (direction === "ebb") return "#f97316";
  return "#a3a3a3";
}

function directionShortLabel(direction: CurrentDirection) {
  if (direction === "flood") return "Flood current";
  if (direction === "ebb") return "Ebb current";
  if (direction === "slack") return "Slack current";
  return "Current";
}

function formatObservedAt(value?: string) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildDirectionalArrowSvg(params: {
  color: string;
  directionDeg?: number | null;
  visible: boolean;
  arrowLength: number;
}) {
  const { color, directionDeg, visible, arrowLength } = params;
  if (!visible || directionDeg == null) return "";

  const tipY = Math.max(4, 17 - arrowLength);
  const headBaseY = Math.min(16, tipY + 7);
  const shaftEndY = headBaseY - 2.4;

  return `<g transform="rotate(${directionDeg} 17 17)">
      <path d="M17 17 L17 ${shaftEndY}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" />
      <path d="M17 ${tipY} L12.3 ${headBaseY} L17 ${headBaseY - 1.8} L21.7 ${headBaseY} Z" fill="${HOLLOW_ARROW_FILL}" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" />
    </g>`;
}

function buildCurrentIcon(station: CurrentStationSnapshot) {
  const color = directionColor(station.direction, station.speedKt);
  const label = station.direction === "slack" || station.speedKt < 0.08 ? "S" : "C";
  const hasDirection =
    station.directionDeg != null &&
    station.direction !== "slack" &&
    station.speedKt >= 0.08;
  const arrowLength =
    station.strength === "strong" ? 16 : station.strength === "moderate" ? 15 : 14;
  const arrowSvg = buildDirectionalArrowSvg({
    color,
    directionDeg: station.directionDeg,
    visible: hasDirection,
    arrowLength,
  });

  return L.divIcon({
    html: `<div style="position:relative;width:34px;height:34px;">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">${arrowSvg}</svg>
      <div style="position:absolute;left:14px;top:14px;width:6px;height:6px;border-radius:999px;background:${color};box-shadow:0 0 0 2px #f7fbff,0 0 0 3px rgba(21,40,58,.55);"></div>
      <div style="position:absolute;left:22px;top:5px;border:1px solid rgba(21,40,58,.45);background:#f7fbff;color:#15283a;border-radius:999px;padding:1px 4px;font-size:9px;font-weight:900;line-height:1;">${label}</div>
    </div>`,
    className: "layline-current-marker",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14],
  });
}

function buildWindIcon(windDirectionDeg?: number | null) {
  const color = "#0f766e";
  const arrowSvg = buildDirectionalArrowSvg({
    color,
    directionDeg: windDirectionDeg,
    visible: windDirectionDeg != null,
    arrowLength: 16,
  });

  return L.divIcon({
    html: `<div style="position:relative;width:34px;height:34px;">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">${arrowSvg}</svg>
      <div style="position:absolute;left:12px;top:12px;width:10px;height:10px;border-radius:999px;background:${HOLLOW_ARROW_FILL};box-shadow:0 0 0 2px ${color},0 0 0 3px rgba(21,40,58,.38);"></div>
      <div style="position:absolute;left:22px;top:5px;border:1px solid rgba(15,118,110,.38);background:${HOLLOW_ARROW_FILL};color:${color};border-radius:999px;padding:1px 4px;font-size:9px;font-weight:900;line-height:1;">W</div>
    </div>`,
    className: "layline-wind-marker",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14],
  });
}

function tideIcon() {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;background:#f7fbff;border:3px solid #047857;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:9px;color:#064e3b;box-shadow:0 1px 4px rgba(0,0,0,.35);">T</div>`,
    className: "layline-tide-marker",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
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

function FitMapToBounds({ bounds }: { bounds: MapBounds["bounds"] }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 14,
    });
  }, [bounds, map]);

  return null;
}

export default function RaceConditionsMap() {
  const [courseId, setCourseId] = useState<string>(getDefaultCourseId);
  const [payload, setPayload] = useState<TideCurrentPayload | null>(null);
  const [windPayload, setWindPayload] = useState<LiveWeatherPayload | null>(null);
  const [snapshotIndex, setSnapshotIndex] = useState(4);
  const [isMapClientReady, setIsMapClientReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);

  useEffect(() => {
    setIsMapClientReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWind() {
      try {
        const response = await fetch("/api/weather/noaa-wind", {
          cache: "no-store",
        });
        const data = (await response.json()) as LiveWeatherPayload;

        if (!cancelled && response.ok && !data.error) {
          setWindPayload(data);
        }
      } catch {
        if (!cancelled) {
          setWindPayload(null);
        }
      }
    }

    loadWind();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const snapshot = getSnapshot(payload, snapshotIndex);
  const currentStations = useMemo(
    () => snapshot?.currents ?? payload?.currentStations ?? [],
    [payload?.currentStations, snapshot?.currents],
  );
  const selectedTideHeight =
    payload?.tide.series.find((point) => point.time === snapshot?.time)?.heightFt ??
    payload?.tide.heightFt ??
    null;
  const selectedTideStage = stageFromSeries(payload?.tide.series, snapshot?.time, payload?.tide.stage);

  const coursePositions = useMemo(
    () =>
      (courseData.course.sequence ?? [])
      .map((id) => courseData.marks[id])
      .filter((m) => m != null)
      .map((mark) => [mark.lat, mark.lon] as [number, number]),
    [courseData],
  );

  const windStations = useMemo<WindMarker[]>(() => {
    return WIND_MARKERS.map((marker) => {
      if (marker.id === "annapolis-buoy") {
        return {
          ...marker,
          observedAt: windPayload?.cbibsAnnapolis?.observedAt,
          windAvgKt: windPayload?.cbibsAnnapolis?.windAvgKt,
          windGustKt: windPayload?.cbibsAnnapolis?.windGustKt,
          windDirectionDeg: windPayload?.cbibsAnnapolis?.windDirectionDeg,
        };
      }

      return {
        ...marker,
        observedAt: windPayload?.thomasPoint?.observedAt,
        windAvgKt: windPayload?.thomasPoint?.windAvgKt,
        windGustKt: windPayload?.thomasPoint?.windGustKt,
        windDirectionDeg: windPayload?.thomasPoint?.windDirectionDeg,
      };
    }).filter((marker) => marker.windDirectionDeg != null || marker.windAvgKt != null);
  }, [windPayload]);

  const mapBounds = useMemo<MapBounds>(() => {
    const stationPositions = currentStations.map(
      (station) => [station.lat, station.lon] as [number, number],
    );
    const windPositions = windStations.map(
      (station) => [station.lat, station.lon] as [number, number],
    );
    const tidePosition =
      payload?.tide.lat != null && payload.tide.lon != null
        ? ([[payload.tide.lat, payload.tide.lon] as [number, number]])
        : [];
    const positions = [...coursePositions, ...stationPositions, ...windPositions, ...tidePosition];

    if (positions.length === 0) {
      return {
        center: DEFAULT_CENTER,
        bounds: [
          [38.85, -76.5],
          [39.05, -76.2],
        ],
        zoom: 11,
      };
    }

    const lats = positions.map(([lat]) => lat);
    const lons = positions.map(([, lon]) => lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    return {
      center: [centerLat, centerLon] as [number, number],
      bounds: [
        [minLat, minLon],
        [maxLat, maxLon],
      ],
      zoom: 12,
    };
  }, [coursePositions, currentStations, payload?.tide.lat, payload?.tide.lon, windStations]);

  return (
    <section className="layline-panel overflow-hidden">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="layline-kicker">Race map</div>
              <h2 className="mt-1 text-xl font-black">NOAA-style planning chart</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Official NOAA nautical charts with tide and current predictions layered for pre-race planning.
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

          <div className="mt-4 overflow-hidden rounded-lg border border-[color:var(--divider)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7f6751]/30 bg-[#f5f0dc] px-3 py-2 text-[#25313a]">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em]">
                  NOAA ENC Chart Display Service
                </div>
                <div className="mt-1 text-xs font-bold">
                  {courseData.eventName} · {courseData.eventLocation} · {formatDate(courseData.raceDate)}
                </div>
              </div>
            </div>

            {loading || !isMapClientReady ? (
              <div className="h-96 bg-[#bfdfe9] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm text-[#25313a]">Loading chart and conditions...</div>
                </div>
              </div>
            ) : error ? (
              <div className="h-96 bg-[#bfdfe9] flex items-center justify-center">
                <div className="text-center text-red-600">
                  <div className="text-sm font-semibold">{error}</div>
                </div>
              </div>
            ) : (
              <MapContainer
                key={`${courseId}-${payload?.date ?? "no-date"}`}
                center={mapBounds.center}
                zoom={mapBounds.zoom}
                minZoom={5}
                maxZoom={16}
                scrollWheelZoom
                style={{ height: "420px", backgroundColor: "#bfdfe9" }}
                attributionControl
              >
                <FitMapToBounds bounds={mapBounds.bounds} />
                <WMSTileLayer
                  url={NOAA_CHART_WMS_URL}
                  layers={NOAA_CHART_LAYERS}
                  format="image/png"
                  transparent
                  version="1.3.0"
                  attribution="NOAA Chart Display Service"
                  maxZoom={16}
                  minZoom={5}
                />

                {coursePositions.length > 1 ? (
                  <Polyline
                    positions={coursePositions}
                    pathOptions={{
                      color: "#ef4444",
                      weight: 3,
                      opacity: 0.95,
                      dashArray: "7 5",
                    }}
                  />
                ) : null}

                {(courseData.course.sequence ?? []).map((markId, index) => {
                  const mark = courseData.marks[markId];
                  if (!mark) return null;

                  return (
                    <CircleMarker
                      key={`${markId}-${index}`}
                      center={[mark.lat, mark.lon]}
                      radius={5}
                      pathOptions={{
                        color: "#991b1b",
                        fillColor: "#fef2f2",
                        fillOpacity: 0.95,
                        weight: 2,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                        {markId}
                      </Tooltip>
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <div className="font-bold">{markId}: {mark.name}</div>
                          <div>{mark.characteristics}</div>
                          <div className="text-xs">
                            {mark.lat.toFixed(5)}, {mark.lon.toFixed(5)}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {currentStations.map((station, index) => {
                  return (
                    <Marker
                      key={`${station.stationId}-${station.lat}-${station.lon}-${index}`}
                      position={[station.lat, station.lon]}
                      icon={buildCurrentIcon(station)}
                    >
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <div className="font-bold">{station.label}</div>
                          <div className="text-xs">{station.role}</div>
                          <div>{directionShortLabel(station.direction)}</div>
                          <div>{directionLabel(station.direction)} {formatKt(station.speedKt)}</div>
                          {station.directionDeg != null ? (
                            <div>Set {Math.round(station.directionDeg)} deg</div>
                          ) : null}
                          <div className="text-xs">{station.displayTime}</div>
                          <div className="text-xs">
                            {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
                          </div>
                          <div className="text-xs">Source: {station.source}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {windStations.map((station) => (
                  <Marker
                    key={station.id}
                    position={[station.lat, station.lon]}
                    icon={buildWindIcon(station.windDirectionDeg)}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-bold">{station.label}</div>
                        <div>{station.role}</div>
                        <div>
                          Wind {formatKt(station.windAvgKt)}
                          {station.windGustKt != null
                            ? ` gust ${formatKt(station.windGustKt)}`
                            : ""}
                        </div>
                        {station.windDirectionDeg != null ? (
                          <div>From {Math.round(station.windDirectionDeg)} deg</div>
                        ) : null}
                        <div className="text-xs">
                          Observed {formatObservedAt(station.observedAt)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {payload?.tide && (
                  <Marker
                    position={[payload.tide.lat, payload.tide.lon]}
                    icon={tideIcon()}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-bold">Tide {payload.tide.label}</div>
                        <div>{formatHeight(selectedTideHeight)}</div>
                        <div className="text-xs">{selectedTideStage}</div>
                        {payload.tide.nextHighTime ? (
                          <div className="text-xs">
                            Next high {payload.tide.nextHighTime.displayTime} · {formatHeight(payload.tide.nextHighTime.heightFt)}
                          </div>
                        ) : null}
                        {payload.tide.nextLowTime ? (
                          <div className="text-xs">
                            Next low {payload.tide.nextLowTime.displayTime} · {formatHeight(payload.tide.nextLowTime.heightFt)}
                          </div>
                        ) : null}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-[color:var(--text-soft)]">
                {snapshot?.displayTime ?? "Loading time"}
              </span>
              <span className="text-xs text-[color:var(--muted)]">
                First warning {payload?.raceWindow.firstWarning ?? "12:00 PM"} · limit {payload?.raceWindow.timeLimit ?? "4:30 PM"}
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
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Chart Information
            </div>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                <span className="text-[color:var(--text-soft)]">Course:</span> <span className="font-semibold">{courseData.courseId}</span>
              </div>
              <div>
                <span className="text-[color:var(--text-soft)]">Location:</span> <span className="font-semibold">{courseData.eventLocation}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--divider)] bg-black/20 p-3 text-xs text-[color:var(--muted)]">
            <div className="font-bold">About this map</div>
            <p className="mt-2">
              Uses NOAA&apos;s official ENC Chart Display Service with traditional paper chart symbology. Tide and current predictions are layered from NOAA CO-OPS for planning only.
            </p>
            <p className="mt-2 flex items-center gap-2 font-semibold text-[color:var(--text-soft)]">
              <Navigation size={13} />
              Not for navigation.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
