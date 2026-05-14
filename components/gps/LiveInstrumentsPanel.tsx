"use client";

import { Download, Navigation, Trash2 } from "lucide-react";
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider";

type DecisionContext = "start" | "upwind" | "downwind" | "route" | "general";

function formatCog(cogDeg: number | null) {
  return cogDeg == null ? "--" : `${Math.round(cogDeg)} deg`;
}

function formatSpeedKt(sogMps: number | null) {
  return sogMps == null ? "--" : `${(sogMps * 1.943844).toFixed(1)} kt`;
}

function formatAccuracy(accuracyM: number | null) {
  return accuracyM == null ? "--" : `${Math.round(accuracyM)} m`;
}

function getDecisionCue(context: DecisionContext, gps: ReturnType<typeof usePhoneGps>) {
  if (!gps.enabled) return "Turn on Phone GPS to feed live COG and SOG into this decision.";
  if (gps.permission === "denied") return "Location permission is blocked for this browser.";
  if (gps.cogDeg == null) return "GPS is on. Build a little speed for a reliable course-over-ground.";
  if (gps.freshness === "stale") {
    return "GPS feed looks stale. Treat COG and SOG as delayed until a fresh fix lands.";
  }
  if (gps.confidence === "low") {
    return "GPS quality is weak right now. Use the numbers as a trend check, not a hard trigger.";
  }

  const sogKt = gps.sogMps == null ? null : gps.sogMps * 1.943844;
  const slowCue = sogKt != null && sogKt < 1.2;

  if (context === "start") {
    return slowCue
      ? "SOG is low. Protect acceleration before defending height or lane."
      : "Use COG to confirm your exit angle and whether the bow is actually moving toward clear air.";
  }

  if (context === "upwind") {
    return "Compare COG to the intended tack. If COG is sagging, favor speed or escape before pointing.";
  }

  if (context === "downwind") {
    return "Watch COG and SOG together. If speed drops after a turn, return to the faster angle before the next jibe.";
  }

  if (context === "route") {
    return "Use COG/SOG as the live reality check against the planned route and current edge.";
  }

  return "Live COG and SOG are available for the next decision.";
}

function exportTrack(points: ReturnType<typeof usePhoneGps>["track"]) {
  const header = "at,lat,lon,cogDeg,sogMps,accuracyM";
  const rows = points.map((point) =>
    [
      point.at,
      point.lat,
      point.lon,
      point.cogDeg ?? "",
      point.sogMps ?? "",
      point.accuracyM ?? "",
    ].join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `layline-gps-track-${new Date().toISOString()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LiveInstrumentsPanel({
  context = "general",
  compact = false,
}: {
  context?: DecisionContext;
  compact?: boolean;
}) {
  const gps = usePhoneGps();
  const latestPoint = gps.track.at(-1);

  return (
    <section className="layline-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--divider)] text-[color:var(--favorable)]">
            <Navigation size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="layline-kicker">Live Instruments</div>
            <div className="text-sm font-semibold text-[color:var(--text)]">
              {gps.enabled ? "Phone GPS active" : "Phone GPS off"}
            </div>
            <div className="text-xs text-[color:var(--muted)]">
              {gps.enabled
                ? `${gps.freshness} feed · ${gps.confidence} confidence`
                : "Enable GPS to feed live COG and SOG."}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={gps.toggle}
          disabled={!gps.supported}
          className={[
            "rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide",
            gps.enabled
              ? "border-[color:var(--favorable)] text-[color:var(--favorable)]"
              : "border-[color:var(--divider)] text-[color:var(--text)]",
            !gps.supported ? "opacity-50" : "",
          ].join(" ")}
        >
          {gps.enabled ? "On" : "Off"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            COG
          </div>
          <div className="mt-1 text-lg font-black text-[color:var(--text)]">
            {formatCog(gps.cogDeg)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            SOG
          </div>
          <div className="mt-1 text-lg font-black text-[color:var(--text)]">
            {formatSpeedKt(gps.sogMps)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Acc
          </div>
          <div className="mt-1 text-lg font-black text-[color:var(--text)]">
            {formatAccuracy(gps.accuracyM)}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="mt-3 rounded-xl border border-[color:var(--divider)] bg-black/20 p-3 text-sm leading-5 text-[color:var(--text-soft)]">
            {getDecisionCue(context, gps)}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
            <div>
              Track: {gps.track.length} points
              {latestPoint ? ` · last ${new Date(latestPoint.at).toLocaleTimeString()}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportTrack(gps.track)}
                disabled={gps.track.length === 0}
                className="flex items-center gap-1 rounded-full border border-[color:var(--divider)] px-2 py-1 font-semibold disabled:opacity-40"
                aria-label="Export GPS track"
              >
                <Download size={13} />
                Export
              </button>
              <button
                type="button"
                onClick={gps.clearTrack}
                disabled={gps.track.length === 0}
                className="flex items-center gap-1 rounded-full border border-[color:var(--divider)] px-2 py-1 font-semibold disabled:opacity-40"
                aria-label="Clear GPS track"
              >
                <Trash2 size={13} />
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
