"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllCourseIds, getCourseData } from "@/data/race/getCourseData";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import { TackCalibrationPanel } from "@/components/race/TackCalibrationPanel";
import { calculateMarkProgress, wrap360 } from "@/lib/race/courseTracker";
import { getRaceDayHalfAngle, readTackCalibrations } from "@/lib/race/tackCalibration";

const courseIds = getAllCourseIds();
const TRACKER_STORAGE_KEY = "layline-active-course-tracker-v1";
const MARK_APPROACH_DISTANCE_NM = 0.08;

type StoredTrackerState = {
  courseId?: string;
  legIndex?: number;
  windFrom?: number | "";
  tackAngle?: number;
};

function readStoredTrackerState(): StoredTrackerState {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed != null ? parsed : {};
  } catch {
    return {};
  }
}

function formatNumber(value: number | null, decimals = 1) {
  return value == null ? "--" : value.toFixed(decimals);
}

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function callClass(call: ReturnType<typeof calculateMarkProgress>["call"]) {
  if (call === "tack_now" || call === "not_progressing") {
    return "border-[color:var(--unfavorable)] bg-[color:var(--unfavorable)]/15 text-red-100";
  }

  if (call === "prepare_tack" || call === "overstood" || call === "set_wind") {
    return "border-[color:var(--warning)] bg-[color:var(--warning)]/15 text-amber-100";
  }

  if (call === "hold") {
    return "border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 text-teal-50";
  }

  return "border-[color:var(--divider)] bg-black/20 text-[color:var(--text-soft)]";
}

