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

function getSeaStateFromWind(wind: number): SeaState {
  if (wind <= 0) return "calm_0";
  if (wind <= 3) return "light_air_1_3";
  if (wind <= 6) return "light_breeze_4_6";
  if (wind <= 10) return "gentle_breeze_7_10";
  if (wind <= 16) return "moderate_breeze_11_16";
  if (wind <= 21) return "fresh_breeze_17_21";
  return "strong_breeze_22_27";
}

function getDefaultHikingLevel(crewCount: CrewCount): HikingLevel {
  if (crewCount === 3) return "light";
  if (crewCount === 4) return "moderate";
  return "full";
}

function formatMainChoice(value: string): string {
  switch (value) {
    case "quantum_main":
      return "Quantum Main";
    case "north_main_backup":
      return "North Main (Backup)";
    default:
      return value;
  }
}

function formatHeadsailChoice(value: string): string {
  switch (value) {
    case "ullman_150":
      return "150% Ullman Genoa";
    case "north_150":
      return "150% North Genoa";
    case "north_140":
      return "#2 / 140% North Jib";
    default:
      return value;
  }
}

function formatSpinChoice(value: string): string {
  switch (value) {
    case "north_spin_yellow_black":
      return "North Spinnaker — Yellow / Black";
    case "north_spin_teal_black_white":
      return "North Spinnaker — Teal / Black / White";
    case "old_spin_red_white_best_old":
      return "Older Spinnaker — Red / White (Best Older)";
    case "old_spin_red_white_horizon":
      return "Older Spinnaker — Red / White (Horizon)";
    case "small_red_white_blue_heavy_air":
      return "Heavy-Air Spinnaker — Small Red / White / Blue";
    case "no_spinnaker":
      return "No Spinnaker";
    default:
      return value;
  }
}

function formatReefCall(value: string): string {
  switch (value) {
    case "no_reef":
      return "No Reef";
    case "consider_reef":
      return "Consider Reef";
    case "reef_now":
      return "Reef Now";
    default:
      return value;
  }
}

function getRecommendationTone(result: {
  reefCall: string;
  spinnakerChoice?: string;
  headsailChoice?: string;
}): {
  cardClass: string;
  badgeClass: string;
  badgeText: string;
} {
  if (result.reefCall === "reef_now" || result.spinnakerChoice === "no_spinnaker") {
    return {
      cardClass: "border-red-500/40 bg-red-500/10",
      badgeClass: "bg-red-500/20 text-red-200 border border-red-500/40",
      badgeText: "High Control / High Risk",
    };
  }

  if (result.reefCall === "consider_reef" || result.headsailChoice === "north_140") {
    return {
      cardClass: "border-yellow-400/40 bg-yellow-400/10",
      badgeClass: "bg-yellow-400/20 text-yellow-100 border border-yellow-400/40",
      badgeText: "Crossover / Caution",
    };
  }

  return {
    cardClass: "border-green-500/40 bg-green-500/10",
    badgeClass: "bg-green-500/20 text-green-100 border border-green-500/40",
    badgeText: "Full Power / Clear Call",
  };
}

function getConfidenceLevel(
  effectiveWind: number,
  legType: LegType
): "High" | "Medium" | "Low" {
  // Upwind crossover: 14–17
  if (legType === "upwind" && effectiveWind >= 14 && effectiveWind <= 17) {
    return "Low";
  }

  // Downwind crossover: 17–21
  if (legType === "downwind" && effectiveWind >= 17 && effectiveWind <= 21) {
    return "Low";
  }

  // Near edges → medium
  if (
    Math.abs(effectiveWind - 13) <= 1 ||
    Math.abs(effectiveWind - 18) <= 1 ||
    Math.abs(effectiveWind - 22) <= 1
  ) {
    return "Medium";
  }

  return "High";
}

