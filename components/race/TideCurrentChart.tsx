"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";
import type { DamReleaseLevel, DamReleasePayload } from "@/app/api/weather/dam-release/route";

type HiloEvent = {
  minute: number;
  displayTime: string;
  heightFt: number;
  type: "high" | "low";
};

type CurrentSnapshot = {
  stationId: string;
  label: string;
  direction: string;
  speedKt: number;
  signedVelocityKt: number | null;
};

type TideCurrentPayload = {
  date: string;
  tide: {
    heightFt: number | null;
    stage: string;
    hilo: HiloEvent[];
    series: Array<{ time: string; displayTime: string; heightFt: number | null }>;
  };
  snapshots: Array<{
    time: string;
    displayTime: string;
    tide: { heightFt: number | null };
    currents: CurrentSnapshot[];
  }>;
  raceWindow: { firstWarning: string; timeLimit: string };
  error?: string;
};

type ChartPoint = {
  minute: number;
  label: string;
  tide: number | null;
  ACT4976?: number | null;
  ACT6106?: number | null;
  cb1102?: number | null;
  ACT4971?: number | null;
  ACT4966?: number | null;
};

const STATIONS: Array<{ id: string; label: string; color: string; dash?: string }> = [
  { id: "ACT6106", label: "Greenbury Pt", color: "#818cf8" },
  { id: "ACT4976", label: "Tolly Pt",     color: "#38bdf8" },
  { id: "cb1102",  label: "Bay Bridge",   color: "#a78bfa", dash: "4 3" },
  { id: "ACT4971", label: "Thomas Pt SE", color: "#34d399", dash: "4 3" },
  { id: "ACT4966", label: "Thomas Pt E",  color: "#fb923c", dash: "4 3" },
];

const X_TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];
const X_LABELS: Record<number, string> = {
  0: "12 AM", 180: "3 AM", 360: "6 AM", 540: "9 AM",
  720: "12 PM", 900: "3 PM", 1080: "6 PM", 1260: "9 PM", 1440: "12 AM",
};

const DEFAULT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

const DAM_LEVEL_STYLES: Record<DamReleaseLevel, { badge: string; dot: string }> = {
  normal:   { badge: "border-[#2a4a5a] bg-[#0d1e29] text-[#7a9ea8]",  dot: "#7a9ea8" },
  elevated: { badge: "border-[#4a3a00] bg-[#1e1800] text-[#d9b26b]",  dot: "#d9b26b" },
  high:     { badge: "border-[#5a2a00] bg-[#220f00] text-[#f97316]",  dot: "#f97316" },
  flood:    { badge: "border-[#5a1a1a] bg-[#1e0808] text-[#f87171]",  dot: "#f87171" },
};

function formatCfs(cfs: number): string {
  return cfs >= 1000 ? `${Math.round(cfs / 1000)}k` : `${cfs}`;
}

function decayLabel(status: string | null): string {
  if (status === "recovered") return "fully recovered";
  if (status === "dropping") return "dropping";
  if (status === "still_elevated") return "still elevated";
  return "";
}

