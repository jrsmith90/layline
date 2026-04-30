export type CrewCount = 3 | 4 | 5 | 6;

export type ChecklistPhase =
  | "pre-rounding prep"
  | "approach and rounding"
  | "bear away"
  | "pole on / pole set"
  | "hoist"
  | "trim until full"
  | "jib down"
  | "settle into downwind mode";

export type ChecklistStep = {
  label: string;
  detail: string;
  phase: ChecklistPhase;
};

export type CrewRole = {
  role: string;
  jobs: string[];
  duringSetPosition: string;
  afterSetPosition: string;
};

export type WeightDistributionNote = {
  condition: "Light air" | "Medium air" | "Heavy air";
  guidance: string;
};

export type DownwindChecklistConfig = {
  crewCount: CrewCount;
  title: string;
  description: string;
  sequence: {
    phase: ChecklistPhase;
    steps: ChecklistStep[];
  }[];
  roles: CrewRole[];
  weightDistribution: WeightDistributionNote[];
  calls: string[];
  commonMistakes: string[];
};
