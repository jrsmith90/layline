"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { getDefaultCourseId } from "@/data/race/getCourseData";
import { deriveTacticalBoard } from "@/lib/race/tacticalBoard/deriveTacticalBoard";
import {
  selectStartLineHeadline,
  selectTacticalBoardStatus,
} from "@/lib/race/tacticalBoard/selectors";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";

const DEFAULT_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function parseNum(value: string): number | null {
  const n = Number(value.trim());
  return value.trim() === "" || Number.isNaN(n) ? null : n;
}

function fmt(value: number | null, suffix = " deg") {
  return value == null ? "--" : `${Math.round(value)}${suffix}`;
}

function statusBadgeClass(status: "ready" | "partial" | "setup_needed") {
  if (status === "ready") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (status === "partial") return "border-amber-300/40 bg-amber-300/10 text-amber-300";
  return "border-white/15 bg-white/5 text-white/50";
}

function confidenceBadgeClass(confidence?: string) {
  if (confidence === "high") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (confidence === "medium") return "border-amber-300/40 bg-amber-300/10 text-amber-300";
  return "border-red-400/40 bg-red-400/10 text-red-300";
}

function shiftRiskClass(risk?: string) {
  if (risk === "high") return "text-red-300";
  if (risk === "moderate") return "text-amber-300";
  if (risk === "low") return "text-emerald-300";
  return "text-white/40";
}

function currentEffectClass(effect?: string) {
  if (effect === "favorable") return "text-emerald-300";
  if (effect === "adverse") return "text-red-300";
  return "text-white/50";
}

