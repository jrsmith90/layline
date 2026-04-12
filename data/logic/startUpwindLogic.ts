export type Tone = "none" | "green" | "amber" | "red" | "teal";

export type MessageKey =
  | "stable"
  | "hold"
  | "prep_bail"
  | "bail_now"
  | "reenter_now"
  | "hold_low"
  | "full_reset";

export type ModeKey = "speed" | "pointing" | "control";

export type StartLaneQuestionId =
  | "forward_escape"
  | "windward_threat"
  | "leeward_pressure";

export type StartExtraFlag =
  | "LINE_SIGHT_GOOD"
  | "LINE_SIGHT_POOR"
  | "FRONT_ROW"
  | "SECOND_ROW"
  | "PORT_APPROACH_BLOCKED"
  | "FAVORED_END_CROWDED"
  | "MIDLINE_SAG_EXPECTED"
  | "FLEET_LATE"
  | "FLEET_ON_TIME"
  | "FLEET_EARLY";

export type LaneState = "OPEN" | "SHRINKING" | "MARGINAL" | "PINNED" | "DEAD";

export interface DisplayMessage {
  text: string;
  tone: Tone;
  subtext?: string;
  noSubtext?: boolean;
}

export interface LaneQuestion {
  id: StartLaneQuestionId;
  prompt: string;
  helper: string;
  options: string[];
}

export interface StateMapEntry {
  lane: string;
  state: MessageKey;
}

export interface OverrideRule {
  condition: string;
  state: MessageKey;
}

export interface StartWindow {
  from: number;
  to: number;
}

export interface StartWindows {
  prep: StartWindow;
  reset: StartWindow;
  sequence: StartWindow;
  execution: StartWindow;
}

export interface TrimEligibility {
  laneAllowed: string[];
  modeStableSeconds: number;
  blockedDuring: string[];
  maneuverBlockSeconds: number;
  majorCongestionBlocksTrim?: boolean;
}

export interface StartUpwindLogic {
  version: string;
  messages: {
    stable: DisplayMessage;
    hold: DisplayMessage;
    prep_bail: DisplayMessage;
    bail_now: DisplayMessage;
    reenter_now: DisplayMessage;
    hold_low: DisplayMessage;
    full_reset: DisplayMessage;
    modes: Record<ModeKey, DisplayMessage>;
  };
  cooldowns: {
    minMessageHoldSeconds: number;
    prepBailPersistSeconds: number;
    deescalateStableSeconds: number;
    trimPersistSeconds: number;
    trimMinUpdateSeconds: number;
  };
  global: {
    interactionModel: "glance_only";
    silenceMeansStable: boolean;
    singleMessageOnly: boolean;
    priorityOrder: ["lane", "mode", "jib", "main", "controls"];
  };
  start: {
    windows: StartWindows;
    laneQuestions: LaneQuestion[];
    extraFlags: StartExtraFlag[];
    laneResolution: {
      ifForwardEscapeNo: "PINNED";
      ifForwardEscapeMaybe: "MARGINAL";
      ifForwardEscapeYesAndAnyPressure: "SHRINKING";
      else: "OPEN";
    };
    riskAmplifiersRanked: string[];
    stateMap: StateMapEntry[];
    overrides: OverrideRule[];
    postBail: {
      clearAirSeconds: number;
      commands: MessageKey[];
    };
  };
  upwind: {
    activeAfterSeconds: number;
    laneStates: LaneState[];
    laneToState: Record<string, MessageKey>;
    riskConcepts: {
      useStrategyFirst: boolean;
      tacticsAreSlow: boolean;
      avoidCongestionZones: boolean;
      protectTackOption: boolean;
      manageLeverage: boolean;
    };
    modes: ModeKey[];
    modeVisibilityGate: {
      laneAllowed: string[];
      blockedDuring: string[];
      modeStableSeconds: number;
    };
    trimEligibility: TrimEligibility;
    trimIntent: {
      jib: Record<ModeKey, string>;
      main: Record<ModeKey, string>;
    };
    boatspeedRules: string[];
  };
  logging: {
    fields: string[];
  };
}

