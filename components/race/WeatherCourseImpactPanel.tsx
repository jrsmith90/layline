"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Wind } from "lucide-react";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";
import { assessCourseWaterImpact } from "@/lib/weather/courseWaterImpact";

const DEFAULT_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

type ForecastPeriod = {
  timeISO: string;
  windAvgKts?: number;
  windGustKts?: number;
  windDirectionDeg?: number;
};

type CurrentStation = {
  label: string;
  direction: "flood" | "ebb" | "slack" | "unknown";
  directionDeg: number | null;
  speedKt: number;
};

type WeatherPlan = {
  forecast: ForecastPeriod | null;
  current: CurrentStation | null;
  tide: { heightFt: number | null; stage: string } | null;
  error: string | null;
};

function formatDegrees(value: number | null | undefined) {
  return value == null ? "--" : `${Math.round(value)}°`;
}

function formatSignedKt(value: number | null) {
  if (value == null) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} kt`;
}

function getCourseCenter(marks: Array<{ lat: number; lon: number }>) {
  if (marks.length === 0) return null;
  return {
    lat: marks.reduce((sum, mark) => sum + mark.lat, 0) / marks.length,
    lon: marks.reduce((sum, mark) => sum + mark.lon, 0) / marks.length,
  };
}

function selectForecast(periods: ForecastPeriod[], target: Date) {
  if (!Number.isFinite(target.getTime())) return null;

  const targetMs = target.getTime();
  const nearest = periods
    .map((period) => ({ period, distance: Math.abs(new Date(period.timeISO).getTime() - targetMs) }))
    .filter((item) => Number.isFinite(item.distance))
    .toSorted((a, b) => a.distance - b.distance)[0];

  // An hourly forecast is only useful when it actually covers the planned race window.
  return nearest && nearest.distance <= 90 * 60 * 1000 ? nearest.period : null;
}

function labelForStatus(status: "favorable" | "adverse" | "neutral" | "unworkable") {
  if (status === "favorable") return "Helps progress";
  if (status === "adverse") return "Costs progress";
  if (status === "unworkable") return "Too strong to hold track";
  return "Mostly cross-current";
}

export function WeatherCourseImpactPanel() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_DRAFT,
  );
  const courseData = useResolvedCourseData(draft.courseId);
  const [plan, setPlan] = useState<WeatherPlan>({
    forecast: null,
    current: null,
    tide: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  const center = useMemo(
    () =>
      getCourseCenter(
        Object.values(courseData.marks).flatMap((mark) =>
          mark ? [{ lat: mark.lat, lon: mark.lon }] : [],
        ),
      ),
    [courseData.marks],
  );

  useEffect(() => {
    if (!center || !draft.raceStartDate || !draft.raceStartTime) {
      return;
    }

    const controller = new AbortController();
    const plannedStart = new Date(`${draft.raceStartDate}T${draft.raceStartTime}:00`);

    Promise.all([
      fetch(`/api/weather/point-forecast?lat=${center.lat}&lon=${center.lon}`, { signal: controller.signal }).then(
        async (response) => (response.ok ? response.json() : Promise.reject(new Error("Wind forecast unavailable"))),
      ),
      fetch(
        `/api/weather/tide-current?eventId=${encodeURIComponent(courseData.eventId)}&date=${draft.raceStartDate}&time=${draft.raceStartTime}`,
        { signal: controller.signal },
      ).then(async (response) => (response.ok ? response.json() : Promise.reject(new Error("Tide and current unavailable")))),
    ])
      .then(([forecastPayload, waterPayload]) => {
        const forecast = selectForecast(forecastPayload.hourly ?? [], plannedStart);
        const currents = (waterPayload.currentStations ?? []) as CurrentStation[];
        const usableCurrent = currents
          .filter((station) => station.directionDeg != null && station.speedKt > 0.05)
          .toSorted((a, b) => b.speedKt - a.speedKt)[0] ?? null;

        setPlan({
          forecast,
          current: usableCurrent,
          tide: waterPayload.tide
            ? { heightFt: waterPayload.tide.heightFt ?? null, stage: waterPayload.tide.stage ?? "unknown" }
            : null,
          error: forecast ? null : "NOAA has not published an hourly forecast for this planned start yet.",
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setPlan({ forecast: null, current: null, tide: null, error: "Weather data could not be loaded right now." });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [center, courseData.eventId, draft.raceStartDate, draft.raceStartTime]);

  const forecastWindSpeedKt = plan.forecast?.windAvgKts;
  const forecastWindFromDeg = plan.forecast?.windDirectionDeg;
  const currentToDeg = plan.current?.directionDeg;
  const currentSpeedKt = plan.current?.speedKt;
  const impacts =
    forecastWindSpeedKt == null ||
    forecastWindFromDeg == null ||
    currentToDeg == null ||
    currentSpeedKt == null
      ? []
      : courseData.course.legs.map((leg) => ({
          leg,
          impact: assessCourseWaterImpact({
            legBearingDeg: leg.bearingDeg,
            windFromDeg: forecastWindFromDeg,
            windSpeedKt: forecastWindSpeedKt,
            currentToDeg,
            currentSpeedKt,
          }),
        }));

  return (
    <section className="layline-panel bg-[color:var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="layline-kicker">Forecast Impact</div>
          <h2 className="mt-1 text-xl font-black text-[color:var(--text)]">
            Wind and water effect by leg
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-soft)]">
            Forecast boat speed through the water, then resolve the predicted current into speed along the leg and a steering correction.
          </p>
        </div>
        <div className="text-right text-xs text-[color:var(--muted)]">
          {draft.raceStartDate} · {draft.raceStartTime}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 text-sm text-[color:var(--muted)]">Loading NOAA forecast and current predictions...</div>
      ) : plan.error && impacts.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-[color:var(--divider)] p-4 text-sm text-[color:var(--text-soft)]">
          {plan.error}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Forecast wind"
              value={
                plan.forecast?.windAvgKts == null
                  ? "--"
                  : `${plan.forecast.windAvgKts.toFixed(1)} kt · ${formatDegrees(plan.forecast.windDirectionDeg)}`
              }
              detail={plan.forecast?.windGustKts ? `gusts ${plan.forecast.windGustKts.toFixed(1)} kt` : "NOAA hourly forecast"}
            />
            <SummaryMetric
              label="Current"
              value={plan.current ? `${plan.current.speedKt.toFixed(1)} kt ${plan.current.direction}` : "Slack / unavailable"}
              detail={plan.current ? `${plan.current.label} · flowing ${formatDegrees(plan.current.directionDeg)}` : "NOAA current prediction"}
            />
            <SummaryMetric
              label="Tide"
              value={plan.tide?.heightFt == null ? "--" : `${plan.tide.heightFt.toFixed(1)} ft`}
              detail={plan.tide?.stage ?? "NOAA tide prediction"}
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[color:var(--divider)] text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
                <tr>
                  <th className="px-2 py-3">Leg</th>
                  <th className="px-2 py-3">Wind angle</th>
                  <th className="px-2 py-3">Water target</th>
                  <th className="px-2 py-3">Current effect</th>
                  <th className="px-2 py-3">Steer correction</th>
                  <th className="px-2 py-3">Expected course speed</th>
                </tr>
              </thead>
              <tbody>
                {impacts.map(({ leg, impact }) => (
                  <tr key={leg.legNumber} className="border-b border-[color:var(--divider)] last:border-0">
                    <td className="px-2 py-3 font-bold text-[color:var(--text)]">
                      {leg.legNumber} <span className="font-normal text-[color:var(--muted)]">· {formatDegrees(leg.bearingDeg)}</span>
                    </td>
                    <td className="px-2 py-3 text-[color:var(--text-soft)]">{Math.round(impact.baseWindAngleDeg)}°</td>
                    <td className="px-2 py-3 text-[color:var(--text-soft)]">{impact.targetBoatSpeedKt.toFixed(1)} kt</td>
                    <td className="px-2 py-3">
                      <div className={impact.status === "favorable" ? "text-[color:var(--favorable)]" : impact.status === "adverse" ? "text-[color:var(--unfavorable)]" : "text-[color:var(--text-soft)]"}>
                        {labelForStatus(impact.status)} · {formatSignedKt(impact.speedDeltaKt)}
                      </div>
                      <div className="mt-0.5 text-xs text-[color:var(--muted)]">along leg {formatSignedKt(impact.currentAlongCourseKt)}</div>
                    </td>
                    <td className="px-2 py-3 text-[color:var(--text-soft)]">
                      {impact.headingCorrectionDeg == null ? "--" : `${impact.headingCorrectionDeg > 0 ? "+" : ""}${Math.round(impact.headingCorrectionDeg)}°`}
                    </td>
                    <td className="px-2 py-3 font-bold text-[color:var(--text)]">
                      {impact.courseSpeedKt == null ? "Cannot hold course" : `${impact.courseSpeedKt.toFixed(1)} kt`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[color:var(--muted)]">
            <Wind size={14} className="mt-0.5 shrink-0" />
            Current direction is the direction the water is flowing. The water target is a provisional Cal 25-style polar; replace it with your calibrated polar once boat data is connected.
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