export function SkipperBrief() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_DRAFT
  );

  const courseData = useResolvedCourseData(draft.courseId);

  const board = useMemo(() => {
    return deriveTacticalBoard({
      courseId: draft.courseId,
      courseData,
      meanWindDirectionDeg: parseNum(draft.meanWindDirectionDeg),
      currentWindDirectionDeg: parseNum(draft.currentWindDirectionDeg),
      tackAngleDeg: parseNum(draft.tackAngleDeg) ?? 84,
      windwardMarkBearingDeg: parseNum(draft.windwardMarkBearingDeg),
      downwindMarkBearingDeg: parseNum(draft.downwindMarkBearingDeg),
      linePortEndBearingDeg: parseNum(draft.linePortEndBearingDeg),
      lineStarboardEndBearingDeg: parseNum(draft.lineStarboardEndBearingDeg),
      downwindTrueWindAngleDeg: parseNum(draft.downwindTrueWindAngleDeg) ?? 135,
      windTrend: draft.windTrend,
    });
  }, [courseData, draft]);

  const status = selectTacticalBoardStatus(board);
  const startLineHeadline = selectStartLineHeadline(board);

  const routePlan = draft.routeBias.latestPlan ?? draft.routeBias.originalPlan;
  const zones = draft.courseStrategy?.zones ?? [];
  const keyRisks = draft.courseStrategyResult?.keyRisks ?? [];
  const strategyNotes = draft.courseStrategy?.strategyNotes ?? "";

  const starboardHeading = board.upwind.starboardTackHeadingDeg;
  const portHeading = board.upwind.portTackHeadingDeg;

  const courseName = courseData
    ? `${courseData.eventName} — ${courseData.courseId}`
    : draft.courseId || "No course set";

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 pt-1">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-50">Skipper brief</div>
          <h1 className="mt-1 text-xl font-bold leading-tight">{courseName}</h1>
          {draft.raceStartDate && (
            <p className="mt-0.5 text-sm opacity-60">
              {draft.raceStartDate}
              {draft.raceStartTime ? ` · ${draft.raceStartTime}` : ""}
            </p>
          )}
        </div>
        <div
          className={`mt-1 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
        >
          {status === "ready" ? "Ready" : status === "partial" ? "Partial" : "Setup needed"}

        </div>
      </header>

      {/* Tack Setup */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-50">Tack setup</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Tack angle</div>
            <div className="mt-1 text-base font-bold">{draft.tackAngleDeg || "--"} deg</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Mean wind</div>
            <div className="mt-1 text-base font-bold">{fmt(parseNum(draft.meanWindDirectionDeg))}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Trend</div>
            <div className="mt-1 text-base font-bold capitalize">{draft.windTrend ?? "--"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-3">
            <div className="text-[10px] uppercase tracking-wide text-sky-300/70">Starboard hdg</div>
            <div className="mt-1 text-base font-bold">{fmt(starboardHeading)}</div>
          </div>
          <div className="rounded-xl border border-purple-400/30 bg-purple-400/10 p-3">
            <div className="text-[10px] uppercase tracking-wide text-purple-300/70">Port hdg</div>
            <div className="mt-1 text-base font-bold">{fmt(portHeading)}</div>
          </div>
        </div>
        {board.upwind.favoredTack !== "unknown" && (
          <p className="text-sm font-semibold leading-6">
            Favored tack:{" "}
            <span className={board.upwind.favoredTack === "starboard" ? "text-sky-300" : "text-purple-300"}>
              {board.upwind.favoredTack === "starboard" ? "Starboard" : "Port"}
            </span>
            {board.upwind.windwardMarkOffsetDeg != null && (
              <span className="opacity-60">
                {" "}({board.upwind.windwardMarkOffsetDeg > 0 ? "+" : ""}{Math.round(board.upwind.windwardMarkOffsetDeg)} deg to mark)
              </span>
            )}
          </p>
        )}
      </section>

      {/* Start Line */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide opacity-50">Start line</div>
        <p className="text-base font-bold leading-6">{startLineHeadline}</p>
        {board.startLine.biasDeg != null && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">Port end</div>
              <div className="mt-1 text-sm font-bold">{fmt(board.startLine.portEndBearingDeg)}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide opacity-50">Starboard end</div>
              <div className="mt-1 text-sm font-bold">{fmt(board.startLine.starboardEndBearingDeg)}</div>
            </div>
          </div>
        )}
      </section>

      {/* Opening Bias */}
      {routePlan && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide opacity-50">Opening bias</div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${confidenceBadgeClass(routePlan.confidence)}`}
            >
              {routePlan.confidence}
            </span>
          </div>
          <p className="text-xl font-bold capitalize">{routePlan.decision.replace(/_/g, " ")}</p>
          {routePlan.reasons.length > 0 && (
            <ul className="space-y-1.5">
              {routePlan.reasons.map((r) => (
                <li key={r} className="flex gap-2.5 text-sm leading-6 opacity-85">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          {routePlan.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 space-y-1.5">
              {routePlan.warnings.map((w) => (
                <p key={w} className="text-sm leading-6 text-amber-200">{w}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Course Strategy Zones */}
      {zones.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide opacity-50">Course zones</div>
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{zone.label}</div>
                  {zone.description && (
                    <p className="mt-0.5 text-xs leading-5 opacity-60 line-clamp-2">{zone.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className={shiftRiskClass(zone.windShiftRisk)}>
                      shift {zone.windShiftRisk ?? "unknown"}
                    </span>
                    <span className={currentEffectClass(zone.currentEffect)}>
                      current {zone.currentEffect ?? "unknown"}
                    </span>
                    {zone.laylineHeadingDeg != null && (
                      <span className="text-white/60">
                        layline {Math.round(zone.laylineHeadingDeg)} deg
                      </span>
                    )}
                  </div>
                </div>
                {zone.headingDeg != null && (
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-wide opacity-50">Hdg</div>
                    <div className="mt-0.5 text-lg font-bold">{Math.round(zone.headingDeg)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {strategyNotes && (
            <p className="text-sm leading-6 opacity-80 border-t border-white/10 pt-3">{strategyNotes}</p>
          )}
        </section>
      )}

      {/* Key Risks */}
      {keyRisks.length > 0 && (
        <section className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-amber-300/70">Key risks</div>
          <ul className="space-y-1.5">
            {keyRisks.map((risk) => (
              <li key={risk} className="flex gap-2.5 text-sm leading-6 text-amber-200/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                {risk}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sail Selection */}
      {draft.confirmedSailSelection && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide opacity-50">Sail package</div>
            {draft.confirmedSailSelection.confidence && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${confidenceBadgeClass(draft.confirmedSailSelection.confidence.toLowerCase())}`}
              >
                {draft.confirmedSailSelection.confidence}
              </span>
            )}
          </div>
          <p className="text-base font-bold leading-6">{draft.confirmedSailSelection.finalCall}</p>
          <p className="text-sm leading-6 opacity-70">
            {[
              draft.confirmedSailSelection.mainChoice,
              draft.confirmedSailSelection.headsailChoice,
              draft.confirmedSailSelection.spinnakerChoice,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {draft.confirmedSailSelection.reefCall && (
            <p className="text-sm leading-6 opacity-60">Reef: {draft.confirmedSailSelection.reefCall}</p>
          )}
        </section>
      )}

      {/* Empty state */}
      {status === "setup_needed" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-3">
          <p className="text-sm leading-6 opacity-60">
            No pre-race setup found. Complete the tactical board first.
          </p>
          <Link
            href="/race/pre-race"
            className="inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow transition active:scale-[0.98]"
          >
            Set up pre-race
          </Link>
        </div>
      )}

      {/* Footer nav */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Link
          href="/race/pre-race"
          className="block rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold transition active:scale-[0.98]"
        >
          Edit plan
        </Link>
        <Link
          href="/race/live"
          className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black shadow transition active:scale-[0.98]"
        >
          Race live
        </Link>
      </div>

      <Link href="/" className="block text-center text-sm opacity-50">
        Home
      </Link>
    </div>
  );
}