function getConfidenceReason(
  confidence: "High" | "Medium" | "Low",
  seaState: SeaState,
  crewPowerScore: number
): string {
  if (confidence === "Low") {
    return "This is a crossover call because sea state and crew power push the transition earlier.";
  }

  if (confidence === "Medium") {
    return "Conditions are near a transition point — small changes in pressure or crew power could shift the call.";
  }

  return "This is a clear call with stable conditions and strong signal.";
}

function getWindShiftText(legType: LegType, effectiveWind: number): string {
  if (legType === "upwind") {
    if (effectiveWind <= 13) return "+2–4 kt could push this toward the #2 / 140% jib zone.";
    if (effectiveWind >= 14 && effectiveWind <= 17) return "+1–2 kt or more chop could push this fully into the smaller-jib call.";
    if (effectiveWind >= 18 && effectiveWind <= 22) return "+2–3 kt could push this from consider reef to reef now.";
    return "A small drop in pressure or flatter water could reduce the need to reef immediately.";
  }

  if (effectiveWind <= 16) return "+2–4 kt or building sea state could push this from a full-size kite to the heavy-air kite.";
  if (effectiveWind >= 17 && effectiveWind <= 21) return "+1–2 kt or less crew power could push this from a crossover call to a smaller kite or no-kite call.";
  return "A small drop in wind or flatter water could move this from no-kite / heavy-air mode back toward a more aggressive setup.";
}

function getCallChangeTriggers(params: {
  legType: LegType;
  effectiveWind: number;
  seaState: SeaState;
  crewCount: CrewCount;
  hikingLevel: HikingLevel;
  reefCall: string;
  headsailChoice?: string;
  spinnakerChoice?: string;
}): string[] {
  const {
    legType,
    effectiveWind,
    seaState,
    crewCount,
    hikingLevel,
    reefCall,
    headsailChoice,
    spinnakerChoice,
  } = params;

  const triggers: string[] = [];

  triggers.push(getWindShiftText(legType, effectiveWind));

  if (legType === "upwind") {
    if (headsailChoice === "ullman_150") {
      triggers.push("More chop, less crew, or lighter hiking would move this call earlier toward the #2 / 140% jib.");
    }

    if (headsailChoice === "north_140") {
      triggers.push("Flatter water, more crew, or full hiking could support carrying the 150% longer.");
    }

    if (reefCall === "no_reef") {
      triggers.push("If helm builds or the boat cannot stay flat, the reef call could move up quickly.");
    }

    if (reefCall === "consider_reef") {
      triggers.push("A little more pressure, rougher water, or less crew power would likely turn this into Reef Now.");
    }

    if (reefCall === "reef_now") {
      triggers.push("A drop in pressure, flatter water, or more crew power could move this back to Consider Reef.");
    }
  } else {
    if (spinnakerChoice && spinnakerChoice !== "no_spinnaker") {
      triggers.push("If crew handling margin drops or sea state builds, this could shift to a smaller kite or no-kite call.");
    }

    if (spinnakerChoice === "no_spinnaker") {
      triggers.push("A little less pressure, flatter water, or stronger crew handling could reopen the heavy-air kite option.");
    }
  }

  if (crewCount <= 4 || hikingLevel !== "full") {
    triggers.push("More crew weight or stronger hiking would let you carry sail longer before changing down.");
  } else {
    triggers.push("Less crew weight or reduced hiking would shift this call earlier toward control mode.");
  }

  if (seaState === "fresh_breeze_17_21" || seaState === "strong_breeze_22_27") {
    triggers.push("If sea state smooths out, the call could become more aggressive even at the same forecast wind.");
  } else {
    triggers.push("If chop builds, the transition to smaller sails or reefing will happen earlier than forecast wind alone suggests.");
  }

  return triggers.slice(0, 4);
}