function ConowingoStrip({ dam }: { dam: DamReleasePayload }) {
  const { level, note } = dam.currentInfluence;
  const ev = dam.releaseEvent;
  const styles = DAM_LEVEL_STYLES[level];
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <div className="mb-3 rounded border border-[color:var(--divider)] bg-[#0a1a22] px-3 py-2.5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a7a8a] shrink-0">
          Conowingo Dam
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${styles.badge}`}
        >
          {ev?.detected ? "Release detected" : levelLabel}
        </span>

        {ev?.detected ? (
          /* Event shape row */
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>
              <span className="text-[#4a7a8a]">Peak:</span>{" "}
              <span className="font-semibold text-[#cddde0]">{formatCfs(ev.peakCfs ?? 0)} CFS</span>
              {ev.spikeMultiple != null && (
                <span className="text-[#4a7a8a]"> ({ev.spikeMultiple}× baseline)</span>
              )}
              {ev.peakTimeLabel && (
                <span className="text-[#4a7a8a]"> at {ev.peakTimeLabel}</span>
              )}
            </span>

            {ev.dropOffPct != null && (
              <span>
                <span className="text-[#4a7a8a]">Drop-off:</span>{" "}
                <span className="font-semibold text-[#cddde0]">{ev.dropOffPct}%</span>
                {ev.decayStatus && (
                  <span className="text-[#4a7a8a]"> — {decayLabel(ev.decayStatus)}</span>
                )}
              </span>
            )}

            {ev.impactWindowLabel && (
              <span>
                <span className="text-[#4a7a8a]">Pulse at Annapolis:</span>{" "}
                <span className="font-semibold text-[#cddde0]">{ev.impactWindowLabel}</span>
              </span>
            )}
          </div>
        ) : (
          /* No release — just show that it's normal */
          <span className="text-xs text-[#4a7a8a]">
            No release event detected — trickle-through only
          </span>
        )}
      </div>

      {/* Impact note */}
      <p className="mt-1.5 text-[11px] leading-snug text-[#7a9ea8]">{note}</p>
    </div>
  );
}

function shiftDate(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, mo! - 1, d!);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y!, mo! - 1, d!).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeToMinute(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function displayToMinute(displayTime: string): number | null {
  const match = displayTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  const h12 = Number(match[1]);
  const m = Number(match[2]);
  const isPM = match[3].toUpperCase() === "PM";
  const h24 = h12 % 12 + (isPM ? 12 : 0);
  return h24 * 60 + m;
}

function buildChartData(payload: TideCurrentPayload): ChartPoint[] {
  return payload.snapshots.map((snapshot) => {
    const point: ChartPoint = {
      minute: timeToMinute(snapshot.time),
      label: snapshot.displayTime,
      tide: snapshot.tide.heightFt,
    };
    for (const station of snapshot.currents) {
      if (station.stationId === "ACT4976") point.ACT4976 = station.signedVelocityKt;
      else if (station.stationId === "ACT6106") point.ACT6106 = station.signedVelocityKt;
      else if (station.stationId === "cb1102")  point.cb1102  = station.signedVelocityKt;
      else if (station.stationId === "ACT4971") point.ACT4971 = station.signedVelocityKt;
      else if (station.stationId === "ACT4966") point.ACT4966 = station.signedVelocityKt;
    }
    return point;
  });
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null; color: string; name: string }>;
}) {
  if (!active || !payload?.length) return null;

  const tideEntry = payload.find((p) => p.dataKey === "tide");
  const currentEntries = payload.filter((p) => p.dataKey !== "tide" && p.value != null);
  const displayLabel = (payload[0] as { payload?: ChartPoint } | undefined)?.payload?.label ?? "";

  return (
    <div className="rounded-lg border border-[#1e3a48] bg-[#081520] px-3 py-2 text-xs shadow-xl">
      <div className="mb-2 font-bold tracking-wide text-[#cddde0]">{displayLabel}</div>
      {tideEntry?.value != null && (
        <div className="text-[#65c4b8]">
          Tide — {tideEntry.value.toFixed(2)} ft
        </div>
      )}
      {currentEntries.length > 0 && (
        <div className="mt-1.5 space-y-0.5 border-t border-[#1e3a48] pt-1.5">
          {currentEntries.map((entry) => {
            const val = entry.value ?? 0;
            const isFlood = val > 0.05;
            const isEbb = val < -0.05;
            const dir = isFlood ? "flood" : isEbb ? "ebb" : "slack";
            return (
              <div key={entry.dataKey} style={{ color: entry.color }}>
                {entry.name} — {dir === "slack" ? "slack" : `${dir} ${Math.abs(val).toFixed(2)} kt`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LegendLabel({ value, color }: { value: string; color?: string }) {
  return <span style={{ color: color ?? "#cddde0", fontSize: 10 }}>{value}</span>;
}

export default function TideCurrentChart() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT,
  );
  const courseData = useResolvedCourseData(draft.courseId);
  const [selectedDate, setSelectedDate] = useState<string>(courseData.raceDate);
  const [payload, setPayload] = useState<TideCurrentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [damPayload, setDamPayload] = useState<DamReleasePayload | null>(null);

  // Reset to race date when the course changes
  useEffect(() => {
    setSelectedDate(courseData.raceDate);
  }, [courseData.raceDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const isRaceDay = selectedDate === courseData.raceDate;
    const params = new URLSearchParams({
      date: selectedDate,
      ...(isRaceDay ? { eventId: courseData.eventId } : {}),
      time: "12:00",
    });

    fetch(`/api/weather/tide-current?${params}`)
      .then((r) => r.json())
      .then((data: TideCurrentPayload) => {
        if (!cancelled) {
          if (data.error) setError(data.error);
          else setPayload(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load NOAA tide/current data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedDate, courseData.raceDate, courseData.eventId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather/dam-release?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: DamReleasePayload) => {
        if (!cancelled && !data.error) setDamPayload(data);
      })
      .catch(() => { /* non-critical, silently skip */ });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const chartData = useMemo(() => (payload ? buildChartData(payload) : []), [payload]);
  const hiloLines = useMemo(() => payload?.tide.hilo ?? [], [payload]);
  const isRaceDay = selectedDate === courseData.raceDate;

  const raceStartMin = useMemo(
    () => (payload && isRaceDay ? displayToMinute(payload.raceWindow.firstWarning) : null),
    [payload, isRaceDay],
  );
  const raceLimitMin = useMemo(
    () => (payload && isRaceDay ? displayToMinute(payload.raceWindow.timeLimit) : null),
    [payload, isRaceDay],
  );

  function handleLegendClick(data: { dataKey?: string | number }) {
    const key = typeof data.dataKey === "string" ? data.dataKey : undefined;
    if (!key || key === "tide") return;
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      {/* Date selector row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
            className="flex h-7 w-7 items-center justify-center rounded border border-[color:var(--divider)] text-[#7a9ea8] transition-colors hover:border-[#2a5a70] hover:text-[#cddde0]"
            aria-label="Previous day"
          >
            ‹
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#cddde0]">
              {formatDisplayDate(selectedDate)}
            </span>
            {isRaceDay && (
              <span className="layline-kicker">Race Day</span>
            )}
          </div>

          <button
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            className="flex h-7 w-7 items-center justify-center rounded border border-[color:var(--divider)] text-[#7a9ea8] transition-colors hover:border-[#2a5a70] hover:text-[#cddde0]"
            aria-label="Next day"
          >
            ›
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
            className="h-7 rounded border border-[color:var(--divider)] bg-transparent px-2 text-xs text-[#7a9ea8] outline-none focus:border-[#2a5a70] focus:text-[#cddde0]"
          />

          {!isRaceDay && (
            <button
              onClick={() => setSelectedDate(courseData.raceDate)}
              className="text-xs text-[#7a9ea8] underline-offset-2 hover:text-[#65c4b8] hover:underline"
            >
              back to race day
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          {hiloLines.map((event, i) => (
            <span
              key={i}
              className={event.type === "high" ? "text-[#65c4b8]" : "text-[#d9b26b]"}
            >
              {event.type === "high" ? "▲" : "▼"} {event.displayTime} — {event.heightFt.toFixed(1)} ft
            </span>
          ))}
        </div>
      </div>

      {/* Conowingo dam release context */}
      {damPayload && <ConowingoStrip dam={damPayload} />}

      {/* Legend hint */}
      <p className="mb-2 text-xs text-[#7a9ea8]">
        Tide height (left axis, ft) and current velocity (right axis, kt).
        Flood is positive · ebb is negative · click a station name to toggle it.
      </p>

      {loading ? (
        <div className="flex h-52 items-center justify-center">
          <span className="text-sm text-[#7a9ea8]">Loading tide and current data…</span>
        </div>
      ) : error || !payload ? (
        <div className="flex h-32 items-center justify-center">
          <span className="text-sm text-[#d2725c]">{error ?? "No data available."}</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 58, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e3a48" vertical={false} />

            <XAxis
              dataKey="minute"
              type="number"
              domain={[0, 1440]}
              ticks={X_TICKS}
              tickFormatter={(min: number) => X_LABELS[min] ?? ""}
              tick={{ fill: "#7a9ea8", fontSize: 10 }}
              axisLine={{ stroke: "#1e3a48" }}
              tickLine={false}
              interval={0}
            />

            <YAxis
              yAxisId="tide"
              orientation="left"
              domain={[0, "dataMax + 0.5"]}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              tick={{ fill: "#65c4b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
              label={{
                value: "ft",
                angle: -90,
                position: "insideLeft",
                fill: "#65c4b8",
                fontSize: 9,
                dx: 10,
              }}
            />

            <YAxis
              yAxisId="current"
              orientation="right"
              tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
              tick={{ fill: "#7a9ea8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={42}
              label={{
                value: "kt",
                angle: 90,
                position: "insideRight",
                fill: "#7a9ea8",
                fontSize: 9,
                dx: -6,
              }}
            />

            <ReferenceLine yAxisId="current" y={0} stroke="#2a4a5a" strokeWidth={1.5} />

            {raceStartMin != null && raceLimitMin != null && (
              <ReferenceArea
                yAxisId="tide"
                x1={raceStartMin}
                x2={raceLimitMin}
                fill="#65c4b8"
                fillOpacity={0.06}
              />
            )}

            {raceStartMin != null && (
              <ReferenceLine
                yAxisId="tide"
                x={raceStartMin}
                stroke="#65c4b8"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: "Start",
                  position: "insideTopLeft",
                  fill: "#65c4b8",
                  fontSize: 9,
                  dy: -2,
                }}
              />
            )}

            {hiloLines.map((event, i) => (
              <ReferenceLine
                key={i}
                yAxisId="tide"
                x={event.minute}
                stroke={event.type === "high" ? "#65c4b8" : "#d9b26b"}
                strokeWidth={1}
                strokeDasharray="2 5"
                label={{
                  value: event.type === "high" ? "H" : "L",
                  position: "insideTopRight",
                  fill: event.type === "high" ? "#65c4b8" : "#d9b26b",
                  fontSize: 8,
                }}
              />
            ))}

            <Area
              yAxisId="tide"
              type="monotone"
              dataKey="tide"
              fill="#65c4b8"
              fillOpacity={0.1}
              stroke="#65c4b8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: "#65c4b8", strokeWidth: 0 }}
              name="Tide"
            />

            {STATIONS.map((station) => (
              <Line
                key={station.id}
                yAxisId="current"
                type="monotone"
                dataKey={station.id}
                stroke={hiddenSeries.has(station.id) ? "transparent" : station.color}
                strokeWidth={1.5}
                strokeDasharray={station.dash}
                dot={false}
                activeDot={hiddenSeries.has(station.id) ? false : { r: 3, strokeWidth: 0 }}
                name={station.label}
                legendType="line"
              />
            ))}

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#2a4a5a", strokeWidth: 1 }}
            />

            <Legend
              wrapperStyle={{ paddingTop: 8 }}
              formatter={(value: string, entry: { color?: string }) =>
                <LegendLabel value={value} color={entry.color} />
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(data: any) => handleLegendClick(data)}
              iconSize={12}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
