"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Circle, Download, Flag, NotebookPen, Square } from "lucide-react";
import type { GpsTrackPoint } from "@/lib/useGpsCourse";
import {
  addManualRaceNote,
  appendRaceDecision,
  appendRaceGpsSamples,
  appendRaceWeatherSample,
  attachTackCalibrationsToSession,
  attachTrimLogsToSession,
  downloadTextFile,
  endRaceSession,
  exportRaceSessionJson,
  getActiveRaceSession,
  getRaceSession,
  recoverTodayRaceSession,
  startRaceSession,
  subscribeRaceSessionStore,
  syncRaceSessionsFromRepository,
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
};

type RaceRecorderPanelProps = {
  courseId: string;
  gpsTrack: GpsTrackPoint[];
  currentDecision?: RecorderDecisionInput | null;
  tackContext?: {
    windFromDeg?: number | null;
  };
};

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

export function RaceRecorderPanel({
  courseId,
  gpsTrack,
  currentDecision,
  tackContext,
}: RaceRecorderPanelProps) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [sessionId, setSessionId] = useState(() => getActiveRaceSession()?.id ?? null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const lastDecisionRef = useRef<string | null>(null);
  const activeSession = getActiveRaceSession();
  const effectiveSessionId = activeSession?.id ?? sessionId;
  const session = effectiveSessionId ? getRaceSession(effectiveSessionId) : null;

  useEffect(() => subscribeRaceSessionStore(() => refresh()), []);

  useEffect(() => {
    void syncRaceSessionsFromRepository();
  }, []);

  useEffect(() => {
    if (!effectiveSessionId || session?.status !== "active") return;
    appendRaceGpsSamples(effectiveSessionId, gpsTrack, tackContext);
    attachTrimLogsToSession(effectiveSessionId, getLogs());
    attachTackCalibrationsToSession(effectiveSessionId, readTackCalibrations());
  }, [effectiveSessionId, gpsTrack, session?.status, tackContext]);

  useEffect(() => {
    if (!effectiveSessionId || session?.status !== "active" || !currentDecision) return;

    const key = [
      currentDecision.kind,
      currentDecision.label,
      currentDecision.recommendation,
      JSON.stringify(currentDecision.inputs ?? {}),
    ].join("|");

    if (lastDecisionRef.current === key) return;
    lastDecisionRef.current = key;

    appendRaceDecision(effectiveSessionId, {
      kind: currentDecision.kind,
      label: currentDecision.label,
      recommendation: currentDecision.recommendation,
      inputs: currentDecision.inputs,
    });
  }, [currentDecision, effectiveSessionId, session?.status]);

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

  const isRecording = session?.status === "active";
  const counts = useMemo(
    () => ({
      gps: session?.gpsTrack.length ?? 0,
      weather: session?.weatherSamples.length ?? 0,
      decisions: session?.decisions.length ?? 0,
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

  function recoverToday() {
    const recovered = recoverTodayRaceSession();
    setSessionId(recovered.id);
    setStatus("Recovered today from this phone's saved GPS, trim, and tack data.");
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

      <div className="mt-4 grid grid-cols-4 gap-2">
        <SmallMetric label="GPS" value={String(counts.gps)} />
        <SmallMetric label="Weather" value={String(counts.weather)} />
        <SmallMetric label="Choices" value={String(counts.decisions)} />
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