export default function ActiveCourseTracker() {
  const gps = usePhoneGps();
  const [courseId, setCourseId] = useState<string>(() => {
    const stored = readStoredTrackerState();
    return stored.courseId && courseIds.some((id) => id === stored.courseId)
      ? stored.courseId
      : courseIds[0] ?? "1";
  });
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);
  const [legIndex, setLegIndex] = useState(() => {
    const stored = readStoredTrackerState();
    return typeof stored.legIndex === "number" ? stored.legIndex : 0;
  });
  const [windFrom, setWindFrom] = useState<number | "">(() => {
    const stored = readStoredTrackerState();
    return typeof stored.windFrom === "number" ? stored.windFrom : "";
  });
  const [tackAngle, setTackAngle] = useState(() => {
    const stored = readStoredTrackerState();
    if (typeof stored.tackAngle === "number") return stored.tackAngle;
    const raceDayHalfAngle = getRaceDayHalfAngle(readTackCalibrations());
    return raceDayHalfAngle == null ? 42 : Math.round(raceDayHalfAngle);
  });
  const safeLegIndex = Math.min(legIndex, Math.max(courseData.course.legs.length - 1, 0));

  useEffect(() => {
    localStorage.setItem(
      TRACKER_STORAGE_KEY,
      JSON.stringify({
        courseId,
        legIndex: safeLegIndex,
        windFrom,
        tackAngle,
      })
    );
  }, [courseId, safeLegIndex, tackAngle, windFrom]);

  const leg = courseData.course.legs[safeLegIndex];
  const fromMark = leg ? courseData.marks[leg.fromMark] : null;
  const toMark = leg ? courseData.marks[leg.toMark] : null;
  const canGoPrev = safeLegIndex > 0;
  const canGoNext = safeLegIndex < courseData.course.legs.length - 1;

  const result = useMemo(() => {
    if (!leg || !fromMark || !toMark) return null;

    return calculateMarkProgress({
      position:
        gps.lat == null || gps.lon == null
          ? null
          : {
              lat: gps.lat,
              lon: gps.lon,
            },
      cogDeg: gps.cogDeg,
      sogMps: gps.sogMps,
      accuracyM: gps.accuracyM,
      windFromDeg: windFrom === "" ? null : windFrom,
      tackAngleDeg: tackAngle,
      leg,
      fromMark,
      toMark,
    });
  }, [
    fromMark,
    gps.accuracyM,
    gps.cogDeg,
    gps.lat,
    gps.lon,
    gps.sogMps,
    leg,
    tackAngle,
    toMark,
    windFrom,
  ]);
  const approachingMark =
    result?.distanceToMarkNm != null && result.distanceToMarkNm <= MARK_APPROACH_DISTANCE_NM;

  function goToLeg(nextIndex: number) {
    setLegIndex(Math.min(Math.max(nextIndex, 0), courseData.course.legs.length - 1));
  }

  return (
    <div className="space-y-5">
      <LiveInstrumentsPanel context="route" />

      <TackCalibrationPanel
        onUseHalfAngle={(halfAngleDeg) => setTackAngle(Math.round(halfAngleDeg))}
      />

      <section className="layline-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="layline-kicker">Active Course</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Mark Progress</h1>
          </div>
          <div className="text-right text-xs text-[color:var(--muted)]">
            <div>{courseData.totalDistanceNmSI ?? courseData.totalDistanceNmCalculated ?? "--"} nm</div>
            <div>
              Leg {safeLegIndex + 1}/{courseData.course.legs.length}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Course
            </div>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setLegIndex(0);
              }}
            >
              {courseIds.map((id) => (
                <option key={id} value={id} className="bg-slate-900">
                  Course {id}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Current Leg
            </div>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={legIndex}
              onChange={(event) => setLegIndex(Number(event.target.value))}
            >
              {courseData.course.legs.map((courseLeg, index) => (
                <option key={courseLeg.legNumber} value={index} className="bg-slate-900">
                  {courseLeg.legNumber}: {courseLeg.fromMark} to {courseLeg.toMark}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Wind From
            </div>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              placeholder="225"
              value={windFrom}
              onChange={(event) => {
                const value = event.target.value.trim();
                if (value === "") return setWindFrom("");
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) setWindFrom(wrap360(parsed));
              }}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Tack Angle
            </div>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={tackAngle}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (!Number.isNaN(parsed)) setTackAngle(Math.min(60, Math.max(30, parsed)));
              }}
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => goToLeg(safeLegIndex - 1)}
            disabled={!canGoPrev}
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
          >
            Prev Leg
          </button>
          <button
            type="button"
            onClick={() => goToLeg(safeLegIndex + 1)}
            disabled={!canGoNext}
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
          >
            Next Leg
          </button>
        </div>
      </section>

      {leg && fromMark && toMark && result && (
        <>
          {approachingMark && (
            <section className="rounded-2xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 p-4 text-teal-50">
              <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">
                Mark Rounding
              </div>
              <div className="mt-1 text-xl font-black">Approaching {leg.toMark}</div>
              <p className="mt-2 text-sm leading-5 opacity-85">
                You are within about {MARK_APPROACH_DISTANCE_NM.toFixed(2)} nm of the next mark.
                Confirm the rounding, then advance to the next leg.
              </p>
              <button
                type="button"
                onClick={() => goToLeg(safeLegIndex + 1)}
                disabled={!canGoNext}
                className="mt-3 rounded-xl border border-teal-100/40 bg-black/20 px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
              >
                Advance to Leg {safeLegIndex + 2}
              </button>
            </section>
          )}

          <section className={["rounded-2xl border p-5", callClass(result.call)].join(" ")}>
            <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">
              Recommendation
            </div>
            <div className="mt-2 text-3xl font-black uppercase tracking-tight">
              {result.headline}
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 opacity-85">{result.detail}</p>
            {result.warnings.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm opacity-85">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="layline-panel p-4">
            <div className="layline-kicker">Next Mark</div>
            <div className="mt-2 text-lg font-bold">
              {leg.fromMark} to {leg.toMark}: {toMark.name}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Distance" value={`${formatNumber(result.distanceToMarkNm, 2)} nm`} />
              <Metric label="Bearing" value={formatDeg(result.bearingToMarkDeg)} />
              <Metric label="VMG" value={`${formatNumber(result.vmgToMarkKt, 1)} kt`} />
              <Metric
                label="X-track"
                value={`${formatNumber(result.crossTrackErrorNm, 2)} nm`}
              />
            </div>
          </section>

          <section className="layline-panel p-4">
            <div className="layline-kicker">Layline Read</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Current tack
                </div>
                <div className="mt-2 text-xl font-black">
                  {result.currentTack ?? "--"}{" "}
                  {result.currentTackHeadingDeg != null
                    ? `· ${formatDeg(result.currentTackHeadingDeg)}`
                    : ""}
                </div>
                <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                  {result.currentTackFetches ? "Fetches the mark" : "Does not fetch yet"}
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Opposite tack
                </div>
                <div className="mt-2 text-xl font-black">
                  {result.oppositeTackHeadingDeg != null
                    ? formatDeg(result.oppositeTackHeadingDeg)
                    : "--"}
                </div>
                <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                  {result.oppositeTackFetches ? "Fetches the mark" : "Still below layline"}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}
