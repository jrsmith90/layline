"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
  type TacticalBoardDraft,
} from "@/lib/race/tacticalBoard/store";

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

function getSourceCopy(params: {
  currentWindSource: ReturnType<
    typeof deriveTacticalBoardFromRaceState
  >["currentWindSource"];
  windSourceLabel: string;
  usesActiveLegBearing: boolean;
}) {
  const windCopy =
    params.currentWindSource === "live"
      ? `Current wind is coming from ${params.windSourceLabel}.`
      : params.currentWindSource === "setup"
        ? "Live wind is missing, so the board is falling back to the saved current-wind setup."
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

function getCallouts(
  params: ReturnType<typeof deriveTacticalBoardFromRaceState>,
  draft: TacticalBoardDraft,
  safeLegIndex: RaceState["course"]["safeLegIndex"],
) {
  const { board, legMode, currentWindSource } = params;
  const callouts: string[] = [];
  const openingBiasCallout = getOpeningBiasCallout(draft, safeLegIndex);

  if (openingBiasCallout) {
    callouts.push(openingBiasCallout);
  }

  if (legMode === "upwind") {
    if (board.upwind.favoredTack === "even") {
      callouts.push("Windward leg is centered enough that lanes and pressure matter more than a forced-side bias.");
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
  const [draft, setDraft] = useState<TacticalBoardDraft>(() => getStoredTacticalBoardDraft());

  useEffect(() => {
    return subscribeTacticalBoardStore(() => {
      setDraft(getStoredTacticalBoardDraft());
    });
  }, []);

  const liveBoard = useMemo(
    () => deriveTacticalBoardFromRaceState({ raceState, draft }),
    [draft, raceState],
  );
  const board = liveBoard.board;
  const status = selectTacticalBoardStatus(board);
  const callouts = getCallouts(liveBoard, draft, raceState.course.safeLegIndex).slice(
    0,
    isRaceMode ? 2 : 3,
  );
  const sourceCopy = getSourceCopy({
    currentWindSource: liveBoard.currentWindSource,
    windSourceLabel: raceState.wind.sourceLabel,
    usesActiveLegBearing: liveBoard.usesActiveLegBearing,
  });
  const metrics = useMemo(() => {
    if (liveBoard.legMode === "downwind") {
      return [
        { label: "Baseline", value: formatDeg(board.shift.referenceFromDeg) },
        { label: "Live Wind", value: formatDeg(board.shift.currentFromDeg) },
        { label: "Jibe", value: formatDeg(board.downwind.jibeBearingDeg) },
        { label: "Reach", value: formatSide(board.downwind.dominantReach) },
      ];
    }

    if (liveBoard.legMode === "upwind") {
      return [
        { label: "Baseline", value: formatDeg(board.shift.referenceFromDeg) },
        { label: "Live Wind", value: formatDeg(board.shift.currentFromDeg) },
        { label: "Stbd Tack", value: formatDeg(board.upwind.starboardTackHeadingDeg) },
        { label: "Port Tack", value: formatDeg(board.upwind.portTackHeadingDeg) },
      ];
    }

    return [
      { label: "Baseline", value: formatDeg(board.shift.referenceFromDeg) },
      { label: "Live Wind", value: formatDeg(board.shift.currentFromDeg) },
      { label: "Shift", value: formatSignedDeg(board.shift.deltaDeg) },
      { label: "Line Bias", value: formatSide(board.startLine.favoredEnd) },
    ];
  }, [board, liveBoard.legMode]);

  return (
    <section className="layline-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">Live Tactical Board</div>
          <div className="mt-1 text-lg font-black">
            {liveBoard.activeLegLabel ?? "Course tactical overlay"}
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">{sourceCopy}</p>
        </div>
        <div className="text-right text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
          <div>{getStatusCopy(status)}</div>
          <div className="mt-2">{getLegModeCopy(liveBoard.legMode)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <FocusMetric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {callouts.map((callout) => (
          <div
            key={callout}
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-sm leading-6 text-[color:var(--text-soft)]"
          >
            {callout}
          </div>
        ))}
      </div>

      {!isRaceMode && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-[color:var(--muted)]">
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

      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em]">
        <div className="text-[color:var(--muted)]">Trend: {board.setup.windTrend}</div>
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
