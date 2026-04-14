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
                Think of traveler as boom position side-to-side. Lower is safer and more forgiving. Higher supports more angle when the boat is already moving well.
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
                This is how hard the mainsheet is trimmed. Low opens the leech and makes the boat easier to steer. High supports pointing when the boat is already fast and settled.
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
              <div className="grid grid-cols-3 gap-2">
                {VANG_PRESETS.map((preset) => (
                  <button
                    key={`vang-${preset.label}`}
                    type="button"
                    onClick={() => setVangTension(preset.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      vangLabel(vangTension) === preset.label
                        ? "bg-red-500 text-white"
                        : "bg-gray-800 text-white/80"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="text-xs opacity-60 space-y-1">
                <div>
                  Think of the vang as the control that holds the boom down and helps control how open or closed the top of the mainsail leech is.
                </div>
                <div>
                  <strong>Low vang:</strong> boom is freer to rise, the top of the sail twists off more, and the boat feels more open and forgiving.
                </div>
                <div>
                  <strong>High vang:</strong> boom is held down more, the leech stays firmer, and the sail keeps more shape up high.
                </div>
                <div>
                  Upwind, vang is usually a secondary control. Downwind, it becomes much more important because it helps stop the boom from lifting and changing leech tension too much.
                </div>
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
              <div className="grid grid-cols-3 gap-2">
                {BACKSTAY_PRESETS.map((preset) => (
                  <button
                    key={`backstay-${preset.label}`}
                    type="button"
                    onClick={() => setBackstayTension(preset.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      backstayLabel(backstayTension) === preset.label
                        ? "bg-red-500 text-white"
                        : "bg-gray-800 text-white/80"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="text-xs opacity-60 space-y-1">
                <div>
                  Think of backstay as the whole-rig flattening control. It bends the mast more and tightens the headstay as you turn it on.
                </div>
                <div>
                  <strong>Off:</strong> fuller main, fuller jib entry, more power.
                </div>
                <div>
                  <strong>Set:</strong> balanced base setting for normal conditions.
                </div>
                <div>
                  <strong>On:</strong> flatter main, tighter headstay, less power, more control.
                </div>
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