"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import getMainActionPlan from "@/data/logic/mainTrimLogic";

export default function MainTrimPage() {
  const [boatMode, setBoatMode] = useState<"speed" | "pointing" | "control">("speed");
  const [symptom, setSymptom] = useState<
    | "normal"
    | "slow"
    | "pinching"
    | "overpowered"
    | "cant_hold_lane"
    | "badair"
    | "too_much_helm"
    | "stalling"
    | "cannot_point"
  >("overpowered");
  const [leechState, setLeechState] = useState<
    | "unknown"
    | "balanced"
    | "too_closed"
    | "too_open"
    | "hooked"
    | "twisty_then_stall"
    | "erratic_waves"
    | "erratic_dirty_air"
    | "dead_unreliable"
  >("balanced");
  const [windSpd, setWindSpd] = useState<number>(15);
  const [travelerPos, setTravelerPos] = useState<number>(5);
  const [sheetTension, setSheetTension] = useState<number>(6);
  const [vangTension, setVangTension] = useState<number>(4);

  const plan = getMainActionPlan({
    sailMode: "upwind",
    boatMode,
    symptom,
    leechState,
    travelerPos,
    sheetTension,
    vangTension,
    windSpd,
  });

  return (
    <main className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Mainsail Trim</h1>
        <p className="text-sm opacity-70">
          Sheet + traveler control power. Flatten to depower.
        </p>
      </header>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2">
        {["speed", "pointing", "control"].map((mode) => (
          <button
            key={mode}
            onClick={() => setBoatMode(mode as any)}
            className={`py-2 rounded-lg text-sm font-semibold transition ${
              boatMode === mode
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-white/80"
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      <Panel title="Inputs">
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="text-xs uppercase opacity-60">Wind Speed</div>
              <input
                type="number"
                min={0}
                max={40}
                value={windSpd}
                onChange={(e) => setWindSpd(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-gray-800 text-white px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <div className="text-xs uppercase opacity-60">Symptom</div>
              <select
                value={symptom}
                onChange={(e) => setSymptom(e.target.value as typeof symptom)}
                className="w-full rounded-lg bg-gray-800 text-white px-3 py-2"
              >
                <option value="normal">Normal</option>
                <option value="slow">Slow</option>
                <option value="pinching">Pinching</option>
                <option value="overpowered">Overpowered</option>
                <option value="cant_hold_lane">Can’t Hold Lane</option>
                <option value="badair">Bad Air</option>
                <option value="too_much_helm">Too Much Helm</option>
                <option value="stalling">Stalling</option>
                <option value="cannot_point">Cannot Point</option>
              </select>
            </label>
          </div>

          <label className="space-y-1">
            <div className="text-xs uppercase opacity-60">Leech State</div>
            <select
              value={leechState}
              onChange={(e) => setLeechState(e.target.value as typeof leechState)}
              className="w-full rounded-lg bg-gray-800 text-white px-3 py-2"
            >
              <option value="unknown">Unknown</option>
              <option value="balanced">Balanced</option>
              <option value="too_closed">Too Closed</option>
              <option value="too_open">Too Open</option>
              <option value="hooked">Hooked</option>
              <option value="twisty_then_stall">Twisty Then Stall</option>
              <option value="erratic_waves">Erratic in Waves</option>
              <option value="erratic_dirty_air">Erratic in Dirty Air</option>
              <option value="dead_unreliable">Dead / Unreliable</option>
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1">
              <div className="text-xs uppercase opacity-60">Traveler</div>
              <input
                type="number"
                min={0}
                max={10}
                value={travelerPos}
                onChange={(e) => setTravelerPos(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-gray-800 text-white px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <div className="text-xs uppercase opacity-60">Sheet</div>
              <input
                type="number"
                min={0}
                max={10}
                value={sheetTension}
                onChange={(e) => setSheetTension(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-gray-800 text-white px-3 py-2"
              />
            </label>

            <label className="space-y-1">
              <div className="text-xs uppercase opacity-60">Vang</div>
              <input
                type="number"
                min={0}
                max={10}
                value={vangTension}
                onChange={(e) => setVangTension(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-gray-800 text-white px-3 py-2"
              />
            </label>
          </div>
        </div>
      </Panel>

      {/* Call */}
      <Panel title="Call">
        <div className="space-y-2">
          <div className="text-xs tracking-widest text-red-400 uppercase">
            Call
          </div>
          <div className="text-base leading-relaxed">
            {plan.headline}
          </div>
        </div>
      </Panel>

      {/* Focus */}
      <Panel title="Focus">
        <div className="space-y-2">
          <div className="text-xs tracking-widest uppercase opacity-60">
            Focus
          </div>
          <div className="text-base leading-relaxed opacity-90">
            {plan.focus}
          </div>
        </div>
      </Panel>

      {/* Actions */}
      <Panel title="Actions">
        <div className="space-y-4">
          {plan.actions.map((action, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {action.title}
              </div>
              <div className="text-sm opacity-80">
                {action.intent}
              </div>
              <div className="text-sm text-green-400">
                {action.doThis}
              </div>
              <div className="text-xs opacity-60">
                {action.why}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/"
          className="block w-full text-center rounded-lg bg-gray-700 text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Return Home
        </a>
        <a
          href="/trim"
          className="block w-full text-center rounded-lg bg-red-500 text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Back to Trim
        </a>
      </div>
    </main>
  );
}