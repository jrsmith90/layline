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
  { id: "ACT4976", label: "Tolly Pt", color: "#38bdf8" },
  { id: "cb1102",  label: "Bay Bridge",  color: "#a78bfa", dash: "4 3" },
  { id: "ACT4971", label: "Thomas Pt SE",color: "#34d399", dash: "4 3" },
  { id: "ACT4966", label: "Thomas Pt E", color: "#fb923c", dash: "4 3" },
];

const X_TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];
const X_LABELS: Record<number, string> = {
  0: "12 AM", 180: "3 AM", 360: "6 AM", 540: "9 AM",
  720: "12 PM", 900: "3 PM", 1080: "6 PM", 1260: "9 PM", 1440: "12 AM",
};

const DEFAULT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

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
  const [payload, setPayload] = useState<TideCurrentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      date: courseData.raceDate,
      eventId: courseData.eventId,
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
  }, [courseData.raceDate, courseData.eventId]);

  const chartData = useMemo(() => (payload ? buildChartData(payload) : []), [payload]);

  const hiloLines = useMemo(() => payload?.tide.hilo ?? [], [payload]);

  const raceStartMin = useMemo(
    () => (payload ? displayToMinute(payload.raceWindow.firstWarning) : null),
    [payload],
  );
  const raceLimitMin = useMemo(
    () => (payload ? displayToMinute(payload.raceWindow.timeLimit) : null),
    [payload],
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

  if (loading) {
    return (
      <div className="flex h-52 items-center justify-center">
        <span className="text-sm text-[#7a9ea8]">Loading tide and current data…</span>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-sm text-[#d2725c]">{error ?? "No data available."}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#7a9ea8]">
          Tide height (left axis, ft) and current velocity (right axis, kt).
          Flood is positive · ebb is negative · click a station name to toggle it.
        </p>
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

          {/* Current zero baseline */}
          <ReferenceLine yAxisId="current" y={0} stroke="#2a4a5a" strokeWidth={1.5} />

          {/* Race window band */}
          {raceStartMin != null && raceLimitMin != null && (
            <ReferenceArea
              yAxisId="tide"
              x1={raceStartMin}
              x2={raceLimitMin}
              fill="#65c4b8"
              fillOpacity={0.06}
            />
          )}

          {/* First warning line */}
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

          {/* H/L tide markers */}
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

          {/* Tide area */}
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

          {/* Current station lines */}
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
    </div>
  );
}
