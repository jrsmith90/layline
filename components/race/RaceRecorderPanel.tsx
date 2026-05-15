"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { Circle, Download, Flag, NotebookPen, Square } from "lucide-react";
import type { GpsTrackPoint } from "@/lib/useGpsCourse";
import {
  addManualRaceNote,
  appendRaceDecision,
  appendRaceGpsSamples,
  appendRaceStateSnapshot,
  appendTacticalBoardSnapshot,
  appendRaceWeatherSample,
  attachTackCalibrationsToSession,
  attachTrimLogsToSession,
  buildRaceDecisionSourceMeta,
  downloadTextFile,
  endRaceSession,
  exportRaceSessionJson,
  getActiveRaceSession,
  getRaceSession,
  recoverRaceSessionsFromRepository,
  recoverTodayRaceSession,
  startRaceSession,
  subscribeRaceSessionStore,
  type RaceSessionRepositoryRecoveryResult,
  type RaceDecisionSourceMeta,
  type RaceStateSnapshotCaptureInput,
  type TacticalBoardSnapshotCaptureInput,
  type RaceWeatherSample,
} from "@/lib/raceSessionStore";
import { getLogs } from "@/lib/logStore";
import { readTackCalibrations } from "@/lib/race/tackCalibration";
import { readJsonResponse } from "@/lib/readJsonResponse";

type WeatherPayload = {
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  historyTrend?: {
    trend: "building" | "easing" | "steady" | "unknown";
  };
  cbibsAnnapolis?: {
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
    waveHeightFt?: number;
    wavePeriodSec?: number;
  };
  thomasPoint?: {
    windAvgKt?: number;
    windGustKt?: number;
    windDirectionDeg?: number;
    trend?: {
      trend: "building" | "easing" | "steady" | "unknown";
    };
  };
  error?: string;
};

export type RecorderDecisionInput = {
  kind: "route" | "tack" | "mark";
  label: string;
  recommendation: string;
  inputs?: Record<string, unknown>;
  sourceMeta?: RaceDecisionSourceMeta;
};

type RaceRecorderPanelProps = {
  courseId: string;
  gpsTrack: GpsTrackPoint[];
  currentDecision?: RecorderDecisionInput | null;
  raceStateCapture?: RaceStateSnapshotCaptureInput | null;
  tacticalBoardCapture?: TacticalBoardSnapshotCaptureInput | null;
  tackContext?: {
    windFromDeg?: number | null;
  };
};

const RACE_STATE_SNAPSHOT_INTERVAL_MS = 15_000;

function formatTime(iso?: string) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildWeatherSample(weather: WeatherPayload): RaceWeatherSample {
  return {
    atISO: new Date().toISOString(),
    source: "live-weather",
    topWindAvgKt: weather.cbibsAnnapolis?.windAvgKt,
    topWindGustKt: weather.cbibsAnnapolis?.windGustKt,
    topWindDirectionDeg: weather.cbibsAnnapolis?.windDirectionDeg,
    bottomWindAvgKt: weather.thomasPoint?.windAvgKt,
    bottomWindGustKt: weather.thomasPoint?.windGustKt,
    bottomWindDirectionDeg: weather.thomasPoint?.windDirectionDeg,
    riverWindAvgKt: weather.windAvgKt,
    riverWindGustKt: weather.windGustKt,
    riverWindDirectionDeg: weather.windDirectionDeg,
    waveHeightFt: weather.cbibsAnnapolis?.waveHeightFt,
    wavePeriodSec: weather.cbibsAnnapolis?.wavePeriodSec,
    trend: weather.historyTrend?.trend ?? weather.thomasPoint?.trend?.trend,
  };
}

function buildRecorderRecoveryStatus(
  recovery: RaceSessionRepositoryRecoveryResult,
  options: { activeSession?: boolean; recoveredToday?: boolean } = {},
) {
  if (options.recoveredToday) {
    if (recovery.error && recovery.source === "local") {
      return "Shared recovery was unavailable. Recovered today from this browser's GPS, trim, and tack data.";
    }

    if (recovery.source === "shared") {
      return "Recovered today's session from shared storage.";
    }

    if (recovery.source === "merged") {
      return "Recovered today's session from shared storage and merged local browser data.";
    }

    if (recovery.source === "local") {
      return "Shared storage had no session for today, so recovery used this browser's saved GPS, trim, and tack data.";
    }

    return "Recovered today's race data.";
  }

  if (!options.activeSession) {
    return recovery.error && recovery.source === "local"
      ? "Shared recovery was unavailable. Recorder is using this browser's saved race data."
      : null;
  }

  if (recovery.error && recovery.source === "local") {
    return "Shared recovery was unavailable. Resumed the active session from this browser.";
  }

  if (recovery.source === "shared") {
    return "Resumed the active session from shared storage.";
  }

  if (recovery.source === "merged") {
    return "Resumed the active session from shared storage and merged local browser data.";
  }

  if (recovery.source === "local") {
    return "Shared storage had no active session, so recorder resumed from this browser.";
  }

  return null;
}

