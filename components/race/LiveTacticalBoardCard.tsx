"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { Route, Sailboat, Wind } from "lucide-react";
import { useAppMode } from "@/components/display/AppModeProvider";
import type { TacticalUpdateAction } from "@/lib/race/checkPlanValidity";
import type { RaceState } from "@/lib/race/state/types";
import type { RouteBiasConfidence, RouteBiasDecision } from "@/lib/race/scoreRouteBias";
import { deriveTacticalBoardFromRaceState } from "@/lib/race/tacticalBoard/deriveTacticalBoardFromRaceState";
import {
  selectShiftHeadline,
  selectStartLineHeadline,
  selectTacticalBoardStatus,
} from "@/lib/race/tacticalBoard/selectors";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
  type TacticalBoardDraft,
} from "@/lib/race/tacticalBoard/store";
import { getDefaultCourseId } from "@/data/race/getCourseData";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

type TacticalHeadlineTone = "favorable" | "caution" | "neutral";
type TacticalHeadline = {
  eyebrow: string;
  title: string;
  detail: string;
  tone: TacticalHeadlineTone;
};

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatSignedDeg(value: number | null) {
  if (value == null) return "--";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} deg`;
}

function formatSide(value: "starboard" | "port" | "even" | "unknown" | "square") {
  switch (value) {
    case "starboard":
      return "Starboard";
    case "port":
      return "Port";
    case "even":
      return "Even";
    case "square":
      return "Square";
    default:
      return "Unknown";
  }
}

function formatRouteBiasDecision(decision: RouteBiasDecision) {
  switch (decision) {
    case "shore_first":
      return "Favor shore early";
    case "bay_first":
      return "Favor bay early";
    case "neutral":
      return "Stay central";
    case "mixed_signal":
      return "Mixed signal";
    default:
      return decision;
  }
}

function formatRouteBiasConfidence(confidence: RouteBiasConfidence) {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatTrend(value: TacticalBoardDraft["windTrend"]) {
  switch (value) {
    case "building":
      return "Building";
    case "fading":
      return "Fading";
    case "steady":
      return "Steady";
    case "oscillating":
      return "Oscillating";
    case "unstable":
      return "Unstable";
    default:
      return "Unknown";
  }
}

function formatUpdateAction(action: TacticalUpdateAction) {
  switch (action) {
    case "hold_course":
      return "Hold course";
    case "stay_flexible":
      return "Stay flexible";
    case "prepare_to_change_side_bias":
      return "Prepare to shift";
    case "change_side_bias":
      return "Change side bias";
    default:
      return action;
  }
}

function getStatusCopy(status: ReturnType<typeof selectTacticalBoardStatus>) {
  switch (status) {
    case "ready":
      return "Board ready";
    case "partial":
      return "Partial board";
    default:
      return "Setup needed";
  }
}

function getLegModeCopy(mode: ReturnType<typeof deriveTacticalBoardFromRaceState>["legMode"]) {
  switch (mode) {
    case "upwind":
      return "Upwind focus";
    case "downwind":
      return "Run focus";
    case "reach":
      return "Reach focus";
    default:
      return "General read";
  }
}

function getSourceBadgeLabel(
  currentWindSource: ReturnType<typeof deriveTacticalBoardFromRaceState>["currentWindSource"],
  windSourceLabel: string,
) {
  switch (currentWindSource) {
    case "live":
      return `Live wind · ${windSourceLabel}`;
    case "setup":
      return "Saved wind setup";
    default:
      return "Wind input needed";
  }
}

function getSourceCopy(params: {
  currentWindSource: ReturnType<
    typeof deriveTacticalBoardFromRaceState
  >["currentWindSource"];
  windSourceLabel: string;
  usesActiveLegBearing: boolean;
  hasOpeningBiasPlan: boolean;
}) {
  const windCopy =
    params.currentWindSource === "live"
      ? `Current wind is coming from ${params.windSourceLabel}.`
      : params.currentWindSource === "setup"
        ? params.hasOpeningBiasPlan
          ? "Live wind is missing, so the board is leaning on the saved tactical-board setup and opening-bias plan."
          : "Live wind is missing, so the board is falling back to the saved current-wind setup."
        : params.hasOpeningBiasPlan
          ? "Current wind is not set yet, but the saved opening-bias plan is still available as the first-leg fallback."
          : "Current wind is not set yet, so live tactical reads are still limited.";

  const legCopy = params.usesActiveLegBearing
    ? " Active leg geometry is feeding the mark bearing automatically."
    : " Mark and line geometry are still coming from the saved tactical-board setup.";

  return `${windCopy}${legCopy}`;
}

function getOpeningBiasCallout(
  draft: TacticalBoardDraft,
  safeLegIndex: RaceState["course"]["safeLegIndex"],
) {
  if (safeLegIndex !== 0 || !draft.routeBias.originalPlan) {
    return null;
  }

  const latestPlan = draft.routeBias.latestPlan ?? draft.routeBias.originalPlan;
  const latestUpdate = draft.routeBias.latestUpdate;

  if (latestUpdate) {
    return `Opening bias update: ${formatUpdateAction(latestUpdate.action)}. ${
      latestUpdate.reasons[0] ?? `Latest check: ${formatRouteBiasDecision(latestPlan.decision)}.`
    }`;
  }

  return `Opening bias: ${formatRouteBiasDecision(
    draft.routeBias.originalPlan.decision,
  )} (${formatRouteBiasConfidence(draft.routeBias.originalPlan.confidence)} confidence).`;
}

function getHeadlineToneClass(tone: TacticalHeadlineTone) {
  switch (tone) {
    case "favorable":
      return "border-[color:var(--favorable)]/40 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.18),transparent_58%),linear-gradient(180deg,rgba(9,27,31,0.92),rgba(7,22,37,0.75))] text-teal-50";
    case "caution":
      return "border-[color:var(--warning)]/40 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_58%),linear-gradient(180deg,rgba(38,27,10,0.92),rgba(21,16,7,0.75))] text-amber-50";
    default:
      return "border-white/10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_58%),linear-gradient(180deg,rgba(10,20,34,0.92),rgba(7,22,37,0.75))] text-[color:var(--text)]";
  }
}

function getSupportItemClasses(index: number) {
  if (index === 0) {
    return "border-[color:var(--divider)] bg-white/[0.07] text-[color:var(--text)]";
  }

  return "border-[color:var(--divider)] bg-black/20 text-[color:var(--text-soft)]";
}

function getPrimaryHeadline(
  params: ReturnType<typeof deriveTacticalBoardFromRaceState>,
  draft: TacticalBoardDraft,
  safeLegIndex: RaceState["course"]["safeLegIndex"],
): TacticalHeadline {
  const { board, legMode, currentWindSource } = params;
  const latestUpdate = draft.routeBias.latestUpdate;
  const originalPlan = draft.routeBias.originalPlan;

  if (safeLegIndex === 0 && originalPlan) {
    if (latestUpdate) {
      const tone: TacticalHeadlineTone =
        latestUpdate.action === "change_side_bias" ||
        latestUpdate.action === "prepare_to_change_side_bias"
          ? "caution"
          : latestUpdate.action === "hold_course"
            ? "favorable"
            : "neutral";

      return {
        eyebrow: "Opening Bias",
        title: formatUpdateAction(latestUpdate.action),
        detail:
          latestUpdate.reasons[0] ??
          `Latest check still points to ${formatRouteBiasDecision(
            (draft.routeBias.latestPlan ?? originalPlan).decision,
          ).toLowerCase()}.`,
        tone,
      };
    }

    return {
      eyebrow: "Opening Bias",
      title: formatRouteBiasDecision(originalPlan.decision),
      detail: `${formatRouteBiasConfidence(originalPlan.confidence)} confidence opening-leg plan from the saved pre-race setup.`,
      tone: originalPlan.confidence === "high" ? "favorable" : "neutral",
    };
  }

  if (legMode === "upwind") {
    if (board.upwind.favoredTack === "starboard" || board.upwind.favoredTack === "port") {
      return {
        eyebrow: "Upwind Read",
        title: `${formatSide(board.upwind.favoredTack)} tack first`,
        detail: `${selectShiftHeadline(board)} Target the cleaner lane before the next cross.`,
        tone: "favorable",
      };
    }

    return {
      eyebrow: "Upwind Read",
      title: "Stay lane-flexible",
      detail:
        currentWindSource === "missing"
          ? "The geometry is not pushing a single tack yet, and current wind still needs to be set."
          : "The geometry is close enough to centered that pressure and lane quality matter more than a forced-side tack.",
      tone: "neutral",
    };
  }

  if (legMode === "downwind") {
    if (
      board.downwind.dominantReach === "starboard" ||
      board.downwind.dominantReach === "port"
    ) {
      return {
        eyebrow: "Run Read",
        title: `${formatSide(board.downwind.dominantReach)} reach leads`,
        detail: "Use the jibe bearing and pressure side together before you commit to the next turn.",
        tone: "favorable",
      };
    }

    return {
      eyebrow: "Run Read",
      title: "Keep the run balanced",
      detail: "The run is sitting close to the jibe bearing, so stay free to play pressure and mode changes.",
      tone: "neutral",
    };
  }

  if (board.startLine.favoredEnd === "port" || board.startLine.favoredEnd === "starboard") {
    return {
      eyebrow: "Start Line",
      title: `${formatSide(board.startLine.favoredEnd)} end favored`,
      detail: selectStartLineHeadline(board),
      tone: "favorable",
    };
  }

  if (board.startLine.favoredEnd === "square") {
    return {
      eyebrow: "Start Line",
      title: "Line is close to square",
      detail: "Acceleration, lane freedom, and time-on-distance matter more than end bias right now.",
      tone: "neutral",
    };
  }

  if (currentWindSource === "missing") {
    return {
      eyebrow: "Setup",
      title: "Current wind still needed",
      detail: "The board can hold the saved geometry, but it needs a current wind read before it can turn that into live tactical calls.",
      tone: "caution",
    };
  }

  return {
    eyebrow: "Live Tactical Board",
    title: "Board is tracking",
    detail: sourceCopyFallback(board, currentWindSource),
    tone: board.readiness.status === "ready" ? "neutral" : "caution",
  };
}

function sourceCopyFallback(
  board: ReturnType<typeof deriveTacticalBoardFromRaceState>["board"],
  currentWindSource: ReturnType<typeof deriveTacticalBoardFromRaceState>["currentWindSource"],
) {
  if (currentWindSource === "live") {
    return board.shift.referenceFromDeg == null
      ? "Live wind is flowing in, but the saved baseline still needs a mean wind to unlock shift memory."
      : "Live wind and saved board geometry are both active.";
  }

  return board.shift.referenceFromDeg == null
    ? "Complete the saved board setup to unlock cleaner calls."
    : "Saved board geometry is active while the live feed catches up.";
}

function getSupportItems(
  params: ReturnType<typeof deriveTacticalBoardFromRaceState>,
  draft: TacticalBoardDraft,
  safeLegIndex: RaceState["course"]["safeLegIndex"],
) {
  const { board, legMode, currentWindSource } = params;
  const callouts: string[] = [];

  if (legMode === "upwind") {
    if (board.upwind.favoredTack === "even") {
      callouts.push(
        "Windward leg is centered enough that lanes and pressure matter more than a forced-side bias.",
      );
    } else if (board.upwind.favoredTack !== "unknown") {
      callouts.push(
        `${formatSide(board.upwind.favoredTack)} tack has the cleaner first look on this upwind leg.`,
      );
    }
  } else if (legMode === "downwind") {
    if (board.downwind.dominantReach === "even") {
      callouts.push("Run geometry is balanced around the jibe bearing right now.");
    } else if (board.downwind.dominantReach !== "unknown") {
      callouts.push(
        `${formatSide(board.downwind.dominantReach)} reach is the cleaner pressure-side setup on the run.`,
      );
    }
  } else if (board.startLine.favoredEnd !== "unknown") {
    callouts.push(selectStartLineHeadline(board));
  }

  callouts.push(selectShiftHeadline(board));

  const openingBiasCallout = getOpeningBiasCallout(draft, safeLegIndex);
  if (openingBiasCallout) {
    callouts.unshift(openingBiasCallout);
  }

  if (currentWindSource === "missing") {
    callouts.push("Set live or manual current wind to turn the saved board geometry into active calls.");
  } else if (board.shift.referenceFromDeg == null) {
    callouts.push("Set a mean wind on the Tactical Board page to unlock shift memory against the live read.");
  }

  return callouts.filter(Boolean);
}

function FocusMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {props.label}
      </div>
      <div className="mt-1 text-lg font-black text-[color:var(--text)]">{props.value}</div>
    </div>
  );
}

export function LiveTacticalBoardCard({ raceState }: { raceState: RaceState }) {
  const { isRaceMode } = useAppMode();
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );

  const liveBoard = useMemo(
    () => deriveTacticalBoardFromRaceState({ raceState, draft }),
    [draft, raceState],
  );
  const board = liveBoard.board;
  const status = selectTacticalBoardStatus(board);
  const headline = getPrimaryHeadline(liveBoard, draft, raceState.course.safeLegIndex);
  const supportItems = getSupportItems(liveBoard, draft, raceState.course.safeLegIndex).slice(
    0,
    isRaceMode ? 2 : 3,
  );
  const sourceCopy = getSourceCopy({
    currentWindSource: liveBoard.currentWindSource,
    windSourceLabel: raceState.wind.sourceLabel,
    usesActiveLegBearing: liveBoard.usesActiveLegBearing,
    hasOpeningBiasPlan: draft.routeBias.originalPlan != null,
  });
  const metrics = useMemo(() => {
    if (liveBoard.legMode === "downwind") {
      return [
        { label: "Baseline", value: formatDeg(board.shift.referenceFromDeg) },
        { label: "Live Wind", value: formatDeg(board.shift.currentFromDeg) },
        { label: "Jibe", value: formatDeg(board.downwind.jibeBearingDeg) },
        { label: "Favored", value: formatSide(board.downwind.dominantReach) },
      ];
    }

    if (liveBoard.legMode === "upwind") {
      return [
        { label: "Mean Wind", value: formatDeg(board.shift.referenceFromDeg) },
        { label: "Live Wind", value: formatDeg(board.shift.currentFromDeg) },
        { label: "Stbd Tack", value: formatDeg(board.upwind.starboardTackHeadingDeg) },
        { label: "Port Tack", value: formatDeg(board.upwind.portTackHeadingDeg) },
      ];
    }

    return [
      { label: "Mean Wind", value: formatDeg(board.shift.referenceFromDeg) },
      { label: "Live Wind", value: formatDeg(board.shift.currentFromDeg) },
      { label: "Shift", value: formatSignedDeg(board.shift.deltaDeg) },
      { label: "Favored End", value: formatSide(board.startLine.favoredEnd) },
    ];
  }, [board, liveBoard.legMode]);

  return (
    <section className="layline-panel overflow-hidden p-0">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="layline-kicker">Live Tactical Board</div>
            <div className="mt-1 text-lg font-black">
              {liveBoard.activeLegLabel ?? "Course tactical overlay"}
            </div>
          </div>
          <div className="text-right text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            <div>{getStatusCopy(status)}</div>
            <div className="mt-2">{getLegModeCopy(liveBoard.legMode)}</div>
          </div>
        </div>

        <div className={["mt-4 rounded-2xl border p-4", getHeadlineToneClass(headline.tone)].join(" ")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">
                {headline.eyebrow}
              </div>
              <div className="mt-2 text-2xl font-black uppercase tracking-tight">
                {headline.title}
              </div>
              <p className="mt-2 text-sm leading-6 opacity-90">{headline.detail}</p>
            </div>
            <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] opacity-85">
              {liveBoard.activeLegLabel ?? "Live read"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="rounded-full border border-[color:var(--divider)] bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text)]">
            {getSourceBadgeLabel(liveBoard.currentWindSource, raceState.wind.sourceLabel)}
          </div>
          <div className="rounded-full border border-[color:var(--divider)] bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text)]">
            {liveBoard.usesActiveLegBearing ? "Active leg geometry" : "Saved board geometry"}
          </div>
          <div className="rounded-full border border-[color:var(--divider)] bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text)]">
            Trend · {formatTrend(board.setup.windTrend)}
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-[color:var(--text-soft)]">{sourceCopy}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <FocusMetric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
          Right Now
        </div>
        <div className="mt-3 space-y-2">
          {supportItems.map((callout, index) => (
          <div
            key={callout}
            className={[
              "rounded-xl border px-3 py-2 text-sm leading-6",
              getSupportItemClasses(index),
            ].join(" ")}
          >
            {callout}
          </div>
          ))}
        </div>
      </div>

      {!isRaceMode && (
        <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-[color:var(--muted)]">
          {liveBoard.legMode === "downwind" ? (
            <Sailboat className="mt-0.5 shrink-0" size={16} />
          ) : liveBoard.legMode === "upwind" ? (
            <Wind className="mt-0.5 shrink-0" size={16} />
          ) : (
            <Route className="mt-0.5 shrink-0" size={16} />
          )}
          <p>
            Mean wind, line bearings, and trend still come from the Tactical Board setup.
            The live overlay is updating the current wind, tack angle, and active-leg bearing
            context on top of that baseline.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-4 text-xs font-bold uppercase tracking-[0.16em]">
        <div className="text-[color:var(--muted)]">
          {liveBoard.activeLegLabel ? "Live board linked to current leg" : "Live board using saved setup"}
        </div>
        <Link
          href="/race/tactical-board"
          className="rounded-lg border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-[color:var(--text)] transition active:scale-[0.98]"
        >
          Edit Board
        </Link>
      </div>
    </section>
  );
}
