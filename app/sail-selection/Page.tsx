

"use client";

import { useMemo, useState } from "react";
import {
  getRaceSailPlan,
  SEA_STATE_OPTIONS,
  type SeaState,
  type CrewCount,
  type HikingLevel,
  type RiskMode,
  type LegType,
} from "@/data/logic/sailSelectionLogic";

import { Panel } from "@/components/ui/Panel";
import { BtnLink } from "@/components/ui/Btn";

export default function SailSelectionPage() {
  const [forecastWind, setForecastWind] = useState<number | "">("");
  const [seaState, setSeaState] = useState<SeaState>("gentle_breeze_7_10");
  const [crewCount, setCrewCount] = useState<CrewCount>(5);
  const [hikingLevel, setHikingLevel] = useState<HikingLevel>("full");
  const [legType, setLegType] = useState<LegType>("upwind");
  const [riskMode, setRiskMode] = useState<RiskMode>("max_performance");

  const result = useMemo(() => {
    if (forecastWind === "") return null;

    return getRaceSailPlan({
      forecastWind: Number(forecastWind),
      seaState,
      crewCount,
      hikingLevel,
      legType,
      riskMode,
    });
  }, [forecastWind, seaState, crewCount, hikingLevel, legType, riskMode]);

  return (
    <main className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Sail Selection</h1>
        <p className="text-sm opacity-70">
          Choose conditions to get your race setup.
        </p>
      </header>

      <Panel title="Inputs">
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Wind (kt)"
            className="p-3 rounded-xl bg-black/30 border"
            value={forecastWind}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return setForecastWind("");
              const n = Number(v);
              if (!Number.isNaN(n)) setForecastWind(n);
            }}
          />

          <select
            className="p-3 rounded-xl bg-black/30 border"
            value={seaState}
            onChange={(e) => setSeaState(e.target.value as SeaState)}
          >
            {SEA_STATE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="p-3 rounded-xl bg-black/30 border"
            value={crewCount}
            onChange={(e) => setCrewCount(Number(e.target.value) as CrewCount)}
          >
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} Crew
              </option>
            ))}
          </select>

          <select
            className="p-3 rounded-xl bg-black/30 border"
            value={hikingLevel}
            onChange={(e) => setHikingLevel(e.target.value as HikingLevel)}
          >
            <option value="light">Light Hiking</option>
            <option value="moderate">Moderate Hiking</option>
            <option value="full">Full Hiking</option>
          </select>

          <select
            className="p-3 rounded-xl bg-black/30 border"
            value={legType}
            onChange={(e) => setLegType(e.target.value as LegType)}
          >
            <option value="upwind">Upwind</option>
            <option value="downwind">Downwind</option>
          </select>

          <select
            className="p-3 rounded-xl bg-black/30 border"
            value={riskMode}
            onChange={(e) => setRiskMode(e.target.value as RiskMode)}
          >
            <option value="max_performance">Max Performance</option>
            <option value="conservative">Conservative</option>
          </select>
        </div>
      </Panel>

      {result && (
        <Panel title="Recommendation">
          <div className="space-y-3">
            <div>
              <strong>Effective Wind:</strong> {result.effectiveWind.toFixed(1)} kt
            </div>

            <div>
              <strong>Main:</strong> {result.mainChoice}
            </div>

            {result.headsailChoice && (
              <div>
                <strong>Headsail:</strong> {result.headsailChoice}
              </div>
            )}

            {result.spinnakerChoice && (
              <div>
                <strong>Spinnaker:</strong> {result.spinnakerChoice}
              </div>
            )}

            <div>
              <strong>Reef:</strong> {result.reefCall}
            </div>

            <div>
              <strong>Why:</strong> {result.reason}
            </div>

            <div>
              <strong>Notes:</strong>
              <ul className="list-disc ml-5">
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      <BtnLink href="/" tone="neutral">
        Return Home
      </BtnLink>
    </main>
  );
}