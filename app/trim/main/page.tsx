"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import getMainActionPlan from "@/data/logic/mainTrimLogic";

const TRAVELER_PRESETS = [
  { label: "Down", value: 2 },
  { label: "Middle", value: 5 },
  { label: "Up", value: 8 },
] as const;

const SHEET_PRESETS = [
  { label: "Ease", value: 2 },
  { label: "Trim", value: 5 },
  { label: "Hard Trim", value: 8 },
] as const;

const VANG_PRESETS = [
  { label: "Loose", value: 2 },
  { label: "Set", value: 5 },
  { label: "On", value: 8 },
] as const;

const BACKSTAY_PRESETS = [
  { label: "Off", value: 2 },
  { label: "Set", value: 5 },
  { label: "On", value: 8 },
] as const;

function travelerLabel(value: number): "Down" | "Middle" | "Up" {
  if (value <= 3) return "Down";
  if (value <= 6) return "Middle";
  return "Up";
}

function sheetLabel(value: number): "Ease" | "Trim" | "Hard Trim" {
  if (value <= 3) return "Ease";
  if (value <= 6) return "Trim";
  return "Hard Trim";
}

function vangLabel(value: number): "Loose" | "Set" | "On" {
  if (value <= 3) return "Loose";
  if (value <= 6) return "Set";
  return "On";
}

function backstayLabel(value: number): "Off" | "Set" | "On" {
  if (value <= 3) return "Off";
  if (value <= 6) return "Set";
  return "On";
}

function travelerDescription(value: number): string {
  const label = travelerLabel(value);
  if (label === "Down") {
    return "Traveler down = safer, easier to keep the boat on its feet, and better when you need control more than angle.";
  }
  if (label === "Middle") {
    return "Traveler middle = balanced base setting. Good when the boat is moving well and conditions are steady.";
  }
  return "Traveler up = supports more angle and pointing, but best only when the boat already has speed and feels settled.";
}

function sheetDescription(value: number): string {
  const label = sheetLabel(value);
  if (label === "Ease") {
    return "Ease = opens the leech, makes the main more forgiving, and helps the boat accelerate or stay moving in unstable conditions.";
  }
  if (label === "Trim") {
    return "Trim = balanced mainsheet setting. This is your normal all-around upwind mode when the boat feels good.";
  }
  return "Hard Trim = tighter leech for more pointing support, but only when the boat is already fast. Too much can make the sail sticky or stall the top.";
}

function vangDescription(value: number): string {
  const label = vangLabel(value);
  if (label === "Loose") {
    return "Loose vang = boom can rise more, the top of the sail twists off, and the boat feels more open and forgiving.";
  }
  if (label === "Set") {
    return "Set vang = balanced boom support. Good default when you want some leech control without locking the top of the sail too much.";
  }
  return "Vang on = boom held down more, leech stays firmer, and the upper part of the sail keeps more shape. Much more important downwind than upwind.";
}

function backstayDescription(value: number): string {
  const label = backstayLabel(value);
  if (label === "Off") {
    return "Backstay off = fuller main, fuller jib entry, and more power. Best when you need punch and acceleration.";
  }
  if (label === "Set") {
    return "Backstay set = balanced base setting. Good for normal conditions when you want a mix of power and control.";
  }
  return "Backstay on = flatter main, tighter headstay, and less overall power. Best when the boat is loaded and you need more control.";
}

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
  const [backstayTension, setBackstayTension] = useState<number>(5);

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

          <div className="space-y-5">
            <label className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase opacity-60">Traveler</div>
                  <div className="text-sm opacity-80">{travelerLabel(travelerPos)}</div>
                </div>
                <div className="text-right text-xs opacity-60">
                  <div>Down = dropped / depower</div>
                  <div>Up = raised / more angle</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TRAVELER_PRESETS.map((preset) => (
                  <button
                    key={`traveler-${preset.label}`}
                    type="button"
                    onClick={() => setTravelerPos(preset.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      travelerLabel(travelerPos) === preset.label
                        ? "bg-red-500 text-white"
                        : "bg-gray-800 text-white/80"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="text-xs opacity-60">
                {travelerDescription(travelerPos)}
              </div>
            </label>

            <label className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase opacity-60">Sheet Tension</div>
                  <div className="text-sm opacity-80">{sheetLabel(sheetTension)}</div>
                </div>
                <div className="text-right text-xs opacity-60">
                  <div>Ease = leech open</div>
                  <div>Hard Trim = leech firm</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SHEET_PRESETS.map((preset) => (
                  <button
                    key={`sheet-${preset.label}`}
                    type="button"
                    onClick={() => setSheetTension(preset.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      sheetLabel(sheetTension) === preset.label
                        ? "bg-red-500 text-white"
                        : "bg-gray-800 text-white/80"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="text-xs opacity-60">
                {sheetDescription(sheetTension)}
              </div>
            </label>

            <label className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase opacity-60">Vang Tension</div>
                  <div className="text-sm opacity-80">{vangLabel(vangTension)}</div>
                </div>
                <div className="text-right text-xs opacity-60">
                  <div>Loose = boom freer</div>
                  <div>On = boom held down more</div>
                </div>
              </div>
              <div className="text-xs opacity-60">
                {vangDescription(vangTension)}
              </div>
            </label>

            <label className="space-y-2 block">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase opacity-60">Backstay</div>
                  <div className="text-sm opacity-80">{backstayLabel(backstayTension)}</div>
                </div>
                <div className="text-right text-xs opacity-60">
                  <div>Off = fuller / more power</div>
                  <div>On = flatter / more depower</div>
                </div>
              </div>
              <div className="text-xs opacity-60">
                {backstayDescription(backstayTension)}
              </div>
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