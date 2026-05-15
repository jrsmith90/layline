"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppMode } from "@/components/display/AppModeProvider";
import { Flag, LocateFixed, TimerReset, Wind } from "lucide-react";
import { formatCourseLabel, getAllCourseIds, getCourseData } from "@/data/race/getCourseData";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import { LiveTacticalBoardCard } from "@/components/race/LiveTacticalBoardCard";
import { RaceRecorderPanel } from "@/components/race/RaceRecorderPanel";
import { TackHistoryPanel } from "@/components/race/TackHistoryPanel";
import { readJsonResponse } from "@/lib/readJsonResponse";
import {
  getStoredTrackerStateSnapshot,
  isRecentTrackerTransition,
  setTrackerCourseId,
  setTrackerLegIndex,
  setTrackerTackAngle,
  setTrackerWindFrom,
  setTrackerWindSource,
  subscribeStoredTrackerState,
  syncAutomaticLegTransition,
  type WindSourceMode,
} from "@/lib/race/legDetection";
import { type MarkProgressResult, wrap360 } from "@/lib/race/courseTracker";
import {
  getCockpitModeCopy,
  getConfidencePanelCopy,
} from "@/lib/race/liveViewMode";
import { deriveRaceState } from "@/lib/race/state/deriveRaceState";
import {
  selectActiveLeg,
  selectActiveMarks,
  selectConfidenceSignalsAtOrBelow,
  selectHasLowConfidence,
  selectIsApproachingMark,
  selectMarkProgress,
  selectPrimaryMarkCall,
} from "@/lib/race/state/selectors";
import {
  getActiveRaceSession,
  syncRaceSessionsFromRepository,
  type RaceSession,
} from "@/lib/raceSessionStore";
import { deriveTacticalBoardFromRaceState } from "@/lib/race/tacticalBoard/deriveTacticalBoardFromRaceState";
import {
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
  type TacticalBoardDraft,
} from "@/lib/race/tacticalBoard/store";
import {
  calculateTackCalibration,
  detectAutomaticTackCalibrations,
  getKnownStandardTackAngle,
  getRaceDayHalfAngle,
  mergeTackCalibrations,
  readTackCalibrations,
  saveTackCalibrations,
  type TackCalibrationResult,
} from "@/lib/race/tackCalibration";

const courseIds = getAllCourseIds();
const CALIBRATION_DURATION_MS = 35_000;
const MARK_APPROACH_DISTANCE_NM = 0.08;

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

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatNumber(value: number | null, decimals = 1) {
  return value == null ? "--" : value.toFixed(decimals);
}

