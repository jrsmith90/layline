"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import getMainActionPlan from "@/data/logic/mainTrimLogic";

export default function MainTrimPage() {
  const [boatMode, setBoatMode] = useState<"speed" | "pointing" | "control">("speed");

  const plan = getMainActionPlan({
    sailMode: "upwind",
    boatMode,
    symptom: "overpowered",
    leechState: "balanced",
    travelerPos: 5,
    sheetTension: 6,
    vangTension: 4,
    windSpd: 15,
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