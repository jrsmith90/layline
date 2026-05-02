"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Flag, LocateFixed, TimerReset, Wind } from "lucide-react";
import { getAllCourseIds, getCourseData } from "@/data/race/getCourseData";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import { RaceRecorderPanel } from "@/components/race/RaceRecorderPanel";
import { readJsonResponse } from "@/lib/readJsonResponse";
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
  windSource?: WindSourceMode;
};

type WindSourceMode = "nearest" | "top" | "bottom" | "river" | "manual";

type LiveWeatherPayload = {
  stationName?: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  cbibsAnnapolis?: {
    platformName: string;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
  };
  thomasPoint?: {
    stationName: string;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
  };
  error?: string;
};

type NearbyWindPayload = {
  reportCount: number;
  reports: Array<{
    id: string;
    type: string;
    observedAt: string;
    distanceNm: number;
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
  }>;
  error?: string;
};

type WindRead = {
  label: string;
  sourceDetail: string;
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  observedAt?: string;
};

function readStoredTrackerState(): StoredTrackerState {
  if (
    typeof window === "undefined" ||
    typeof localStorage === "undefined" ||
    typeof localStorage.getItem !== "function"
  ) {
    return {};
  }

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

function formatKt(value?: number) {
  return typeof value === "number" ? `${value.toFixed(1)} kt` : "--";
}

function formatTime(value?: string) {
  if (!value) return "time unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

function readWindSourceMode(value: unknown): WindSourceMode {
  return value === "nearest" ||
    value === "top" ||
    value === "bottom" ||
    value === "river" ||
    value === "manual"
    ? value
    : "nearest";
}

function getWindRead(params: {
  source: WindSourceMode;
  manualWindFrom: number | "";
  liveWeather: LiveWeatherPayload | null;
  nearbyWind: NearbyWindPayload | null;
}): WindRead {
  const nearest = params.nearbyWind?.reports.find(
    (report) =>
      typeof report.windAvgKt === "number" ||
      typeof report.windDirectionDeg === "number",
  );

  if (params.source === "nearest") {
    return {
      label: nearest ? `${nearest.id} ${nearest.type}` : "Nearest wind marker",
      sourceDetail: nearest
        ? `${nearest.distanceNm.toFixed(1)} nm away · observed ${formatTime(nearest.observedAt)}`
        : "Turn on GPS to find the closest NDBC marker.",
      windAvgKt: nearest?.windAvgKt,
      windGustKt: nearest?.windGustKt,
      windDirectionDeg: nearest?.windDirectionDeg,
      observedAt: nearest?.observedAt,
    };
  }

  if (params.source === "top") {
    return {
      label: params.liveWeather?.cbibsAnnapolis?.platformName ?? "Annapolis buoy",
      sourceDetail: "Top-of-course source",
      windAvgKt: params.liveWeather?.cbibsAnnapolis?.windAvgKt,
      windGustKt: params.liveWeather?.cbibsAnnapolis?.windGustKt,
      windDirectionDeg: params.liveWeather?.cbibsAnnapolis?.windDirectionDeg,
    };
  }

  if (params.source === "bottom") {
    return {
      label: params.liveWeather?.thomasPoint?.stationName ?? "Thomas Point",
      sourceDetail: "Bottom-of-course source",
      windAvgKt: params.liveWeather?.thomasPoint?.windAvgKt,
      windGustKt: params.liveWeather?.thomasPoint?.windGustKt,
      windDirectionDeg: params.liveWeather?.thomasPoint?.windDirectionDeg,
    };
  }

  if (params.source === "river") {
    return {
      label: params.liveWeather?.stationName ?? "Naval Academy / KNAK",
      sourceDetail: "River source",
      windAvgKt: params.liveWeather?.windAvgKt,
      windGustKt: params.liveWeather?.windGustKt,
      windDirectionDeg: params.liveWeather?.windDirectionDeg,
    };
  }

  return {
    label: "Manual wind",
    sourceDetail: "Manual override",
    windDirectionDeg:
      typeof params.manualWindFrom === "number" ? params.manualWindFrom : undefined,
  };
}

function getCockpitAnswer(params: {
  result: ReturnType<typeof calculateMarkProgress> | null;
  approachingMark: boolean;
  markId?: string;
}) {
  const { result, approachingMark, markId } = params;

  if (approachingMark) {
    return {
      action: `ROUND ${markId ?? "MARK"}`,
      line: "At mark",
      why: "You are inside the mark approach circle.",
      fix: "Round cleanly, settle the boat, then tap Next Leg.",
    };
  }

  if (!result) {
    return {
      action: "STAND BY",
      line: "No course",
      why: "Course or mark data is not ready.",
      fix: "Select the course and current leg.",
    };
  }

  if (result.call === "need_gps") {
    return {
      action: "GPS ON",
      line: "Cannot judge line",
      why: "Layline needs live position and COG.",
      fix: "Turn on Phone GPS and build speed for a stable COG.",
    };
  }

  if (result.call === "set_wind") {
    return {
      action: "SET WIND",
      line: "Need wind source",
      why: "Without wind direction, Layline cannot compare this tack against the other tack.",
      fix: "Use nearest wind marker or enter wind manually.",
    };
  }

  if (result.call === "tack_now") {
    return {
      action: "TACK NOW",
      line: "Wrong tack",
      why: "The opposite tack fetches the mark and this tack does not.",
      fix: "Tack cleanly, accelerate first, then re-check bearing.",
    };
  }

  if (result.call === "prepare_tack") {
    return {
      action: "GET READY",
      line: "Line getting worse",
      why:
        result.vmgToMarkKt != null && result.vmgToMarkKt < 0.4
          ? "VMG to the mark is weak."
          : "The opposite tack is lining up better than this one.",
      fix: "Build speed, find a clear lane, and tack if the trend holds.",
    };
  }

  if (result.call === "overstood") {
    return {
      action: "FOOT FAST",
      line: "Overstood",
      why: "The mark is inside your layline, but COG is sailing extra distance.",
      fix: "Stop pinching. Sail fast toward the mark and protect speed.",
    };
  }

  if (result.call === "not_progressing") {
    return {
      action: "FIX NOW",
      line: "Not progressing",
      why: "Your COG is taking you away from the mark.",
      fix: result.oppositeHeadingErrorDeg != null && result.headingErrorDeg != null &&
        result.oppositeHeadingErrorDeg < result.headingErrorDeg
        ? "Tack if clear. If not, bear away until VMG turns positive."
        : "Bear away for speed and get COG back toward the mark.",
    };
  }

  return {
    action: "HOLD",
    line: result.currentTackFetches ? "On layline" : "Good enough",
    why: "This tack is making useful progress toward the mark.",
    fix: "Keep speed on. Re-check when bearing or pressure changes.",
  };
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
  const [windSource, setWindSource] = useState<WindSourceMode>(() => {
    const stored = readStoredTrackerState();
    return readWindSourceMode(stored.windSource);
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
  const [liveWeather, setLiveWeather] = useState<LiveWeatherPayload | null>(null);
  const [nearbyWind, setNearbyWind] = useState<NearbyWindPayload | null>(null);
  const [windError, setWindError] = useState<string | null>(null);

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
    if (
      typeof localStorage === "undefined" ||
      typeof localStorage.setItem !== "function"
    ) {
      return;
    }
    localStorage.setItem(
      TRACKER_STORAGE_KEY,
      JSON.stringify({
        courseId,
        legIndex: safeLegIndex,
        windFrom,
        windSource,
        tackAngle,
      })
    );
  }, [courseId, safeLegIndex, tackAngle, windFrom, windSource]);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveWeather() {
      try {
        const response = await fetch("/api/weather/noaa-wind", { cache: "no-store" });
        const data = await readJsonResponse<LiveWeatherPayload>(response);
        if (cancelled) return;
        if (!response.ok || data.error) {
          setWindError(data.error ?? "Live wind unavailable.");
          return;
        }
        setWindError(null);
        setLiveWeather(data);
      } catch (error) {
        if (!cancelled) {
          setWindError(error instanceof Error ? error.message : "Live wind unavailable.");
        }
      }
    }

    loadLiveWeather();
    const interval = window.setInterval(loadLiveWeather, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (gps.lat == null || gps.lon == null) {
      setNearbyWind(null);
      return;
    }

    let cancelled = false;

    async function loadNearbyWind() {
      try {
        const params = new URLSearchParams({
          lat: String(gps.lat),
          lon: String(gps.lon),
          radiusNm: "20",
          hours: "6",
        });
        const response = await fetch(`/api/weather/ship-reports?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await readJsonResponse<NearbyWindPayload>(response);
        if (cancelled) return;
        if (!response.ok || data.error) {
          setWindError(data.error ?? "Nearest wind unavailable.");
          setNearbyWind(null);
          return;
        }
        setWindError(null);
        setNearbyWind(data);
      } catch (error) {
        if (!cancelled) {
          setWindError(error instanceof Error ? error.message : "Nearest wind unavailable.");
          setNearbyWind(null);
        }
      }
    }

    loadNearbyWind();
    const interval = window.setInterval(loadNearbyWind, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [gps.lat, gps.lon]);

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

  const windRead = useMemo(
    () =>
      getWindRead({
        source: windSource,
        manualWindFrom: windFrom,
        liveWeather,
        nearbyWind,
      }),
    [liveWeather, nearbyWind, windFrom, windSource],
  );
  const effectiveWindFrom =
    typeof windRead.windDirectionDeg === "number" ? wrap360(windRead.windDirectionDeg) : null;

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
      windFromDeg: effectiveWindFrom,
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
    effectiveWindFrom,
  ]);

  const approachingMark =
    result?.distanceToMarkNm != null && result.distanceToMarkNm <= MARK_APPROACH_DISTANCE_NM;
  const primaryCall = approachingMark ? "approach" : result?.call ?? "need_gps";
  const cockpitAnswer = getCockpitAnswer({
    result,
    approachingMark,
    markId: leg?.toMark,
  });
  const recorderDecision = result
    ? {
        kind: approachingMark ? ("mark" as const) : ("route" as const),
        label: cockpitAnswer.action,
        recommendation: `${cockpitAnswer.line}. ${cockpitAnswer.why} ${cockpitAnswer.fix}`,
        inputs: {
          courseId,
          legIndex: safeLegIndex,
          leg: leg ? `${leg.fromMark}-${leg.toMark}` : null,
          call: primaryCall,
          distanceToMarkNm: result.distanceToMarkNm,
          bearingToMarkDeg: result.bearingToMarkDeg,
          vmgToMarkKt: result.vmgToMarkKt,
          windSource,
          windSourceLabel: windRead.label,
          windSpeedKt: windRead.windAvgKt,
          windFromDeg: effectiveWindFrom,
          cogDeg: gps.cogDeg,
          sogMps: gps.sogMps,
        },
      }
    : null;

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
          {cockpitAnswer.action}
        </div>
        <div className="mt-3 inline-flex rounded-full border border-white/20 bg-black/20 px-3 py-1 text-sm font-black uppercase tracking-wide">
          {cockpitAnswer.line}
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] opacity-65">
              Why
            </div>
            <p className="mt-1 text-base font-semibold leading-6 opacity-95">
              {cockpitAnswer.why}
            </p>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] opacity-65">
              Fix
            </div>
            <p className="mt-1 text-base font-black leading-6">{cockpitAnswer.fix}</p>
          </div>
        </div>
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <BigMetric label="Distance" value={`${formatNumber(result?.distanceToMarkNm ?? null, 2)} nm`} />
          <BigMetric label="Bearing" value={formatDeg(result?.bearingToMarkDeg ?? null)} />
          <BigMetric label="VMG" value={`${formatNumber(result?.vmgToMarkKt ?? null, 1)} kt`} />
        </div>
      </section>

      <section className="layline-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="layline-kicker">Wind Source</div>
            <div className="mt-1 text-lg font-black">{windRead.label}</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {windRead.sourceDetail}
            </div>
          </div>
          <Wind className="mt-1 text-[color:var(--muted)]" size={20} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <BigMetric label="Wind" value={formatKt(windRead.windAvgKt)} />
          <BigMetric label="Gust" value={formatKt(windRead.windGustKt)} />
          <BigMetric label="From" value={formatDeg(effectiveWindFrom)} />
        </div>

        <label className="mt-3 block space-y-1">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Change source
          </div>
          <select
            className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
            value={windSource}
            onChange={(event) => setWindSource(event.target.value as WindSourceMode)}
          >
            <option value="nearest" className="bg-slate-900">
              Nearest wind marker
            </option>
            <option value="top" className="bg-slate-900">
              Annapolis buoy - top
            </option>
            <option value="bottom" className="bg-slate-900">
              Thomas Point - bottom
            </option>
            <option value="river" className="bg-slate-900">
              KNAK - river
            </option>
            <option value="manual" className="bg-slate-900">
              Manual wind
            </option>
          </select>
        </label>

        {windSource === "manual" && (
          <label className="mt-3 block space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Manual Wind From
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
        )}

        {windError && (
          <div className="mt-3 rounded-xl border border-[color:var(--warning)] bg-[color:var(--warning)]/15 p-3 text-xs text-amber-50">
            {windError}
          </div>
        )}
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

          <BigMetric label="X-track" value={`${formatNumber(result?.crossTrackErrorNm ?? null, 2)} nm`} />
        </div>
      </section>

      <RaceRecorderPanel
        courseId={courseId}
        gpsTrack={gps.track}
        currentDecision={recorderDecision}
      />

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
