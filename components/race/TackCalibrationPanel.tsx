"use client";

import { useEffect, useMemo, useState } from "react";
import { TimerReset } from "lucide-react";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import {
  calculateTackCalibration,
  getRaceDayHalfAngle,
  getTackShiftLabel,
  readTackCalibrations,
  saveTackCalibrations,
  type TackCalibrationResult,
} from "@/lib/race/tackCalibration";

const CALIBRATION_DURATION_MS = 35_000;

function formatDeg(value: number) {
  return `${Math.round(value)} deg`;
}

function confidenceClass(confidence: TackCalibrationResult["confidence"]) {
  if (confidence === "high") return "text-[color:var(--favorable)]";
  if (confidence === "medium") return "text-[color:var(--warning)]";
  return "text-[color:var(--muted)]";
}

export function TackCalibrationPanel({
  onUseHalfAngle,
}: {
  onUseHalfAngle: (halfAngleDeg: number) => void;
}) {
  const gps = usePhoneGps();
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [results, setResults] = useState<TackCalibrationResult[]>(readTackCalibrations);
  const [error, setError] = useState<string | null>(null);
  const raceDayHalfAngle = useMemo(() => getRaceDayHalfAngle(results), [results]);
  const latestResult = results.at(-1) ?? null;
  const isCapturing = startedAtMs != null;
  const secondsLeft =
    startedAtMs == null
      ? 0
      : Math.max(0, Math.ceil((startedAtMs + CALIBRATION_DURATION_MS - nowMs) / 1000));

  useEffect(() => {
    if (!isCapturing) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isCapturing]);

  useEffect(() => {
    if (startedAtMs == null) return;
    if (nowMs < startedAtMs + CALIBRATION_DURATION_MS) return;

    try {
      const result = calculateTackCalibration(gps.track, startedAtMs);
      const nextResults = [...results, result].slice(-10);
      setResults(nextResults);
      saveTackCalibrations(nextResults);
      onUseHalfAngle(result.halfAngleDeg);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate tack angle.");
    } finally {
      setStartedAtMs(null);
    }
  }, [gps.track, nowMs, onUseHalfAngle, results, startedAtMs]);

  function startCapture() {
    if (!gps.enabled) {
      gps.setEnabled(true);
    }

    setError(null);
    setNowMs(Date.now());
    setStartedAtMs(Date.now());
  }

  function clearCalibrations() {
    setResults([]);
    saveTackCalibrations([]);
    setError(null);
  }

  return (
    <section className="layline-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">Tack Calibration</div>
          <h2 className="mt-1 text-xl font-black tracking-tight">Race-day angle</h2>
        </div>
        <div className="text-right text-sm font-semibold text-[color:var(--text)]">
          {raceDayHalfAngle == null ? "42 deg base" : `${formatDeg(raceDayHalfAngle)} half`}
        </div>
      </div>

      <p className="mt-3 text-sm leading-5 text-[color:var(--text-soft)]">
        Sail settled, tap Capture Tack as you start the tack, then settle on the new tack.
        Layline uses the measured half-angle after the sample finishes.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={startCapture}
          disabled={isCapturing}
          className={[
            "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold uppercase tracking-wide transition active:scale-[0.98]",
            isCapturing
              ? "border-[color:var(--warning)] bg-[color:var(--warning)]/15 text-amber-100"
              : "border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 text-teal-50",
          ].join(" ")}
        >
          <TimerReset size={16} />
          {isCapturing ? `${secondsLeft}s` : "Capture Tack"}
        </button>

        <button
          type="button"
          onClick={() => raceDayHalfAngle != null && onUseHalfAngle(raceDayHalfAngle)}
          disabled={raceDayHalfAngle == null}
          className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
        >
          Use Race-day
        </button>

        <button
          type="button"
          onClick={clearCalibrations}
          disabled={results.length === 0}
          className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-[color:var(--unfavorable)] bg-[color:var(--unfavorable)]/15 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {latestResult && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Before" value={formatDeg(latestResult.beforeCogDeg)} />
          <Metric label="After" value={formatDeg(latestResult.afterCogDeg)} />
          <Metric label="Through" value={formatDeg(latestResult.tackThroughDeg)} />
          <Metric label="Half" value={formatDeg(latestResult.halfAngleDeg)} />
        </div>
      )}

      {latestResult && (
        <div className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
          Last tack: {getTackShiftLabel(latestResult)} · before samples{" "}
          {latestResult.beforeSamples} · after samples {latestResult.afterSamples} · confidence{" "}
          <span className={confidenceClass(latestResult.confidence)}>
            {latestResult.confidence}
          </span>
        </div>
      )}
    </section>
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
