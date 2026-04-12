

"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";

export default function MainTrimPage() {
  const [mode, setMode] = useState("Speed");

  return (
    <main className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Mainsail Trim</h1>
        <p className="text-sm opacity-70">
          Sheet + traveler control power. Flatten to depower.
        </p>
      </header>

      <Panel title="Call">
        <div className="space-y-3">
          <div className="text-xs tracking-widest text-red-400 uppercase">
            Call
          </div>
          <div className="text-base leading-relaxed">
            Ease mainsheet slightly to open the leech and reduce heel.
          </div>
        </div>
      </Panel>

      <Panel title="Why">
        <div className="space-y-3">
          <div className="text-xs tracking-widest uppercase opacity-60">
            Why
          </div>
          <div className="text-base leading-relaxed opacity-90">
            Reduces weather helm and keeps the boat in balance so you can stay fast and in control.
          </div>
        </div>
      </Panel>

      <Panel title="Do Next">
        <div className="space-y-3">
          <div className="text-xs tracking-widest text-green-400 uppercase">
            Do Next
          </div>
          <div className="text-base leading-relaxed opacity-90">
            Adjust traveler to maintain angle, then fine-tune with sheet.
          </div>
        </div>
      </Panel>

      <Panel title="If / Then">
        <div className="space-y-3">
          <div className="text-xs tracking-widest text-amber-400 uppercase">
            If / Then
          </div>
          <div className="text-base leading-relaxed opacity-90">
            If still overpowered, add backstay and tighten outhaul to flatten the sail.
          </div>
        </div>
      </Panel>

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