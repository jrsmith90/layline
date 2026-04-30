"use client";

import { useMemo } from "react";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";
import {
  buildTroubleshootContextCues,
  buildTroubleshootContextSummary,
  type TroubleshootLiveContext,
} from "@/data/logic/troubleshootLogic";

const starterContext: Omit<TroubleshootLiveContext, "sogKt" | "cogDeg"> = {
  windAvgKt: undefined,
  windGustKt: undefined,
  windDirectionDeg: undefined,
  currentDirection: "ebb",
  currentSpeedKt: 1.2,
  tideStage: "falling",
  sourceNote:
    "Phone GPS is live when enabled. Wind is not connected yet; current/tide are starter context from the Weather page.",
};

const toneClasses = {
  neutral: "border-white/10 bg-black/20",
  good: "border-emerald-400/30 bg-emerald-400/10",
  warning: "border-amber-300/35 bg-amber-300/10",
  danger: "border-red-400/40 bg-red-400/10",
};

function formatStatus(context: TroubleshootLiveContext) {
  const windStatus =
    typeof context.windAvgKt === "number" ? "Wind feed available" : "Wind feed pending";
  const gpsStatus = typeof context.sogKt === "number" ? "GPS live" : "GPS off";

  return `${gpsStatus} · ${windStatus}`;
}

export function TroubleshootLiveContextPanel() {
  const gps = usePhoneGps();

  const context = useMemo<TroubleshootLiveContext>(() => {
    const sogKt = gps.sogMps == null ? undefined : gps.sogMps * 1.943844;

    return {
      ...starterContext,
      sogKt,
      cogDeg: gps.cogDeg ?? undefined,
    };
  }, [gps.cogDeg, gps.sogMps]);

  const cues = buildTroubleshootContextCues(context);
  const summary = buildTroubleshootContextSummary(context);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Live context
          </div>
          <h2 className="mt-1 text-lg font-bold">Wind, Water, and Speed Check</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold opacity-80">
          {formatStatus(context)}
        </div>
      </div>

      <p className="text-sm leading-6 opacity-85">{summary}</p>

      <div className="grid gap-3 md:grid-cols-2">
        {cues.map((cue) => (
          <div
            key={cue.label}
            className={`rounded-xl border p-4 ${toneClasses[cue.tone]}`}
          >
            <div className="text-xs uppercase tracking-wide opacity-60">
              {cue.label}
            </div>
            <div className="mt-1 text-base font-bold">{cue.value}</div>
            <p className="mt-2 text-sm leading-6 opacity-80">{cue.guidance}</p>
          </div>
        ))}
      </div>

      <p className="text-xs leading-5 opacity-60">{context.sourceNote}</p>
    </section>
  );
}