function buildFinalCall(params: {
  legType: LegType;
  main: string;
  headsail?: string;
  spin?: string;
  reef: string;
}): string {
  const { legType, main, headsail, spin, reef } = params;

  const mainText = formatMainChoice(main);
  const reefText = formatReefCall(reef);

  if (legType === "upwind") {
    const hs = headsail ? formatHeadsailChoice(headsail) : "Headsail";

    if (reef === "reef_now") {
      return `Go ${hs} with a reef — prioritize control and staying in the groove.`;
    }

    if (reef === "consider_reef") {
      return `Go ${hs} — be ready to reef quickly if pressure builds.`;
    }

    return `Go ${hs} with full main — prioritize speed and lane control.`;
  }

  const sp = spin ? formatSpinChoice(spin) : "No Spinnaker";

  if (spin === "no_spinnaker") {
    return `No kite — sail main-only for control and safe handling.`;
  }

  if (reef === "reef_now") {
    return `Heavy-air setup with ${sp} — control first, avoid overloading the boat.`;
  }

  return `Set ${sp} — sail aggressive but stay within handling limits.`;
}

export default function SailSelectionPage() {
  const [forecastWind, setForecastWind] = useState<number | "">("");
  const [seaState, setSeaState] = useState<SeaState>("gentle_breeze_7_10");
  const [crewCount, setCrewCount] = useState<CrewCount>(5);
  const [hikingLevel, setHikingLevel] = useState<HikingLevel>("full");
  const [legType, setLegType] = useState<LegType>("upwind");
  const [riskMode, setRiskMode] = useState<RiskMode>("max_performance");
  const [seaStateAuto, setSeaStateAuto] = useState(true);
  const [hikingAuto, setHikingAuto] = useState(true);

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
  const recommendationTone = result ? getRecommendationTone(result) : null;

  const confidence = result
    ? getConfidenceLevel(result.effectiveWind, result.legType)
    : null;

  const confidenceReason = result && confidence
    ? getConfidenceReason(confidence, seaState, result.crewPowerScore)
    : null;

  const callChangeTriggers = result
    ? getCallChangeTriggers({
        legType,
        effectiveWind: result.effectiveWind,
        seaState,
        crewCount,
        hikingLevel,
        reefCall: result.reefCall,
        headsailChoice: result.headsailChoice,
        spinnakerChoice: result.spinnakerChoice,
      })
    : [];

  const finalCall = result
    ? buildFinalCall({
        legType,
        main: result.mainChoice,
        headsail: result.headsailChoice,
        spin: result.spinnakerChoice,
        reef: result.reefCall,
      })
    : null;

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
              if (v === "") {
                setForecastWind("");
                return;
              }
              const n = Number(v);
              if (!Number.isNaN(n)) {
                setForecastWind(n);
                if (seaStateAuto) {
                  setSeaState(getSeaStateFromWind(n));
                }
              }
            }}
          />

          <select
            className="p-3 rounded-xl bg-black/30 border"
            value={seaState}
            onChange={(e) => {
              setSeaState(e.target.value as SeaState);
              setSeaStateAuto(false);
            }}
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
            onChange={(e) => {
              const nextCrew = Number(e.target.value) as CrewCount;
              setCrewCount(nextCrew);
              if (hikingAuto) {
                setHikingLevel(getDefaultHikingLevel(nextCrew));
              }
            }}
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
            onChange={(e) => {
              setHikingLevel(e.target.value as HikingLevel);
              setHikingAuto(false);
            }}
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
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="p-3 rounded-xl bg-black/30 border text-sm"
            onClick={() => {
              setSeaStateAuto(true);
              if (forecastWind !== "") {
                setSeaState(getSeaStateFromWind(Number(forecastWind)));
              }
            }}
          >
            Beaufort Auto: {seaStateAuto ? "On" : "Off"}
          </button>

          <button
            type="button"
            className="p-3 rounded-xl bg-black/30 border text-sm"
            onClick={() => {
              setHikingAuto(true);
              setHikingLevel(getDefaultHikingLevel(crewCount));
            }}
          >
            Hiking Auto: {hikingAuto ? "On" : "Off"}
          </button>
        </div>
      </Panel>

      {result && recommendationTone && (
        <Panel title="Recommendation">
          <div className="space-y-4">
            <div className={`rounded-2xl border p-4 ${recommendationTone.cardClass}`}>
              {finalCall && (
                <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="text-xs uppercase opacity-60">Final Call</div>
                  <div className="mt-1 text-sm font-semibold">
                    {finalCall}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs tracking-widest uppercase opacity-70">
                    Race Setup Call
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {legType === "upwind"
                      ? `${formatMainChoice(result.mainChoice)} + ${result.headsailChoice ? formatHeadsailChoice(result.headsailChoice) : "Headsail TBD"}`
                      : `${formatMainChoice(result.mainChoice)} + ${result.spinnakerChoice ? formatSpinChoice(result.spinnakerChoice) : "No Spinnaker Set"}`}
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${recommendationTone.badgeClass}`}>
                  {recommendationTone.badgeText}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase opacity-60">Confidence</div>
                <div className={`text-sm font-semibold ${
                  confidence === "High"
                    ? "text-green-300"
                    : confidence === "Medium"
                    ? "text-yellow-300"
                    : "text-red-300"
                }`}>
                  {confidence}
                </div>
              </div>

              {confidenceReason && (
                <div className="mt-2 text-sm opacity-80">
                  {confidenceReason}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="text-xs tracking-widest uppercase opacity-60">Effective Wind</div>
                <div className="mt-2 text-lg font-semibold">{result.effectiveWind.toFixed(1)} kt</div>
              </div>
              <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="text-xs tracking-widest uppercase opacity-60">Reef Call</div>
                <div className="mt-2 text-lg font-semibold">{formatReefCall(result.reefCall)}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                <div className="text-xs tracking-widest uppercase opacity-60">Main</div>
                <div className="mt-2 text-base font-semibold">{formatMainChoice(result.mainChoice)}</div>
              </div>

              {result.headsailChoice && (
                <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                  <div className="text-xs tracking-widest uppercase opacity-60">Headsail</div>
                  <div className="mt-2 text-base font-semibold">{formatHeadsailChoice(result.headsailChoice)}</div>
                </div>
              )}

              {result.spinnakerChoice && (
                <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
                  <div className="text-xs tracking-widest uppercase opacity-60">Spinnaker</div>
                  <div className="mt-2 text-base font-semibold">{formatSpinChoice(result.spinnakerChoice)}</div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
              <div className="text-xs tracking-widest uppercase opacity-60">Why This Changed</div>
              <div className="mt-2 text-sm leading-relaxed opacity-90">{result.reason}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
              <div className="text-xs tracking-widest uppercase opacity-60">Race Notes</div>
              <ul className="mt-2 list-disc ml-5 space-y-1 text-sm opacity-90">
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
              <div className="text-xs tracking-widest uppercase opacity-60">What Would Change the Call</div>
              <ul className="mt-2 list-disc ml-5 space-y-1 text-sm opacity-90">
                {callChangeTriggers.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <a
                href="/trim/main"
                className="block rounded-lg bg-red-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
              >
                Go to Mainsail Trim
                <div className="text-sm font-normal opacity-90">
                  Apply the {formatMainChoice(result.mainChoice)} call
                </div>
              </a>

              {result.headsailChoice && (
                <a
                  href="/trim/jib"
                  className="block rounded-lg bg-orange-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
                >
                  Go to Headsail Trim
                  <div className="text-sm font-normal opacity-90">
                    Trim the {formatHeadsailChoice(result.headsailChoice)}
                  </div>
                </a>
              )}

              {result.spinnakerChoice && result.spinnakerChoice !== "no_spinnaker" && (
                <a
                  href="/trim/spin"
                  className="block rounded-lg bg-blue-600 text-white p-4 font-semibold shadow active:scale-[0.98] transition md:col-span-2"
                >
                  Go to Spinnaker Trim
                  <div className="text-sm font-normal opacity-90">
                    Trim the {formatSpinChoice(result.spinnakerChoice)}
                  </div>
                </a>
              )}
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/"
          className="block w-full text-center rounded-lg bg-gray-700 text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Return Home
        </a>
        <a
          href="/trim"
          className="block w-full text-center rounded-lg bg-black text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Go to Trim Hub
        </a>
      </div>
    </main>
  );
}