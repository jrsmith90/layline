

export type LegType = "upwind" | "downwind";

export type SeaState =
  | "calm_0"
  | "light_air_1_3"
  | "light_breeze_4_6"
  | "gentle_breeze_7_10"
  | "moderate_breeze_11_16"
  | "fresh_breeze_17_21"
  | "strong_breeze_22_27";

export type HikingLevel = "light" | "moderate" | "full";
export type RiskMode = "max_performance" | "conservative";
export type CrewCount = 3 | 4 | 5 | 6;

export type MainChoice = "quantum_main" | "north_main_backup";

export type HeadsailChoice = "ullman_150" | "north_150" | "north_140";

export type SpinChoice =
  | "north_spin_yellow_black"
  | "north_spin_teal_black_white"
  | "old_spin_red_white_best_old"
  | "old_spin_red_white_horizon"
  | "small_red_white_blue_heavy_air"
  | "no_spinnaker";

export type ReefCall = "no_reef" | "consider_reef" | "reef_now";

export type SailSelectionInput = {
  forecastWind: number;
  seaState: SeaState;
  crewCount: CrewCount;
  hikingLevel: HikingLevel;
  legType: LegType;
  riskMode: RiskMode;
};

export type SailSelectionOutput = {
  legType: LegType;
  effectiveWind: number;
  crewPowerScore: number;
  mainChoice: MainChoice;
  headsailChoice?: HeadsailChoice;
  spinnakerChoice?: SpinChoice;
  reefCall: ReefCall;
  reason: string;
  notes: string[];
};

export const SEA_STATE_OPTIONS: Array<{ value: SeaState; label: string }> = [
  { value: "calm_0", label: "Calm (0 kt)" },
  { value: "light_air_1_3", label: "Light Air (1–3 kts)" },
  { value: "light_breeze_4_6", label: "Light Breeze (4–6 kts)" },
  { value: "gentle_breeze_7_10", label: "Gentle Breeze (7–10 kts)" },
  { value: "moderate_breeze_11_16", label: "Moderate Breeze (11–16 kts)" },
  { value: "fresh_breeze_17_21", label: "Fresh Breeze (17–21 kts)" },
  { value: "strong_breeze_22_27", label: "Strong Breeze (22–27 kts)" },
];

export const seaStateScore: Record<SeaState, number> = {
  calm_0: 0,
  light_air_1_3: 0,
  light_breeze_4_6: 0,
  gentle_breeze_7_10: 1,
  moderate_breeze_11_16: 2,
  fresh_breeze_17_21: 3,
  strong_breeze_22_27: 4,
};

export const mainRanking: MainChoice[] = ["quantum_main", "north_main_backup"];

export const headsailRanking = {
  sail150: ["ullman_150", "north_150"] as HeadsailChoice[],
  sail140: ["north_140"] as HeadsailChoice[],
};

export const fullSizeSpinRanking: SpinChoice[] = [
  "north_spin_yellow_black",
  "north_spin_teal_black_white",
  "old_spin_red_white_best_old",
  "old_spin_red_white_horizon",
];

export const heavyAirSpinRanking: SpinChoice[] = [
  "small_red_white_blue_heavy_air",
  "north_spin_yellow_black",
  "north_spin_teal_black_white",
];

export function getCrewPowerScore(
  crewCount: CrewCount,
  hikingLevel: HikingLevel
): number {
  if (crewCount === 3 && hikingLevel !== "full") return 1;
  if (crewCount === 4 && hikingLevel === "light") return 2;
  if (crewCount === 4 && hikingLevel !== "light") return 3;
  if (crewCount === 5 && hikingLevel === "light") return 3;
  if (crewCount === 5 && hikingLevel !== "light") return 4;
  if (crewCount === 6 && hikingLevel === "light") return 4;
  return 5;
}

export function getRiskOffset(riskMode: RiskMode): number {
  return riskMode === "conservative" ? 1 : 0;
}

export function getEffectiveWind(
  forecastWind: number,
  seaState: SeaState,
  crewPowerScore: number,
  riskMode: RiskMode
): number {
  const seaAdj = seaStateScore[seaState];
  const crewAdj =
    crewPowerScore >= 5 ? -1 : crewPowerScore >= 4 ? 0 : crewPowerScore === 3 ? 1 : 2;
  const riskAdj = getRiskOffset(riskMode);

  return forecastWind + seaAdj + crewAdj + riskAdj;
}

export function selectUpwindHeadsailClass(
  effectiveWind: number
): "sail150" | "sail140" {
  if (effectiveWind <= 13) return "sail150";
  if (effectiveWind >= 18) return "sail140";
  return "sail150";
}

export function shouldForce140InCrossover(
  effectiveWind: number,
  seaState: SeaState,
  crewPowerScore: number,
  riskMode: RiskMode
): boolean {
  if (effectiveWind < 14 || effectiveWind > 17) return false;
  if (seaStateScore[seaState] >= 2) return true;
  if (crewPowerScore <= 2) return true;
  if (riskMode === "conservative") return true;
  return false;
}

export function getUpwindMainChoice(): MainChoice {
  return mainRanking[0];
}

export function getUpwindHeadsailChoice(
  effectiveWind: number,
  seaState: SeaState,
  crewPowerScore: number,
  riskMode: RiskMode
): HeadsailChoice {
  const baseClass = selectUpwindHeadsailClass(effectiveWind);

  if (shouldForce140InCrossover(effectiveWind, seaState, crewPowerScore, riskMode)) {
    return headsailRanking.sail140[0];
  }

  return baseClass === "sail150"
    ? headsailRanking.sail150[0]
    : headsailRanking.sail140[0];
}