function formatShortNumber(value: number | null, decimals = 1) {
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

function callClass(call: MarkProgressResult["call"] | "approach") {
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
  result: MarkProgressResult | null;
  approachingMark: boolean;
  markId?: string;
}) {
  const { result, approachingMark, markId } = params;

  if (approachingMark) {
    return {
      action: `ROUND ${markId ?? "MARK"}`,
      line: "At mark",
      why: "You are inside the mark approach circle.",
      fix: "Round cleanly and settle onto the next leg. If auto-advance does not fire, use Next Leg.",
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
      line: result.oppositeTackFetches ? "Wrong tack" : "Better angle",
      why: result.oppositeTackFetches
        ? "The opposite tack fetches the mark and this tack does not."
        : "Your heading has moved away from the learned tack angle, and the other tack aims closer to the mark.",
      fix: `Tack cleanly to ${formatDeg(result.nextTackHeadingDeg)}, accelerate first, then re-check bearing.`,
    };
  }

  if (result.call === "prepare_tack") {
    const tackPlan =
      result.distanceToTackNm != null
        ? ` Sail ${result.distanceToTackNm.toFixed(2)} nm${
            result.minutesToTack == null
              ? ""
              : ` / ${Math.max(1, Math.round(result.minutesToTack))} min`
          }, then tack to ${formatDeg(result.nextTackHeadingDeg)}.`
        : "";
    const why =
      result.tackHeadingDeviationDeg != null && result.tackHeadingDeviationDeg >= 15
        ? "COG has shifted sharply away from the learned tack heading."
        : result.oppositeTackGainDeg != null && result.oppositeTackGainDeg >= 8
          ? "The opposite tack is now a better angle toward the mark."
          : result.vmgToMarkKt != null && result.vmgToMarkKt < 0.4
            ? "VMG to the mark is weak."
            : "The opposite tack is lining up better than this one.";

    return {
      action: "GET READY",
      line: "Line getting worse",
      why,
      fix: tackPlan || "Build speed, find a clear lane, and tack if the trend holds.",
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
        ? `Tack to ${formatDeg(result.nextTackHeadingDeg)} if clear. If not, bear away until VMG turns positive.`
        : "Bear away for speed and get COG back toward the mark.",
    };
  }

  if (result.distanceToTackNm != null && result.distanceToTackNm > 0.03 && !result.currentTackFetches) {
    return {
      action: "HOLD",
      line: "Sail to layline",
      why: `${formatShortNumber(result.degreesOffLaylineDeg)} deg off direct layline, but this tack is setting up the next one.`,
      fix: `Sail ${result.distanceToTackNm.toFixed(2)} nm${
        result.minutesToTack == null
          ? ""
          : ` / ${Math.max(1, Math.round(result.minutesToTack))} min`
      }, then tack to ${formatDeg(result.nextTackHeadingDeg)}.`,
    };
  }

  return {
    action: "HOLD",
    line: result.currentTackFetches ? "On layline" : "Good enough",
    why: `${formatShortNumber(result.degreesOffLaylineDeg)} deg off layline. This tack is making useful progress toward the mark.`,
    fix: "Keep speed on. Re-check when bearing or pressure changes.",
  };
}

