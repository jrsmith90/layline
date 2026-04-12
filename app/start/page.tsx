"use client";

import { useMemo, useState } from "react";
import startUpwindLogic from "@/data/logic/startUpwindLogic";

type UpwindLaneState = "OPEN" | "SHRINKING" | "MARGINAL" | "DEAD";
type BoatMode = "speed" | "pointing" | "control";
type UpwindMessageState = "stable" | "hold" | "prep_bail" | "bail_now";

type CongestionLevel = "LOW" | "MEDIUM" | "HIGH";
type TackOption = "OPEN" | "LIMITED" | "BLOCKED";

function getUpwindState(params: {
  laneState: UpwindLaneState;
  congestion: CongestionLevel;
  tackOption: TackOption;
}): UpwindMessageState {
  const { laneState, congestion, tackOption } = params;

  if (laneState === "DEAD" || tackOption === "BLOCKED") return "bail_now";
  if (laneState === "MARGINAL") return "prep_bail";
  if (laneState === "SHRINKING" || congestion === "HIGH") return "hold";
  return "stable";
}

function getUpwindReason(params: {
  laneState: UpwindLaneState;
  boatMode: BoatMode;
  congestion: CongestionLevel;
  tackOption: TackOption;
}): string {
  const { laneState, boatMode, congestion, tackOption } = params;

  if (laneState === "DEAD" || tackOption === "BLOCKED") {
    return "No forward option. Clear air and escape take priority over trim or tactics.";
  }

  if (laneState === "MARGINAL") {
    return "Your lane is close to collapsing. Preserve options before you get pinned going the wrong way.";
  }

  if (laneState === "SHRINKING") {
    return "Pressure is building, but the lane is still usable. Stay calm and avoid an unnecessary tactical move.";
  }

  if (congestion === "HIGH") {
    return "Traffic is heavy. Keep the boat simple and protect space before forcing a strategic play.";
  }

  if (boatMode === "speed") {
    return "Open lane. Prioritize pace and flow so you can keep your options open.";
  }

  if (boatMode === "pointing") {
    return "You can press for height, but only if the boat still feels alive and the lane remains safe.";
  }

  return "Stability first. Depower enough to keep the boat under you and avoid turning a small problem into a tactical one.";
}

export default function UpwindTacticsPage() {
  const logic = startUpwindLogic;

  const [laneState, setLaneState] = useState<UpwindLaneState>("OPEN");
  const [boatMode, setBoatMode] = useState<BoatMode>("speed");
  const [congestion, setCongestion] = useState<CongestionLevel>("LOW");
  const [tackOption, setTackOption] = useState<TackOption>("OPEN");

  const message = useMemo<UpwindMessageState>(
    () => getUpwindState({ laneState, congestion, tackOption }),
    [laneState, congestion, tackOption]
  );

  const current =
    message === "stable"
      ? logic.messages.modes[boatMode]
      : logic.messages[message];

  const currentReason = getUpwindReason({
    laneState,
    boatMode,
    congestion,
    tackOption,
  });

  const alertClasses: Record<UpwindMessageState, string> = {
    stable: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    hold: "border-green-500/40 bg-green-500/10 text-green-300",
    prep_bail: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
    bail_now: "border-red-500/50 bg-red-500/15 text-red-200",
  };

  const toneDotClasses: Record<UpwindMessageState, string> = {
    stable: "bg-sky-400",
    hold: "bg-green-500",
    prep_bail: "bg-yellow-400",
    bail_now: "bg-red-500",
  };

  const jibIntent = logic.upwind.trimIntent.jib[boatMode];
  const mainIntent = logic.upwind.trimIntent.main[boatMode];
  const trimBlocked = message === "prep_bail" || message === "bail_now";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upwind</h1>
          <p className="text-sm opacity-70">
            Lane first. Mode second. Trim third.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] opacity-50">
          Upwind Mode
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              Lane State
            </div>
            <div className="mt-1 text-base font-semibold">{laneState}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              Boat Mode
            </div>
            <div className="mt-1 text-base font-semibold">{boatMode.toUpperCase()}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              Congestion
            </div>
            <div className="mt-1 text-base font-semibold">{congestion}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              Tack Option
            </div>
            <div className="mt-1 text-base font-semibold">{tackOption}</div>
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border p-6 text-center transition-colors",
            alertClasses[message],
          ].join(" ")}
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] opacity-70">
            <span className={[
              "h-2.5 w-2.5 rounded-full",
              toneDotClasses[message],
            ].join(" ")} />
            Current Call
          </div>
          <div className="text-3xl font-bold tracking-tight sm:text-4xl">
            {current.text}
          </div>
          <p className="mt-3 text-sm opacity-80">{currentReason}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Upwind Inputs
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Lane state</span>
              <select
                value={laneState}
                onChange={(e) => setLaneState(e.target.value as UpwindLaneState)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                {logic.upwind.laneStates.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Boat mode</span>
              <select
                value={boatMode}
                onChange={(e) => setBoatMode(e.target.value as BoatMode)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                {logic.upwind.modes.map((option) => (
                  <option key={option} value={option}>
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Congestion</span>
              <select
                value={congestion}
                onChange={(e) => setCongestion(e.target.value as CongestionLevel)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Tack option</span>
              <select
                value={tackOption}
                onChange={(e) => setTackOption(e.target.value as TackOption)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                <option value="OPEN">OPEN</option>
                <option value="LIMITED">LIMITED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Trim Intent
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
                Jib
              </div>
              <div className="mt-1 text-base font-semibold">
                {trimBlocked ? "TRIM BLOCKED" : jibIntent}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
                Main
              </div>
              <div className="mt-1 text-base font-semibold">
                {trimBlocked ? "TRIM BLOCKED" : mainIntent}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm opacity-80">
              {message === "stable" &&
                "Open lane: mode and trim can guide the boat because tactical risk is low."}
              {message === "hold" &&
                "Shrinking lane: keep trim simple and avoid an unnecessary move that costs distance."}
              {message === "prep_bail" &&
                "Marginal lane: trim is not the priority problem anymore. Protect the ability to escape."}
              {message === "bail_now" &&
                "Dead lane: clear air beats perfect trim. Get out first, optimize later."}
            </div>
          </div>
        </div>
      </div>

      <a
        href="/tactics"
        className="inline-block rounded-xl bg-white px-4 py-2 font-semibold text-black shadow transition active:scale-[0.98]"
      >
        Back to Tactics
      </a>
    </div>
  );
}