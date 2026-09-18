"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Waves } from "lucide-react";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const DEFAULT_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

type CurrentStation = {
  stationId: string;
  label: string;
  role: string;
  direction: "flood" | "ebb" | "slack" | "unknown";
  directionDeg: number | null;
  speedKt: number;
  nextSlackTime: string | null;
};

type WaterOutlook = {
  tide: {
    heightFt: number | null;
    stage: string;
    nextHighTime: { displayTime: string; heightFt: number } | null;
    nextLowTime: { displayTime: string; heightFt: number } | null;
  } | null;
  stations: CurrentStation[];
  error: string | null;
};

function formatDegrees(value: number | null) {
  return value == null ? "--" : `${Math.round(value)}°`;
}

function flowLabel(direction: CurrentStation["direction"]) {
  if (direction === "flood") return "Flood";
  if (direction === "ebb") return "Ebb";
  if (direction === "slack") return "Slack";
  return "Unavailable";
}

function flowColor(direction: CurrentStation["direction"]) {
  if (direction === "flood") return "text-[color:var(--favorable)]";
  if (direction === "ebb") return "text-[color:var(--warning)]";
  return "text-[color:var(--text-soft)]";
}

export function WeatherCourseImpactPanel() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_DRAFT,
  );

  return <WaterOutlookPanel date={draft.raceStartDate} time={draft.raceStartTime} />;
}

export function WaterOutlookPanel({ date, time }: { date: string; time: string }) {
  const [outlook, setOutlook] = useState<WaterOutlook>({
    tide: null,
    stations: [],
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date || !time) return;

    const controller = new AbortController();
    fetch(`/api/weather/tide-current?date=${date}&time=${time}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Tide and current data unavailable");
        return response.json();
      })
      .then((payload) => {
        setOutlook({
          tide: payload.tide
            ? {
                heightFt: payload.tide.heightFt ?? null,
                stage: payload.tide.stage ?? "unknown",
                nextHighTime: payload.tide.nextHighTime ?? null,
                nextLowTime: payload.tide.nextLowTime ?? null,
              }
            : null,
          stations: payload.currentStations ?? [],
          error: null,
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setOutlook({ tide: null, stations: [], error: "Water predictions could not be loaded right now." });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [date, time]);

  return (
    <section className="layline-panel bg-[color:var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="layline-kicker">Water Outlook</div>
          <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
            Tide and current by buoy
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-soft)]">
            Predicted water movement at the planned start. Use this to compare channel, open-bay,
            and near-shore options once the race area and wind direction are known.
          </p>
        </div>
        <div className="text-right text-xs text-[color:var(--muted)]">
          {date} · {time}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 text-sm text-[color:var(--muted)]">Loading NOAA water predictions...</div>
      ) : outlook.error ? (
        <div className="mt-5 rounded-lg border border-dashed border-[color:var(--divider)] p-4 text-sm text-[color:var(--text-soft)]">
          {outlook.error}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Tide"
              value={outlook.tide?.heightFt == null ? "--" : `${outlook.tide.heightFt.toFixed(1)} ft`}
              detail={outlook.tide?.stage ?? "NOAA tide prediction"}
            />
            <SummaryMetric
              label="Next high"
              value={outlook.tide?.nextHighTime?.displayTime ?? "--"}
              detail={outlook.tide?.nextHighTime ? `${outlook.tide.nextHighTime.heightFt.toFixed(1)} ft` : "No prediction"}
            />
            <SummaryMetric
              label="Next low"
              value={outlook.tide?.nextLowTime?.displayTime ?? "--"}
              detail={outlook.tide?.nextLowTime ? `${outlook.tide.nextLowTime.heightFt.toFixed(1)} ft` : "No prediction"}
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-[color:var(--divider)] text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-2 py-3">Buoy / station</th>
                  <th className="px-2 py-3">Water area</th>
                  <th className="px-2 py-3">Flow</th>
                  <th className="px-2 py-3">Strength</th>
                  <th className="px-2 py-3">Flowing toward</th>
                  <th className="px-2 py-3">Next slack</th>
                </tr>
              </thead>
              <tbody>
                {outlook.stations.map((station) => (
                  <tr key={station.stationId} className="border-b border-[color:var(--divider)] last:border-0">
                    <td className="px-2 py-3 font-bold text-[color:var(--text)]">{station.label}</td>
                    <td className="px-2 py-3 text-[color:var(--muted)]">{station.role}</td>
                    <td className={`px-2 py-3 font-semibold ${flowColor(station.direction)}`}>
                      {flowLabel(station.direction)}
                    </td>
                    <td className="px-2 py-3 text-[color:var(--text-soft)]">{station.speedKt.toFixed(1)} kt</td>
                    <td className="px-2 py-3 text-[color:var(--text-soft)]">{formatDegrees(station.directionDeg)}</td>
                    <td className="px-2 py-3 text-[color:var(--muted)]">{station.nextSlackTime ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[color:var(--muted)]">
            <Waves size={14} className="mt-0.5 shrink-0" />
            NOAA station predictions describe water movement at each station. The channel-versus-shore recommendation belongs in a later layer that combines these readings with the observed wind direction.
          </p>
        </>
      )}
    </section>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] p-3">
      <div className="layline-kicker">{label}</div>
      <div className="mt-1 text-base font-black text-[color:var(--text)]">{value}</div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">{detail}</div>
    </div>
  );
}