export const startUpwindLogic: StartUpwindLogic = {
  version: "logic_v2_2026-04-11",
  messages: {
    stable: { text: "", tone: "none" },
    hold: { text: "HOLD", tone: "green" },
    prep_bail: { text: "PREP BAIL", tone: "amber" },
    bail_now: { text: "BAIL NOW", tone: "red", noSubtext: true },
    reenter_now: { text: "RE-ENTER NOW", tone: "green" },
    hold_low: { text: "HOLD LOW", tone: "green" },
    full_reset: { text: "FULL RESET", tone: "amber", subtext: "Clear air first" },
    modes: {
      speed: { text: "MODE: SPEED", tone: "green" },
      pointing: { text: "MODE: POINTING", tone: "amber" },
      control: { text: "MODE: CONTROL", tone: "teal" },
    },
  },
  cooldowns: {
    minMessageHoldSeconds: 3,
    prepBailPersistSeconds: 5,
    deescalateStableSeconds: 10,
    trimPersistSeconds: 5,
    trimMinUpdateSeconds: 15,
  },
  global: {
    interactionModel: "glance_only",
    silenceMeansStable: true,
    singleMessageOnly: true,
    priorityOrder: ["lane", "mode", "jib", "main", "controls"],
  },
  start: {
    windows: {
      prep: { from: -1800, to: -600 },
      reset: { from: -600, to: -300 },
      sequence: { from: -300, to: -90 },
      execution: { from: -90, to: 30 },
    },
    laneQuestions: [
      {
        id: "forward_escape",
        prompt: "Forward escape?",
        helper: "Can you sail straight for ~10 seconds and keep a lane?",
        options: ["YES", "MAYBE", "NO"],
      },
      {
        id: "windward_threat",
        prompt: "Windward threat?",
        helper: "Boat to windward able to squeeze or luff you",
        options: ["NONE", "PRESENT", "CONTROLLING"],
      },
      {
        id: "leeward_pressure",
        prompt: "Leeward pressure?",
        helper: "Leeward boat accelerating or rolling you",
        options: ["NONE", "BUILDING", "CLEAR"],
      },
    ],
    extraFlags: [
      "LINE_SIGHT_GOOD",
      "LINE_SIGHT_POOR",
      "FRONT_ROW",
      "SECOND_ROW",
      "PORT_APPROACH_BLOCKED",
      "FAVORED_END_CROWDED",
      "MIDLINE_SAG_EXPECTED",
      "FLEET_LATE",
      "FLEET_ON_TIME",
      "FLEET_EARLY",
    ],
    laneResolution: {
      ifForwardEscapeNo: "PINNED",
      ifForwardEscapeMaybe: "MARGINAL",
      ifForwardEscapeYesAndAnyPressure: "SHRINKING",
      else: "OPEN",
    },
    riskAmplifiersRanked: [
      "no_forward_escape",
      "windward_overlap_luff",
      "leeward_accelerating",
      "time_le_20s",
      "poor_line_sight",
      "early",
      "late",
    ],
    stateMap: [
      { lane: "OPEN", state: "stable" },
      { lane: "OPEN_MINOR_PRESSURE", state: "hold" },
      { lane: "SHRINKING", state: "hold" },
      { lane: "MARGINAL", state: "prep_bail" },
      { lane: "PINNED", state: "bail_now" },
    ],
    overrides: [
      { condition: "no_forward_escape_and_time_le_60s", state: "bail_now" },
      { condition: "marginal_and_tier2_and_time_le_20s", state: "bail_now" },
      { condition: "marginal_and_poor_line_sight_and_time_le_20s", state: "bail_now" },
      { condition: "port_approach_blocked_and_no_forward_escape", state: "bail_now" },
    ],
    postBail: {
      clearAirSeconds: 10,
      commands: ["reenter_now", "hold_low", "full_reset"],
    },
  },
  upwind: {
    activeAfterSeconds: 30,
    laneStates: ["OPEN", "SHRINKING", "MARGINAL", "DEAD"],
    laneToState: {
      OPEN: "stable",
      SHRINKING: "hold",
      MARGINAL: "prep_bail",
      DEAD: "bail_now",
    },
    riskConcepts: {
      useStrategyFirst: true,
      tacticsAreSlow: true,
      avoidCongestionZones: true,
      protectTackOption: true,
      manageLeverage: true,
    },
    modes: ["speed", "pointing", "control"],
    modeVisibilityGate: {
      laneAllowed: ["OPEN", "SHRINKING"],
      blockedDuring: ["prep_bail", "bail_now", "reenter_now", "hold_low", "full_reset"],
      modeStableSeconds: 10,
    },
    trimEligibility: {
      laneAllowed: ["OPEN", "SHRINKING"],
      modeStableSeconds: 10,
      blockedDuring: ["prep_bail", "bail_now", "reenter_now", "hold_low", "full_reset"],
      maneuverBlockSeconds: 5,
      majorCongestionBlocksTrim: true,
    },
    trimIntent: {
      jib: {
        speed: "Favor power / Fuller jib",
        pointing: "Control entry / Hold height / Flow first",
        control: "Open leech / Depower jib",
      },
      main: {
        speed: "Build power / Keep depth",
        pointing: "Flatten main / Stabilize leech",
        control: "Depower main / Add twist",
      },
    },
    boatspeedRules: [
      "evaluate_relative_to_other_boats",
      "be_proactive_not_reactive",
      "change_gears_early",
      "go_fast_first_then_point",
      "widen_groove_when_unstable",
      "if_slow_change_something",
    ],
  },
  logging: {
    fields: [
      "phase",
      "lane_state",
      "boat_mode",
      "relative_speed_assessment",
      "congestion_state",
      "leverage_bias",
      "first_change_made",
      "groove_state",
      "incoming_condition_called",
      "result",
    ],
  },
};

export default startUpwindLogic;