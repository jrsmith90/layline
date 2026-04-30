"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Flag, LocateFixed, TimerReset } from "lucide-react";
import { getAllCourseIds, getCourseData } from "@/data/race/getCourseData";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import { calculateMarkProgress, wrap360 } from "@/lib/race/courseTracker";
import {
  calculateTackCalibration,
  getRaceDayHalfAngle,
  readTackCalibrations,
  saveTackCalibrations,
  type TackCalibrationResult,
} from "@/lib/race/tackCalibration";

const courseIds = getAllCourseIds();
const TRACKER_STORAGE_KEY = "layline-active-course-tracker-v1";
const CALIBRATION_DURATION_MS = 35_000;
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

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatNumber(value: number | null, decimals = 1) {
  return value == null ? "--" : value.toFixed(decimals);
}

function formatSpeedKt(sogMps: number | null) {
  return sogMps == null ? "--" : `${(sogMps * 1.943844).toFixed(1)} kt`;
}

function callClass(call: ReturnType<typeof calculateMarkProgress>["call"] | "approach") {
  if (call === "tack_now" || call === "not_progressing") {
    return "border-[color:var(--unfavorable)] bg-[color:var(--unfavorable)]/20 text-red-50";
  }

  if (call === "prepare_tack" || call === "overstood" || call === "set_wind") {
    return "border-[color:var(--warning)] bg-[color:var(--warning)]/20 text-amber-50";
  }

  if (call === "hold" || call === "approach") {
    return "border-[color:var(--favorable)] bg-[color:var(--favorable)]/20 text-teal-50";
  }

  return "border-[color:var(--divider)] bg-black/20 text-[color:var(--text-soft)]";
}

export default function RaceLiveCockpit() {
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
    return Math.round(getRaceDayHalfAngle(readTackCalibrations()) ?? 42);
  });
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [calibrations, setCalibrations] =
    useState<TackCalibrationResult[]>(readTackCalibrations);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const safeLegIndex = Math.min(legIndex, Math.max(courseData.course.legs.length - 1, 0));
  const leg = courseData.course.legs[safeLegIndex];
  const fromMark = leg ? courseData.marks[leg.fromMark] : null;
  const toMark = leg ? courseData.marks[leg.toMark] : null;
  const canGoNext = safeLegIndex < courseData.course.legs.length - 1;
  const isCapturing = startedAtMs != null;
  const secondsLeft =
    startedAtMs == null
      ? 0
      : Math.max(0, Math.ceil((startedAtMs + CALIBRATION_DURATION_MS - nowMs) / 1000));

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

  useEffect(() => {
    if (!isCapturing) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isCapturing]);

  useEffect(() => {
    if (startedAtMs == null) return;
    if (nowMs < startedAtMs + CALIBRATION_DURATION_MS) return;

    try {
      const calibration = calculateTackCalibration(gps.track, startedAtMs);
      const nextCalibrations = [...calibrations, calibration].slice(-10);
      setCalibrations(nextCalibrations);
      saveTackCalibrations(nextCalibrations);
      setTackAngle(Math.round(calibration.halfAngleDeg));
      setCalibrationError(null);
    } catch (error) {
      setCalibrationError(
        error instanceof Error ? error.message : "Could not calculate tack angle."
      );
    } finally {
      setStartedAtMs(null);
    }
  }, [calibrations, gps.track, nowMs, startedAtMs]);

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
  const primaryCall = approachingMark ? "approach" : result?.call ?? "need_gps";
  const headline = approachingMark ? `Round ${leg?.toMark ?? "Mark"}` : result?.headline ?? "Stand by";
  const detail = approachingMark
    ? "Confirm the rounding and advance to the next leg."
    : result?.detail ?? "Select a course and turn on Phone GPS.";

  function goToLeg(nextIndex: number) {
    setLegIndex(Math.min(Math.max(nextIndex, 0), courseData.course.legs.length - 1));
  }

  function startCapture() {
    if (!gps.enabled) gps.setEnabled(true);
    setCalibrationError(null);
    const now = Date.now();
    setNowMs(now);
    setStartedAtMs(now);
  }

  return (
    <main className="mx-auto max-w-md space-y-3 px-3 pb-28 pt-3">
      <section className={["rounded-2xl border p-5", callClass(primaryCall)].join(" ")}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] opacity-75">
            Race Live
          </div>
          <div className="text-xs font-bold uppercase tracking-wide opacity-75">
            Course {courseId} · Leg {safeLegIndex + 1}
          </div>
        </div>
        <div className="mt-3 text-5xl font-black uppercase leading-none tracking-tight">
          {headline}
        </div>
        <p className="mt-4 text-base font-semibold leading-6 opacity-90">{detail}</p>
        {result?.warnings.length ? (
          <div className="mt-3 text-xs leading-5 opacity-80">{result.warnings.join(" ")}</div>
        ) : null}
      </section>

      <section className="layline-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="layline-kicker">Next Mark</div>
            <div className="mt-1 text-xl font-black">
              {leg ? `${leg.fromMark} to ${leg.toMark}` : "--"}
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {toMark?.name ?? "No mark selected"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => goToLeg(safeLegIndex + 1)}
            disabled={!canGoNext}
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide disabled:opacity-40"
          >
            Next Leg
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <BigMetric label="Distance" value={`${formatNumber(result?.distanceToMarkNm ?? null, 2)} nm`} />
          <BigMetric label="Bearing" value={formatDeg(result?.bearingToMarkDeg ?? null)} />
          <BigMetric label="VMG" value={`${formatNumber(result?.vmgToMarkKt ?? null, 1)} kt`} />
          <BigMetric label="X-track" value={`${formatNumber(result?.crossTrackErrorNm ?? null, 2)} nm`} />
        </div>
      </section>

      <section className="layline-panel p-4">
        <div className="grid grid-cols-3 gap-2">
          <BigMetric label="COG" value={formatDeg(gps.cogDeg)} />
          <BigMetric label="SOG" value={formatSpeedKt(gps.sogMps)} />
          <BigMetric label="Tack" value={`${Math.round(tackAngle)} deg`} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={gps.toggle}
            className={[
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-black uppercase tracking-wide",
              gps.enabled
                ? "border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 text-teal-50"
                : "border-[color:var(--divider)] bg-black/20",
            ].join(" ")}
          >
            <LocateFixed size={16} />
            GPS {gps.enabled ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={startCapture}
            disabled={isCapturing}
            className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--warning)] bg-[color:var(--warning)]/15 px-3 py-4 text-sm font-black uppercase tracking-wide text-amber-50 disabled:opacity-70"
          >
            <TimerReset size={16} />
            {isCapturing ? `${secondsLeft}s` : "Capture Tack"}
          </button>
        </div>

        {calibrationError && (
          <div className="mt-3 rounded-xl border border-[color:var(--unfavorable)] bg-[color:var(--unfavorable)]/15 p-3 text-sm text-red-100">
            {calibrationError}
          </div>
        )}
      </section>

      <section className="layline-panel p-4">
        <div className="grid gap-2">
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
        </div>
      </section>

      <div className="flex items-center justify-between px-1 text-xs text-[color:var(--muted)]">
        <Link href="/race/tracker" className="font-bold uppercase tracking-wide">
          Full Tracker
        </Link>
        <span className="flex items-center gap-1">
          <Flag size={13} />
          {calibrations.length} tack samples
        </span>
      </div>
    </main>
  );
}

function BigMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black leading-none text-[color:var(--text)]">
        {value}
      </div>
    </div>
  );
}
