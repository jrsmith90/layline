"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppMode } from "@/components/display/AppModeProvider";
import { formatCourseLabel, getAllCourseIds, getCourseData } from "@/data/race/getCourseData";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";
import { LiveTacticalBoardCard } from "@/components/race/LiveTacticalBoardCard";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import { TackCalibrationPanel } from "@/components/race/TackCalibrationPanel";
import {
  getStoredTrackerStateSnapshot,
  isRecentTrackerTransition,
  setTrackerCourseId,
  setTrackerLegIndex,
  setTrackerTackAngle,
  setTrackerWindFrom,
  subscribeStoredTrackerState,
  syncAutomaticLegTransition,
} from "@/lib/race/legDetection";
import { type MarkProgressResult, wrap360 } from "@/lib/race/courseTracker";
import {
  getConfidencePanelCopy,
  getMarkApproachCopy,
  getTrackerRecommendationCopy,
} from "@/lib/race/liveViewMode";
import { deriveRaceState } from "@/lib/race/state/deriveRaceState";
import {
  selectActiveLeg,
  selectActiveMarks,
  selectConfidenceSignalsAtOrBelow,
  selectHasLowConfidence,
  selectIsApproachingMark,
  selectMarkProgress,
} from "@/lib/race/state/selectors";
import {
  getActiveRaceSession,
  syncRaceSessionsFromRepository,
} from "@/lib/raceSessionStore";
import {
  getKnownStandardTackAngle,
  getRaceDayHalfAngle,
  readTackCalibrations,
} from "@/lib/race/tackCalibration";

const courseIds = getAllCourseIds();
const MARK_APPROACH_DISTANCE_NM = 0.08;

