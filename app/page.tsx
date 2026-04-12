"use client";

import { useState, useEffect } from "react";

export default function HomePage() {
  const [raceMode, setRaceMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("race-mode");
    if (saved === "true") setRaceMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("race-mode", raceMode ? "true" : "false");
  }, [raceMode]);

  return (
    <main className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Layline</h1>
        <p className="text-sm opacity-70">
          Sailing decision support for starts, trim, and tactics.
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm opacity-70">Mode</span>
          <button
            onClick={() => setRaceMode((v) => !v)}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
              raceMode
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-white"
            }`}
          >
            {raceMode ? "Race Mode" : "Learning Mode"}
          </button>
        </div>
      </header>

      <div className="grid gap-3">
        <a
          href="/sail-selection"
          className="block rounded-lg bg-blue-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Sail Selection
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Quick sail + reef call"
              : "Pre-race setup, sail choice, reef calls"}
          </div>
        </a>

        <a
          href="/start"
          className="block rounded-lg bg-purple-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Start
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Lane + pressure"
              : "Lane, pressure, and bailout logic"}
          </div>
        </a>

        <a
          href="/trim/main"
          className="block rounded-lg bg-red-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Mainsail Trim
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Power + depower"
              : "Power, balance, and depower controls"}
          </div>
        </a>

        <a
          href="/trim/jib"
          className="block rounded-lg bg-black text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Headsail Trim
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Trim + flow"
              : "Lead, sheet, and telltale flow"}
          </div>
        </a>

        <a
          href="/trim/spin"
          className="block rounded-lg bg-blue-600 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Spinnaker Trim
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Downwind control"
              : "Downwind trim and control"}
          </div>
        </a>

        <a
          href="/tactics"
          className="block rounded-lg bg-gray-700 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Tactics
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Decisions"
              : "Upwind and downwind decisions"}
          </div>
        </a>

        <a
          href="/troubleshoot"
          className="block rounded-lg bg-yellow-500 text-black p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Troubleshoot
          <div className="text-sm font-normal opacity-90">
            {raceMode
              ? "Fix fast"
              : "Fix speed, control, and trim issues"}
          </div>
        </a>

        <a
          href="/notes"
          className="block rounded-lg bg-white/10 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Notes
          <div className="text-sm font-normal opacity-70">
            Logs and learning
          </div>
        </a>
      </div>
    </main>
  );
}