export default function RaceLiveCockpit() {
  const { mode, isRaceMode } = useAppMode();
  const gps = usePhoneGps();
  const [trackerState, setTrackerState] = useState(() => getStoredTrackerStateSnapshot());
  const [tacticalBoardDraft, setTacticalBoardDraft] = useState<TacticalBoardDraft>(() =>
    getStoredTacticalBoardDraft(),
  );
  const courseId = trackerState.courseId;
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);
  const legIndex = trackerState.legIndex;
  const windFrom = trackerState.windFrom;
  const windSource = trackerState.windSource;
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [calibrations, setCalibrations] =
    useState<TackCalibrationResult[]>(readTackCalibrations);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherPayload | null>(null);
  const [nearbyWind, setNearbyWind] = useState<NearbyWindPayload | null>(null);
  const [activeSession, setActiveSession] = useState<RaceSession | null>(() =>
    getActiveRaceSession(),
  );
  const [windError, setWindError] = useState<string | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const fallbackTackAngle = useMemo(
    () => Math.round(getRaceDayHalfAngle(calibrations) ?? 42),
    [calibrations],
  );
  const tackAngle = trackerState.tackAngle ?? fallbackTackAngle;

  const isCapturing = startedAtMs != null;
  const secondsLeft =
    startedAtMs == null
      ? 0
      : Math.max(0, Math.ceil((startedAtMs + CALIBRATION_DURATION_MS - nowMs) / 1000));

  useEffect(
    () => subscribeStoredTrackerState(() => setTrackerState(getStoredTrackerStateSnapshot())),
    [],
  );

  useEffect(() => {
    return subscribeTacticalBoardStore(() => {
      setTacticalBoardDraft(getStoredTacticalBoardDraft());
    });
  }, []);

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
    void syncRaceSessionsFromRepository();
  }, []);

  useEffect(() => {
    const refreshActiveSession = () => setActiveSession(getActiveRaceSession());
    refreshActiveSession();
    const interval = window.setInterval(refreshActiveSession, 1500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const detected = detectAutomaticTackCalibrations(gps.track);
    if (detected.length === 0) return;

    setCalibrations((current) => {
      const nextCalibrations = mergeTackCalibrations(current, detected);
      if (JSON.stringify(nextCalibrations) === JSON.stringify(current)) return current;
      saveTackCalibrations(nextCalibrations);
      const raceDayHalfAngle = getRaceDayHalfAngle(nextCalibrations);
      if (raceDayHalfAngle != null) setTrackerTackAngle(Math.round(raceDayHalfAngle));
      return nextCalibrations;
    });
  }, [gps.track]);

  useEffect(() => {
    if (startedAtMs == null) return;
    if (nowMs < startedAtMs + CALIBRATION_DURATION_MS) return;

    try {
      const calibration = calculateTackCalibration(gps.track, startedAtMs);
      const nextCalibrations = mergeTackCalibrations(calibrations, [calibration]);
      setCalibrations(nextCalibrations);
      saveTackCalibrations(nextCalibrations);
      setTrackerTackAngle(Math.round(calibration.halfAngleDeg));
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
  const standardTackAngle = useMemo(
    () =>
      getKnownStandardTackAngle(
        activeSession?.tackRecords ?? [],
        activeSession?.tackCalibrations ?? calibrations,
      ),
    [activeSession?.tackCalibrations, activeSession?.tackRecords, calibrations],
  );

  useEffect(() => {
    if (trackerState.tackAngle != null) return;
    setTrackerTackAngle(fallbackTackAngle);
  }, [fallbackTackAngle, trackerState.tackAngle]);

  useEffect(() => {
    if (standardTackAngle == null) return;
    setTrackerTackAngle(Math.round(standardTackAngle));
  }, [standardTackAngle]);

  const raceState = useMemo(
    () =>
      deriveRaceState({
        courseId,
        courseData,
        legIndex,
        markApproachDistanceNm: MARK_APPROACH_DISTANCE_NM,
        gps: {
          enabled: gps.enabled,
          supported: gps.supported,
          permission: gps.permission,
          lat: gps.lat,
          lon: gps.lon,
          cogDeg: gps.cogDeg,
          sogMps: gps.sogMps,
          accuracyM: gps.accuracyM,
          observedAt: gps.observedAt ?? null,
          freshness: gps.freshness,
          confidence: gps.confidence,
          error: gps.error,
        },
        wind: {
          sourceMode: windSource,
          sourceLabel: windRead.label,
          sourceDetail: windRead.sourceDetail,
          directionFromDeg: effectiveWindFrom,
          avgKt: windRead.windAvgKt ?? null,
          gustKt: windRead.windGustKt ?? null,
          observedAt: windRead.observedAt ?? null,
        },
        performance: {
          tackAngleDeg: tackAngle,
          standardTackAngleDeg: standardTackAngle,
        },
      }),
    [
      courseData,
      courseId,
      effectiveWindFrom,
      gps.accuracyM,
      gps.cogDeg,
      gps.enabled,
      gps.error,
      gps.lat,
      gps.lon,
      gps.observedAt,
      gps.permission,
      gps.sogMps,
      gps.supported,
      gps.confidence,
      gps.freshness,
      legIndex,
      standardTackAngle,
      tackAngle,
      windRead.label,
      windRead.observedAt,
      windRead.sourceDetail,
      windRead.windAvgKt,
      windRead.windGustKt,
      windSource,
    ],
  );
  const safeLegIndex = raceState.course.safeLegIndex;
  const leg = selectActiveLeg(raceState);
  const { toMark } = selectActiveMarks(raceState);
  const canGoNext = raceState.course.canGoNext;
  const confidenceSignals = useMemo(
    () => selectConfidenceSignalsAtOrBelow(raceState, "medium").slice(0, 3),
    [raceState],
  );
  const lowConfidence = selectHasLowConfidence(raceState);
  const confidencePanelCopy = useMemo(
    () =>
      getConfidencePanelCopy({
        mode,
        lowConfidence,
        signals: confidenceSignals,
      }),
    [confidenceSignals, lowConfidence, mode],
  );

  const tackContext = useMemo(
    () => ({
      windFromDeg: raceState.wind.directionFromDeg,
    }),
    [raceState.wind.directionFromDeg],
  );

  const result = useMemo(() => {
    return selectMarkProgress(raceState);
  }, [raceState]);

  const approachingMark = selectIsApproachingMark(raceState, result);
  const primaryCall = selectPrimaryMarkCall(raceState, result);
  const cockpitAnswer = getCockpitAnswer({
    result,
    approachingMark,
    markId: leg?.toMark,
  });
  const cockpitModeCopy = useMemo(
    () =>
      getCockpitModeCopy({
        mode,
        why: cockpitAnswer.why,
        fix: cockpitAnswer.fix,
        result,
      }),
    [cockpitAnswer.fix, cockpitAnswer.why, mode, result],
  );
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
          tackAngleDeg: tackAngle,
          standardTackAngleDeg: standardTackAngle,
          tackHeadingDeviationDeg: result.tackHeadingDeviationDeg,
          oppositeTackGainDeg: result.oppositeTackGainDeg,
          cogDeg: raceState.boat.cogDeg,
          sogMps: raceState.boat.sogMps,
          raceStateConfidence: raceState.confidence.overall,
          gpsFreshness: raceState.sources.gps.freshness,
          windFreshness: raceState.sources.wind.freshness,
        },
      }
    : null;
  const raceStateCapture = useMemo(
    () => ({
      state: raceState,
      progress: result,
      primaryCall,
      approachingMark,
    }),
    [approachingMark, primaryCall, raceState, result],
  );
  const tacticalBoardCapture = useMemo(
    () => ({
      liveBoard: deriveTacticalBoardFromRaceState({
        raceState,
        draft: tacticalBoardDraft,
      }),
      raceState,
    }),
    [raceState, tacticalBoardDraft],
  );
  const recentTransition =
    trackerState.lastTransition?.courseId === courseId &&
    trackerState.lastTransition.toLegIndex === safeLegIndex &&
    isRecentTrackerTransition(trackerState.lastTransition)
      ? trackerState.lastTransition
      : null;
  const autoAdvanceArmed =
    canGoNext &&
    trackerState.legDetection.armedLegIndex === safeLegIndex &&
    trackerState.legDetection.armedMarkId === leg?.toMark;

  useEffect(() => {
    if (!canGoNext) return;
    syncAutomaticLegTransition({
      courseData,
      raceState,
      result,
      approachingMark,
    });
  }, [approachingMark, canGoNext, courseData, raceState, result]);

  function goToLeg(nextIndex: number) {
    setTrackerLegIndex(nextIndex, { kind: "manual" });
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
            {formatCourseLabel(courseId)} · Leg {safeLegIndex + 1}
          </div>
        </div>
        <div className="mt-3 text-5xl font-black uppercase leading-none tracking-tight">
          {cockpitAnswer.action}
        </div>
        <div className="mt-3 inline-flex rounded-full border border-white/20 bg-black/20 px-3 py-1 text-sm font-black uppercase tracking-wide">
          {cockpitAnswer.line}
        </div>
        <div className="mt-4 space-y-3">
          {cockpitModeCopy.showWhy ? (
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] opacity-65">
                Why
              </div>
              <p className="mt-1 text-base font-semibold leading-6 opacity-95">
                {cockpitAnswer.why}
              </p>
            </div>
          ) : (
            <p className="text-base font-black leading-6">{cockpitModeCopy.primaryDetail}</p>
          )}
          {cockpitModeCopy.showFix && (
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] opacity-65">
                Fix
              </div>
              <p className="mt-1 text-base font-black leading-6">{cockpitAnswer.fix}</p>
            </div>
          )}
          {!isRaceMode && cockpitModeCopy.teachingNote && (
            <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
              <div className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
                Coach
              </div>
              <p className="mt-2 text-sm font-semibold leading-5 opacity-90">
                {cockpitModeCopy.teachingNote}
              </p>
            </div>
          )}
        </div>
        {cockpitModeCopy.visibleWarnings.length ? (
          <div className="mt-3 text-xs leading-5 opacity-80">
            {cockpitModeCopy.visibleWarnings.join(" ")}
          </div>
        ) : null}
        <div className="mt-3 rounded-2xl border border-white/15 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] opacity-75">
              Input confidence
            </div>
            <div className="text-xs font-black uppercase tracking-[0.16em] opacity-90">
              {raceState.confidence.overall}
            </div>
          </div>
          <p className="mt-2 text-sm font-semibold leading-5 opacity-90">
            {confidencePanelCopy.body}
          </p>
          {confidencePanelCopy.visibleSignals.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs leading-5 opacity-80">
              {confidencePanelCopy.visibleSignals.map((signal) => (
                <div key={signal.key}>{signal.message}</div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs leading-5 opacity-75">
              {confidencePanelCopy.fallback}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <BigMetric label="Off Line" value={`${formatNumber(result?.degreesOffLaylineDeg ?? null, 0)} deg`} />
          <BigMetric
            label="Tack Hdg"
            value={`${formatDeg(result?.currentTackHeadingDeg ?? null)} (${formatDeg(result?.nextTackHeadingDeg ?? null)})`}
          />
          <BigMetric
            label="Tack In"
            value={
              result?.distanceToTackNm == null
                ? "--"
                : result.minutesToTack == null
                  ? `${result.distanceToTackNm.toFixed(2)} nm`
                  : `${Math.max(1, Math.round(result.minutesToTack))}m`
            }
          />
        </div>
      </section>

      <LiveTacticalBoardCard raceState={raceState} />

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
        {recentTransition?.kind === "automatic" && (
          <div className="mt-3 rounded-xl border border-[color:var(--favorable)]/40 bg-[color:var(--favorable)]/10 px-3 py-2 text-xs font-semibold text-teal-50">
            {recentTransition.message}
          </div>
        )}
        {autoAdvanceArmed && (
          <div className="mt-3 text-xs font-semibold leading-5 text-[color:var(--muted)]">
            Auto-advance is armed for this rounding. If the leg does not flip once you
            settle onto the next leg, use the manual button.
          </div>
        )}
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

        <button
          type="button"
          onClick={() => setShowWeather((value) => !value)}
          className="mt-3 w-full rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 text-sm font-black uppercase tracking-wide"
        >
          {showWeather ? "Hide Weather Source" : "Show Weather Source"}
        </button>

        {showWeather && (
          <>

        <label className="mt-3 block space-y-1">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Change source
          </div>
          <select
            className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
            value={windSource}
            onChange={(event) => setTrackerWindSource(event.target.value as WindSourceMode)}
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
                if (value === "") return setTrackerWindFrom("");
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) setTrackerWindFrom(wrap360(parsed));
              }}
            />
          </label>
        )}

        {windError && (
          <div className="mt-3 rounded-xl border border-[color:var(--warning)] bg-[color:var(--warning)]/15 p-3 text-xs text-amber-50">
            {windError}
          </div>
        )}
          </>
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

      <TackHistoryPanel
        records={activeSession?.tackRecords ?? []}
        standardAngleDeg={standardTackAngle}
        currentTackAngleDeg={tackAngle}
        isRecording={activeSession?.status === "active"}
      />

      <button
        type="button"
        onClick={() => setShowSetup((value) => !value)}
        className="w-full rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 text-sm font-black uppercase tracking-wide"
      >
        {showSetup ? "Hide Course Setup" : "Show Course Setup"}
      </button>

      {showSetup && (
      <section className="layline-panel p-4">
        <div className="grid gap-2">
          <label className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Course
            </div>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={courseId}
              onChange={(event) => setTrackerCourseId(event.target.value)}
            >
              {courseIds.map((id) => (
                <option key={id} value={id} className="bg-slate-900">
                  {formatCourseLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <BigMetric label="X-track" value={`${formatNumber(result?.crossTrackErrorNm ?? null, 2)} nm`} />
        </div>
      </section>
      )}

      <RaceRecorderPanel
        courseId={courseId}
        gpsTrack={gps.track}
        currentDecision={recorderDecision}
        raceStateCapture={raceStateCapture}
        tacticalBoardCapture={tacticalBoardCapture}
        tackContext={tackContext}
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
