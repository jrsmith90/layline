"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { RefreshCw, RotateCcw, Waves, ZoomIn, ZoomOut } from "lucide-react";
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

const courseIds = getAllCourseIds();

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

export default function RaceConditionsMap() {
  const [courseId, setCourseId] = useState<string>(getDefaultCourseId);
  const [payload, setPayload] = useState<TideCurrentPayload | null>(null);
  const [snapshotIndex, setSnapshotIndex] = useState(4);
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

  const snapshot = getSnapshot(payload, snapshotIndex);
  const currentStations = snapshot?.currents ?? payload?.currentStations ?? [];
  const selectedTideHeight =
    payload?.tide.series.find((point) => point.time === snapshot?.time)?.heightFt ??
    payload?.tide.heightFt ??
    null;
  const selectedTideStage = stageFromSeries(payload?.tide.series, snapshot?.time, payload?.tide.stage);

  const mapBounds = useMemo(() => {
    if (!courseData.marks || courseData.course.sequence?.length === 0) {
      return {
        center: [38.95, -76.35] as [number, number],
        zoom: 11,
      };
    }

    const markIds = courseData.course.sequence ?? [];
    const marks = markIds
      .map((id) => courseData.marks[id])
      .filter((m) => m != null)
      .slice(0, 2);

    if (marks.length < 2) {
      return {
        center: [38.95, -76.35] as [number, number],
        zoom: 11,
      };
    }

    const lats = marks.map((m) => m.lat);
    const lons = marks.map((m) => m.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    return {
      center: [centerLat, centerLon] as [number, number],
      zoom: 12,
    };
  }, [courseData]);

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

            {loading ? (
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
                center={mapBounds.center}
                zoom={mapBounds.zoom}
                style={{ height: "400px", backgroundColor: "#bfdfe9" }}
                attributionControl={false}
              >
                <TileLayer
                  url="https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer?service=WMS&version=1.3.0&request=GetMap&layers=0&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true"
                  attribution='&copy; <a href="https://www.noaa.gov/">NOAA</a>'
                  maxZoom={16}
                  minZoom={5}
                />

                {currentStations.map((station) => {
                  const color = directionColor(station.direction, station.speedKt);
                  const icon = L.divIcon({
                    html: `<div style="width: 24px; height: 24px; background: #f7fbff; border: 3px solid ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; color: #15283a;">C</div>`,
                    className: "",
                    iconSize: [24, 24],
                  });

                  return (
                    <Marker
                      key={station.stationId}
                      position={[station.lat, station.lon]}
                      icon={icon}
                    >
                      <Popup>
                        <div className="space-y-1 text-sm">
                          <div className="font-bold">{station.label}</div>
                          <div>{directionLabel(station.direction)} {formatKt(station.speedKt)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {payload?.tide && (
                  <Marker
                    position={[payload.tide.lat, payload.tide.lon]}
                    icon={L.divIcon({
                      html: `<div style="width: 20px; height: 20px; background: #f7fbff; border: 3px solid #047857; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 9px; color: #064e3b;">T</div>`,
                      className: "",
                      iconSize: [20, 20],
                    })}
                  >
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-bold">Tide {payload.tide.label}</div>
                        <div>{formatHeight(selectedTideHeight)}</div>
                        <div className="text-xs">{selectedTideStage}</div>
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
              Uses NOAA's official ENC Chart Display Service with traditional paper chart symbology. Tide and current predictions update weekly from NOAA CO-OPS.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