export function RaceRecorderPanel({
  courseId,
  gpsTrack,
  currentDecision,
  raceStateCapture,
  tacticalBoardCapture,
  tackContext,
}: RaceRecorderPanelProps) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const lastDecisionRef = useRef<string | null>(null);
  const latestRaceStateCaptureRef = useRef<RaceStateSnapshotCaptureInput | null>(
    raceStateCapture ?? null,
  );
  const latestTacticalBoardCaptureRef = useRef<TacticalBoardSnapshotCaptureInput | null>(
    tacticalBoardCapture ?? null,
  );
  const activeSession = useSyncExternalStore(
    subscribeRaceSessionStore,
    getActiveRaceSession,
    () => null,
  );
  const effectiveSessionId = activeSession?.id ?? sessionId;
  const session = useSyncExternalStore(
    subscribeRaceSessionStore,
    () => (effectiveSessionId ? getRaceSession(effectiveSessionId) : null),
    () => null,
  );
  const decisionSourceMeta = useMemo(
    () =>
      currentDecision?.sourceMeta ??
      (raceStateCapture ? buildRaceDecisionSourceMeta(raceStateCapture.state) : undefined),
    [currentDecision, raceStateCapture],
  );

  useEffect(() => subscribeRaceSessionStore(() => refresh()), []);

  useEffect(() => {
    let cancelled = false;

    void recoverRaceSessionsFromRepository().then((recovery) => {
      if (cancelled) return;

      const message = buildRecorderRecoveryStatus(recovery, {
        activeSession: recovery.snapshot.activeSessionId != null,
      });
      if (message) setStatus(message);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    latestRaceStateCaptureRef.current = raceStateCapture ?? null;
  }, [raceStateCapture]);

  useEffect(() => {
    latestTacticalBoardCaptureRef.current = tacticalBoardCapture ?? null;
  }, [tacticalBoardCapture]);

  useEffect(() => {
    if (!effectiveSessionId || session?.status !== "active") return;
    appendRaceGpsSamples(effectiveSessionId, gpsTrack, tackContext);
    attachTrimLogsToSession(effectiveSessionId, getLogs());
    attachTackCalibrationsToSession(effectiveSessionId, readTackCalibrations());
  }, [effectiveSessionId, gpsTrack, session?.status, tackContext]);

  useEffect(() => {
    if (!effectiveSessionId || session?.status !== "active" || !currentDecision) return;

    const sourceMeta = decisionSourceMeta;
    const courseIdValue =
      typeof currentDecision.inputs?.courseId === "string" ? currentDecision.inputs.courseId : "";
    const legIndexValue =
      typeof currentDecision.inputs?.legIndex === "number"
        ? String(currentDecision.inputs.legIndex)
        : "";
    const callValue =
      typeof currentDecision.inputs?.call === "string" ? currentDecision.inputs.call : "";
    const key = [
      currentDecision.kind,
      currentDecision.label,
      currentDecision.recommendation,
      courseIdValue,
      legIndexValue,
      callValue,
      sourceMeta?.weather.sourceId ?? "",
      sourceMeta?.weather.freshness ?? "",
      sourceMeta?.weather.confidence ?? "",
      sourceMeta?.weather.courseSectionRelevance ?? "",
    ].join("|");

    if (lastDecisionRef.current === key) return;
    lastDecisionRef.current = key;

    appendRaceDecision(effectiveSessionId, {
      kind: currentDecision.kind,
      label: currentDecision.label,
      recommendation: currentDecision.recommendation,
      inputs: currentDecision.inputs,
      sourceMeta,
    });
  }, [currentDecision, decisionSourceMeta, effectiveSessionId, session?.status]);

  useEffect(() => {
    if (!effectiveSessionId || session?.status !== "active") return;

    let cancelled = false;
    const activeSessionId = effectiveSessionId;

    async function sampleWeather() {
      try {
        const response = await fetch("/api/weather/noaa-wind", { cache: "no-store" });
        const weather = await readJsonResponse<WeatherPayload>(response);
        if (cancelled || !response.ok || weather.error) return;
        appendRaceWeatherSample(activeSessionId, buildWeatherSample(weather));
      } catch {
        if (!cancelled) setStatus("Weather sample failed; recorder is still running.");
      }
    }

    sampleWeather();
    const interval = window.setInterval(sampleWeather, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [effectiveSessionId, session?.status]);

  useEffect(() => {
    if (!effectiveSessionId || session?.status !== "active") return;

    const activeSessionId = effectiveSessionId;

    function captureRaceState() {
      const capturedAtISO = new Date().toISOString();
      const latestCapture = latestRaceStateCaptureRef.current;
      if (latestCapture) {
        appendRaceStateSnapshot(activeSessionId, {
          ...latestCapture,
          capturedAtISO,
        });
      }

      const latestTacticalCapture = latestTacticalBoardCaptureRef.current;
      if (latestTacticalCapture) {
        appendTacticalBoardSnapshot(activeSessionId, {
          ...latestTacticalCapture,
          capturedAtISO,
        });
      }
    }

    captureRaceState();
    const interval = window.setInterval(
      captureRaceState,
      RACE_STATE_SNAPSHOT_INTERVAL_MS,
    );

    return () => window.clearInterval(interval);
  }, [effectiveSessionId, session?.status]);

  const isRecording = session?.status === "active";
  const counts = useMemo(
    () => ({
      gps: session?.gpsTrack.length ?? 0,
      weather: session?.weatherSamples.length ?? 0,
      decisions: session?.decisions.length ?? 0,
      state: session?.raceStateSnapshots.length ?? 0,
      board: session?.tacticalBoardSnapshots.length ?? 0,
      tacks: session?.tackRecords.length ?? session?.tackCalibrations.length ?? 0,
    }),
    [session],
  );

  function beginRecording() {
    const next = startRaceSession({ courseId });
    appendRaceGpsSamples(next.id, gpsTrack, tackContext);
    setSessionId(next.id);
    setStatus("Race recording started.");
  }

  function stopRecording() {
    if (!session) return;
    appendRaceGpsSamples(session.id, gpsTrack, tackContext);
    attachTrimLogsToSession(session.id, getLogs());
    attachTackCalibrationsToSession(session.id, readTackCalibrations());
    const ended = endRaceSession(session.id);
    setSessionId(ended?.id ?? null);
    setStatus("Race recording ended. Review is ready.");
  }

  async function recoverToday() {
    const recovered = await recoverTodayRaceSession();
    setSessionId(recovered.session.id);
    setStatus(
      buildRecorderRecoveryStatus(recovered.recovery, { recoveredToday: true }) ??
        "Recovered today's race data.",
    );
  }

  function saveNote() {
    if (!session) return;
    addManualRaceNote(session.id, note);
    setNote("");
    setStatus("Note added to race review.");
  }

  return (
    <section className="layline-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">Race Recorder</div>
          <h2 className="mt-1 text-xl font-black">
            {isRecording ? "Recording race" : "Post-race data"}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {session
              ? `${session.name} · started ${formatTime(session.startedAtISO)}`
              : "Start before racing, or recover today's data on this phone."}
          </p>
        </div>
        <div
          className={[
            "rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide",
            isRecording
              ? "border-red-400/40 bg-red-400/15 text-red-100"
              : "border-[color:var(--divider)] bg-black/20",
          ].join(" ")}
        >
          {isRecording ? "Live" : "Idle"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={beginRecording}
          disabled={isRecording}
          className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 px-3 py-3 text-sm font-black uppercase tracking-wide text-teal-50 disabled:opacity-50"
        >
          <Circle size={15} />
          Start
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording}
          className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--warning)] bg-[color:var(--warning)]/15 px-3 py-3 text-sm font-black uppercase tracking-wide text-amber-50 disabled:opacity-50"
        >
          <Square size={15} />
          End
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={recoverToday}
          className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 text-sm font-black uppercase tracking-wide"
        >
          <Flag size={15} />
          Recover Today
        </button>
        <Link
          href="/race/review"
          className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 text-sm font-black uppercase tracking-wide"
        >
          <NotebookPen size={15} />
          Review
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
        <SmallMetric label="GPS" value={String(counts.gps)} />
        <SmallMetric label="Weather" value={String(counts.weather)} />
        <SmallMetric label="Choices" value={String(counts.decisions)} />
        <SmallMetric label="State" value={String(counts.state)} />
        <SmallMetric label="Board" value={String(counts.board)} />
        <SmallMetric label="Tacks" value={String(counts.tacks)} />
      </div>

      <div className="mt-4 grid gap-2">
        <textarea
          className="min-h-20 w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3 text-sm"
          placeholder="Add race note: left paid, bad lane, overpowered, sail change..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          type="button"
          onClick={saveNote}
          disabled={!session || !note.trim()}
          className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 text-sm font-black uppercase tracking-wide disabled:opacity-50"
        >
          Add Note
        </button>
      </div>

      {session && (
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              `layline-race-${session.startedAtISO.slice(0, 10)}.json`,
              exportRaceSessionJson(session),
            )
          }
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-3 text-sm font-black uppercase tracking-wide"
        >
          <Download size={15} />
          Export Session
        </button>
      )}

      {status && <p className="mt-3 text-xs text-[color:var(--muted)]">{status}</p>}
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-black leading-none">{value}</div>
    </div>
  );
}
