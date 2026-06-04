import type {
  FullSizeSpinChoice,
  Headsail140Choice,
  Headsail150Choice,
  HeadsailChoice,
  HeavyAirSpinChoice,
  MainChoice,
  SailInventoryDefaults,
  SpinChoice,
} from "@/data/logic/sailSelectionLogic";

export const MAIN_INVENTORY_OPTIONS: MainChoice[] = ["quantum_main", "north_main_backup"];
export const HEADSAIL_150_OPTIONS: Headsail150Choice[] = ["ullman_150", "north_150"];
export const HEADSAIL_140_OPTIONS: Headsail140Choice[] = ["north_140"];
export const FULL_SIZE_SPIN_OPTIONS: FullSizeSpinChoice[] = [
  "north_spin_yellow_black",
  "north_spin_teal_black_white",
  "old_spin_red_white_best_old",
  "old_spin_red_white_horizon",
];
export const HEAVY_AIR_SPIN_OPTIONS: HeavyAirSpinChoice[] = [
  "small_red_white_blue_heavy_air",
  "north_spin_yellow_black",
  "north_spin_teal_black_white",
];
export const ALL_SPIN_OPTIONS: SpinChoice[] = [
  ...FULL_SIZE_SPIN_OPTIONS,
  "small_red_white_blue_heavy_air",
  "no_spinnaker",
];
export const ALL_HEADSAIL_OPTIONS: HeadsailChoice[] = [
  ...HEADSAIL_150_OPTIONS,
  ...HEADSAIL_140_OPTIONS,
];

export type SailInventoryDefaultKey = keyof SailInventoryDefaults;

type SailInventoryCategoryMeta = {
  title: string;
  detail: string;
  options: readonly string[];
  formatChoice: (value: string) => string;
};

export function formatMainChoice(value: MainChoice | string): string {
  switch (value) {
    case "quantum_main":
      return "Quantum Main";
    case "north_main_backup":
      return "North Main (Backup)";
    default:
      return value;
  }
}

export function formatHeadsailChoice(value: HeadsailChoice | string): string {
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

export function formatSpinChoice(value: SpinChoice | string): string {
  switch (value) {
    case "north_spin_yellow_black":
      return "North Spinnaker - Black / Yellow";
    case "north_spin_teal_black_white":
      return "North Spinnaker - White / Teal";
    case "old_spin_red_white_best_old":
      return "Older Spinnaker - Red / White (Best Older)";
    case "old_spin_red_white_horizon":
      return "Older Spinnaker - Red / White (Horizon)";
    case "small_red_white_blue_heavy_air":
      return "Heavy-Air Spinnaker - Small Red / White / Blue";
    case "no_spinnaker":
      return "No Spinnaker";
    default:
      return value;
  }
}

export const SAIL_INVENTORY_CATEGORY_ORDER: SailInventoryDefaultKey[] = [
  "mainChoice",
  "headsail150Choice",
  "headsail140Choice",
  "fullSizeSpinnakerChoice",
  "heavyAirSpinnakerChoice",
];

export const SAIL_INVENTORY_CATEGORY_META: {
  [K in SailInventoryDefaultKey]: SailInventoryCategoryMeta;
} = {
  mainChoice: {
    title: "Main",
    detail: "Base mainsail to use whenever the Step 2 call wants the standard main package.",
    options: MAIN_INVENTORY_OPTIONS,
    formatChoice: formatMainChoice,
  },
  headsail150Choice: {
    title: "150 Genoa",
    detail: "Primary default whenever the upwind call stays in the 150% headsail class.",
    options: HEADSAIL_150_OPTIONS,
    formatChoice: formatHeadsailChoice,
  },
  headsail140Choice: {
    title: "140 Jib",
    detail: "Smaller upwind headsail used once the recommendation crosses into control mode.",
    options: HEADSAIL_140_OPTIONS,
    formatChoice: formatHeadsailChoice,
  },
  fullSizeSpinnakerChoice: {
    title: "Full-Size Spinnaker",
    detail: "Baseline downwind sail whenever the coach calls for a full-size kite.",
    options: FULL_SIZE_SPIN_OPTIONS,
    formatChoice: formatSpinChoice,
  },
  heavyAirSpinnakerChoice: {
    title: "Heavy-Air Spinnaker",
    detail: "Control-first downwind default for the heavy-air crossover.",
    options: HEAVY_AIR_SPIN_OPTIONS,
    formatChoice: formatSpinChoice,
  },
};

export function formatSailInventoryKey(key: SailInventoryDefaultKey) {
  return SAIL_INVENTORY_CATEGORY_META[key].title;
}

export function orderChoicesWithPreferred<T extends string>(
  choices: readonly T[],
  preferred: T
): T[] {
  const seen = new Set<T>();
  const ordered = [preferred, ...choices].filter((choice) => {
    if (seen.has(choice)) return false;
    seen.add(choice);
    return true;
  });

  return ordered;
}