function formatNumber(value: number | null, decimals = 1) {
  return value == null ? "--" : value.toFixed(decimals);
}

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function callClass(call: MarkProgressResult["call"]) {
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
  const { mode, isLearningMode } = useAppMode();
  const gps = usePhoneGps();
  const [trackerState, setTrackerState] = useState(() => getStoredTrackerStateSnapshot());
  const courseId = trackerState.courseId;
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);
  const legIndex = trackerState.legIndex;
  const windFrom = trackerState.windFrom;
  const [standardTackAngle, setStandardTackAngle] = useState<number | null>(() => {
    const session = getActiveRaceSession();
    return session
      ? getKnownStandardTackAngle(session.tackRecords, session.tackCalibrations)
      : null;
  });
  const fallbackTackAngle = useMemo(() => {
    const raceDayHalfAngle = getRaceDayHalfAngle(readTackCalibrations());
    return raceDayHalfAngle == null ? 42 : Math.round(raceDayHalfAngle);
  }, []);
  const tackAngle = trackerState.tackAngle ?? fallbackTackAngle;
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
          sourceMode: "manual",
          sourceLabel: "Manual wind",
          sourceDetail: "Manual override",
          directionFromDeg: windFrom === "" ? null : windFrom,
        },
        performance: {
          tackAngleDeg: tackAngle,
          standardTackAngleDeg: standardTackAngle,
        },
      }),
    [
      courseData,
      courseId,
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
      windFrom,
    ],
  );
  const safeLegIndex = raceState.course.safeLegIndex;

  useEffect(
    () => subscribeStoredTrackerState(() => setTrackerState(getStoredTrackerStateSnapshot())),
    [],
  );

  useEffect(() => {
    void syncRaceSessionsFromRepository();
  }, []);

  useEffect(() => {
    if (trackerState.tackAngle != null) return;
    setTrackerTackAngle(fallbackTackAngle);
  }, [fallbackTackAngle, trackerState.tackAngle]);

  useEffect(() => {
    const refreshStandardAngle = () => {
      const session = getActiveRaceSession();
      const nextAngle = session
        ? getKnownStandardTackAngle(session.tackRecords, session.tackCalibrations)
        : null;
      setStandardTackAngle(nextAngle);
      if (nextAngle != null) setTrackerTackAngle(Math.round(nextAngle));
    };

    refreshStandardAngle();
    const interval = window.setInterval(refreshStandardAngle, 1500);
    return () => window.clearInterval(interval);
  }, []);

  const leg = selectActiveLeg(raceState);
  const { fromMark, toMark } = selectActiveMarks(raceState);
  const canGoPrev = raceState.course.canGoPrev;
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

  const result = useMemo(() => {
    return selectMarkProgress(raceState);
  }, [raceState]);
  const approachingMark = selectIsApproachingMark(raceState, result);
  const trackerRecommendationCopy = useMemo(
    () => (result ? getTrackerRecommendationCopy({ mode, result }) : null),
    [mode, result],
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

  return (
    <div className="space-y-5">
      <LiveInstrumentsPanel context="route" />

      <TackCalibrationPanel
        onUseHalfAngle={(halfAngleDeg) => setTrackerTackAngle(Math.round(halfAngleDeg))}
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
              onChange={(event) => setTrackerCourseId(event.target.value)}
            >
              {courseIds.map((id) => (
                <option key={id} value={id} className="bg-slate-900">
                  {formatCourseLabel(id)}
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
              onChange={(event) =>
                setTrackerLegIndex(Number(event.target.value), { kind: "manual" })
              }
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
                if (value === "") return setTrackerWindFrom("");
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) setTrackerWindFrom(wrap360(parsed));
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
                if (!Number.isNaN(parsed)) {
                  setTrackerTackAngle(Math.min(60, Math.max(30, parsed)));
                }
              }}
            />
            {standardTackAngle != null ? (
              <div className="text-xs text-[color:var(--muted)]">
                Using race-day standard {formatDeg(standardTackAngle)}
              </div>
            ) : null}
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
        {recentTransition?.kind === "automatic" && (
          <div className="mt-3 rounded-xl border border-[color:var(--favorable)]/40 bg-[color:var(--favorable)]/10 px-3 py-2 text-xs font-semibold text-teal-50">
            {recentTransition.message}
          </div>
        )}
        {autoAdvanceArmed && (
          <div className="mt-3 text-xs font-semibold leading-5 text-[color:var(--muted)]">
            Auto-advance is armed for this rounding. If the leg does not change once
            you settle onto the next leg, use the manual controls here.
          </div>
        )}
      </section>

      <section className="layline-panel p-4">
        <div className="layline-kicker">Input Confidence</div>
        <div className="mt-2 text-lg font-black uppercase">
          {raceState.confidence.overall}
        </div>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
          {confidencePanelCopy.body}
        </p>
        {confidencePanelCopy.visibleSignals.length > 0 ? (
          <div className="mt-3 space-y-2 text-sm leading-5 text-[color:var(--text-soft)]">
            {confidencePanelCopy.visibleSignals.map((signal) => (
              <div key={signal.key}>{signal.message}</div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-[color:var(--text-soft)]">
            {confidencePanelCopy.fallback}
          </div>
        )}
      </section>

      <LiveTacticalBoardCard raceState={raceState} />

      {leg && fromMark && toMark && result && (
        <>
          {approachingMark && (
            <section className="rounded-2xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 p-4 text-teal-50">
              <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">
                Mark Rounding
              </div>
              <div className="mt-1 text-xl font-black">Approaching {leg.toMark}</div>
              <p className="mt-2 text-sm leading-5 opacity-85">
                {getMarkApproachCopy(mode, MARK_APPROACH_DISTANCE_NM)}
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
            <p className="mt-3 max-w-2xl text-sm leading-6 opacity-85">
              {trackerRecommendationCopy?.detail ?? result.detail}
            </p>
            {isLearningMode && trackerRecommendationCopy?.teachingNote && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 opacity-90">
                {trackerRecommendationCopy.teachingNote}
              </div>
            )}
            {(trackerRecommendationCopy?.visibleWarnings.length ?? 0) > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm opacity-85">
                {(trackerRecommendationCopy?.visibleWarnings ?? []).map((warning) => (
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