export function getReefCall(
  effectiveWind: number,
  seaState: SeaState,
  crewPowerScore: number
): ReefCall {
  if (effectiveWind <= 18) return "no_reef";
  if (effectiveWind >= 23) return "reef_now";

  if (seaStateScore[seaState] >= 3) return "reef_now";
  if (crewPowerScore <= 2) return "reef_now";
  return "consider_reef";
}

type SpinClass = "full_size" | "heavy_air" | "none";

export function getSpinClass(
  effectiveWind: number,
  seaState: SeaState,
  crewPowerScore: number,
  riskMode: RiskMode
): SpinClass {
  if (effectiveWind <= 16) return "full_size";

  if (effectiveWind >= 22) {
    if (crewPowerScore <= 2) return "none";
    if (seaStateScore[seaState] >= 4) return "none";
    if (riskMode === "conservative" && seaStateScore[seaState] >= 3) return "none";
    return "heavy_air";
  }

  if (crewPowerScore >= 4 && seaStateScore[seaState] <= 2 && riskMode === "max_performance") {
    return "full_size";
  }

  return "heavy_air";
}

export function getSpinnakerChoice(
  effectiveWind: number,
  seaState: SeaState,
  crewPowerScore: number,
  riskMode: RiskMode
): SpinChoice {
  const spinClass = getSpinClass(effectiveWind, seaState, crewPowerScore, riskMode);

  if (spinClass === "none") return "no_spinnaker";
  if (spinClass === "heavy_air") return heavyAirSpinRanking[0];
  return fullSizeSpinRanking[0];
}

export function getDownwindReefCall(
  effectiveWind: number,
  spinnakerChoice: SpinChoice
): ReefCall {
  if (spinnakerChoice === "no_spinnaker" && effectiveWind >= 24) return "consider_reef";
  if (effectiveWind >= 27) return "reef_now";
  return "no_reef";
}

export function buildUpwindReason(
  effectiveWind: number,
  crewPowerScore: number,
  seaState: SeaState
): string {
  return `Effective wind ${effectiveWind.toFixed(1)} kt, crew power ${crewPowerScore}/5, sea state ${formatSeaState(seaState)}.`;
}

export function buildDownwindReason(
  effectiveWind: number,
  crewPowerScore: number,
  seaState: SeaState
): string {
  return `Effective wind ${effectiveWind.toFixed(1)} kt, crew power ${crewPowerScore}/5, sea state ${formatSeaState(seaState)}.`;
}

export function buildUpwindNotes(
  headsailChoice: HeadsailChoice,
  reefCall: ReefCall,
  riskMode: RiskMode
): string[] {
  const notes: string[] = [];

  if (headsailChoice === "ullman_150") {
    notes.push("Default best-condition 150 for racing.");
  }
  if (headsailChoice === "north_150") {
    notes.push("Using second-choice 150 because the best 150 is unavailable.");
  }
  if (headsailChoice === "north_140") {
    notes.push("Selected smaller headsail for control and groove stability.");
  }
  if (reefCall !== "no_reef") {
    notes.push("Reef decision is influenced by sea state and crew power, not wind alone.");
  }
  if (riskMode === "conservative") {
    notes.push("Conservative mode shifts transitions earlier.");
  }

  return notes;
}

export function buildDownwindNotes(
  spinnakerChoice: SpinChoice,
  reefCall: ReefCall,
  riskMode: RiskMode
): string[] {
  const notes: string[] = [];

  if (spinnakerChoice === "no_spinnaker") {
    notes.push("No-spinnaker call due to handling margin.");
  } else if (spinnakerChoice === "small_red_white_blue_heavy_air") {
    notes.push("Heavy-air / smaller spinnaker selected for control.");
  } else {
    notes.push("Best available full-size race spinnaker selected.");
  }

  if (reefCall !== "no_reef") {
    notes.push("Main reef call increases as wind and handling risk build.");
  }
  if (riskMode === "conservative") {
    notes.push("Conservative mode lowers the spinnaker threshold.");
  }

  return notes;
}

export function formatSeaState(seaState: SeaState): string {
  const match = SEA_STATE_OPTIONS.find((option) => option.value === seaState);
  return match ? match.label : seaState;
}

export function getRaceSailPlan(input: SailSelectionInput): SailSelectionOutput {
  const crewPowerScore = getCrewPowerScore(input.crewCount, input.hikingLevel);
  const effectiveWind = getEffectiveWind(
    input.forecastWind,
    input.seaState,
    crewPowerScore,
    input.riskMode
  );

  if (input.legType === "upwind") {
    const mainChoice = getUpwindMainChoice();
    const headsailChoice = getUpwindHeadsailChoice(
      effectiveWind,
      input.seaState,
      crewPowerScore,
      input.riskMode
    );
    const reefCall = getReefCall(effectiveWind, input.seaState, crewPowerScore);

    return {
      legType: "upwind",
      effectiveWind,
      crewPowerScore,
      mainChoice,
      headsailChoice,
      reefCall,
      reason: buildUpwindReason(effectiveWind, crewPowerScore, input.seaState),
      notes: buildUpwindNotes(headsailChoice, reefCall, input.riskMode),
    };
  }

  const mainChoice = getUpwindMainChoice();
  const spinnakerChoice = getSpinnakerChoice(
    effectiveWind,
    input.seaState,
    crewPowerScore,
    input.riskMode
  );
  const reefCall = getDownwindReefCall(effectiveWind, spinnakerChoice);

  return {
    legType: "downwind",
    effectiveWind,
    crewPowerScore,
    mainChoice,
    spinnakerChoice,
    reefCall,
    reason: buildDownwindReason(effectiveWind, crewPowerScore, input.seaState),
    notes: buildDownwindNotes(spinnakerChoice, reefCall, input.riskMode),
  };
}