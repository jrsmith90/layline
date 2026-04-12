

// Main Trim Logic (v2)

export type SailMode = "upwind" | "downwind";
export type BoatMode = "speed" | "pointing" | "control";

export type Symptom =
  | "normal"
  | "slow"
  | "overpowered"
  | "pinching"
  | "cant_hold_lane"
  | "badair"
  | "too_much_helm"
  | "stalling"
  | "cannot_point";

export type LeechState =
  | "unknown"
  | "balanced"
  | "too_open"
  | "too_closed"
  | "hooked"
  | "twisty_then_stall"
  | "erratic_waves"
  | "erratic_dirty_air"
  | "dead_unreliable";

export type ActionItem = {
  title: string;
  intent: string;
  doThis: string;
  why: string;
};

export type ActionPlan = {
  headline: string;
  focus: string;
  actions: ActionItem[];
};

function clampScale(n: number) {
  if (n < 1) return 1;
  if (n > 10) return 10;
  return Math.round(n);
}

function windBand(kt: number | null): "light" | "medium" | "heavy" | "unknown" {
  if (kt == null) return "unknown";
  if (kt < 8) return "light";
  if (kt <= 14) return "medium";
  return "heavy";
}

export function getMainActionPlan(params: {
  sailMode: SailMode;
  boatMode: BoatMode;
  symptom: Symptom;
  leechState: LeechState;
  travelerPos: number;
  sheetTension: number;
  vangTension: number;
  windSpd: number | "";
}): ActionPlan {
  const {
    sailMode,
    boatMode,
    symptom,
    leechState,
    travelerPos,
    sheetTension,
    vangTension,
    windSpd,
  } = params;

  const parsedWind = windSpd === "" ? null : Number(windSpd);
  const spd = parsedWind == null || Number.isNaN(parsedWind) ? null : parsedWind;
  const band = windBand(spd);

  // --- DOWNWIND ---
  if (sailMode === "downwind") {
    return {
      headline: "Downwind mainsail mode",
      focus: "Keep the main drawing with stable twist and avoid over-sheeting.",
      actions: [
        {
          title: "Sheet",
          intent: "Keep sail powered",
          doThis: "Ease until the sail fills cleanly, then trim only to stop collapse.",
          why: "Stable flow matters more than tight trim downwind.",
        },
        {
          title: "Vang",
          intent: "Control leech",
          doThis: `Set vang around ${vangTension}/10 — enough to support boom but not hook the leech.`,
          why: "Vang controls twist downwind.",
        },
        {
          title: "Steering",
          intent: "Stabilize angle",
          doThis: "Steer smoothly instead of trimming every small change.",
          why: "Angle changes have bigger impact than small trim tweaks.",
        },
      ],
    };
  }

  // --- LEECH STATES ---
  if (leechState === "too_closed" || leechState === "hooked") {
    return {
      headline: "Leech too tight",
      focus: "Open the top of the main first.",
      actions: [
        {
          title: "Mainsheet",
          intent: "Add twist",
          doThis: `Ease from ${sheetTension} → ${clampScale(sheetTension - 1)}`,
          why: "Closed leech stalls flow and makes the boat sticky.",
        },
        {
          title: "Traveler",
          intent: "Hold angle",
          doThis: `Keep near ${travelerPos}/10 instead of re-sheeting hard.`,
          why: "Traveler holds angle without choking the leech.",
        },
      ],
    };
  }

  if (leechState === "too_open") {
    return {
      headline: "Leech too open",
      focus: "Add support without over-closing.",
      actions: [
        {
          title: "Mainsheet",
          intent: "Stabilize leech",
          doThis: `Trim from ${sheetTension} → ${clampScale(sheetTension + 1)}`,
          why: "Too much twist loses height.",
        },
        {
          title: "Traveler",
          intent: "Support centerline",
          doThis: `Move up 1 from ${travelerPos} → ${clampScale(travelerPos + 1)}`,
          why: "Traveler supports angle cleanly.",
        },
      ],
    };
  }

  // --- SYMPTOMS ---
  if (symptom === "overpowered") {
    return {
      headline: "Depower main",
      focus: "Reduce heel and helm load.",
      actions: [
        {
          title: "Traveler",
          intent: "Unload boat",
          doThis: `Drop ${band === "heavy" ? 2 : 1} steps from ${travelerPos}`,
          why: "Fastest depower control.",
        },
        {
          title: "Sheet",
          intent: "Add twist",
          doThis: `Ease slightly from ${sheetTension}`,
          why: "Twist reduces load and drag.",
        },
      ],
    };
  }

  if (symptom === "slow") {
    return {
      headline: "Rebuild speed",
      focus: "Fix flow first.",
      actions: [
        {
          title: "Sheet",
          intent: "Free sail",
          doThis: `Ease slightly from ${sheetTension}`,
          why: "Fastest way to restore flow.",
        },
        {
          title: "Hold",
          intent: "Validate",
          doThis: "Hold 30–60 seconds before next change.",
          why: "Need clean comparison window.",
        },
      ],
    };
  }

  if (symptom === "pinching" || symptom === "cannot_point") {
    return {
      headline: "Stop forcing angle",
      focus: "Speed first, then height.",
      actions: [
        {
          title: "Sheet",
          intent: "Ease out of stall",
          doThis: `Ease slightly from ${sheetTension}`,
          why: "Boat is above its supported angle.",
        },
        {
          title: "Steering",
          intent: "Foot",
          doThis: "Bear away slightly to rebuild speed.",
          why: "Speed supports pointing.",
        },
      ],
    };
  }

  if (symptom === "too_much_helm") {
    return {
      headline: "Reduce helm",
      focus: "Unload boat first.",
      actions: [
        {
          title: "Traveler",
          intent: "Reduce load",
          doThis: `Drop 1 step from ${travelerPos}`,
          why: "Fastest helm fix.",
        },
        {
          title: "Sheet",
          intent: "Free leech",
          doThis: `Ease slightly from ${sheetTension}`,
          why: "Twist reduces helm pressure.",
        },
      ],
    };
  }

  // --- DEFAULT ---
  return {
    headline: "Build speed first",
    focus: "Use sheet for flow, traveler for angle.",
    actions: [
      {
        title: "Sheet",
        intent: "Set flow",
        doThis: `Trim to edge of stall, then ease slightly. Current: ${sheetTension}`,
        why: "Flow drives speed.",
      },
      {
        title: "Traveler",
        intent: "Adjust angle",
        doThis: `Move ±1 from ${travelerPos} depending on load/angle need.`,
        why: "Fine-tunes without breaking flow.",
      },
    ],
  };
}