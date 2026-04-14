export type SailMode = "upwind" | "downwind";
export type BoatMode = "speed" | "pointing" | "control";

export type Symptom =
  | "normal"
  | "slow"
  | "pinching"
  | "overpowered"
  | "cant_hold_lane"
  | "badair"
  | "too_much_helm"
  | "stalling"
  | "cannot_point";

export type LeechState =
  | "unknown"
  | "balanced"
  | "too_closed"
  | "too_open"
  | "hooked"
  | "twisty_then_stall"
  | "erratic_waves"
  | "erratic_dirty_air"
  | "dead_unreliable";

export type MainActionItem = {
  title: string;
  intent: string;
  doThis: string;
  why: string;
};

export type MainActionPlan = {
  headline: string;
  focus: string;
  actions: MainActionItem[];
};

type GetMainActionPlanArgs = {
  sailMode: SailMode;
  boatMode: BoatMode;
  symptom: Symptom;
  leechState: LeechState;
  travelerPos: number;
  sheetTension: number;
  vangTension: number;
  windSpd: number | "";
};

function windBand(kt: number | null): "light" | "medium" | "heavy" | "unknown" {
  if (kt == null || Number.isNaN(kt)) return "unknown";
  if (kt < 8) return "light";
  if (kt <= 14) return "medium";
  return "heavy";
}

export default function getMainActionPlan({
  sailMode,
  boatMode,
  symptom,
  leechState,
  travelerPos,
  sheetTension,
  vangTension,
  windSpd,
}: GetMainActionPlanArgs): MainActionPlan {
  const spd = windSpd === "" ? null : Number(windSpd);
  const band = windBand(spd);

  if (sailMode === "downwind") {
    return {
      headline: "Open the main and keep it stable.",
      focus: "Ease vang first, then sheet, then steer smoothly.",
      actions: [
        {
          title: "Vang",
          intent: "Keep the leech open.",
          doThis: `Ease vang from ${vangTension} toward 1-2.`,
          why: "Too much vang downwind hooks the leech and stalls the top of the sail.",
        },
        {
          title: "Sheet",
          intent: "Let the main breathe.",
          doThis: `Ease sheet from ${sheetTension} until the sail fills cleanly without collapsing.`,
          why: "A slightly more open main is easier to keep powered and stable downwind.",
        },
        {
          title: "Steering",
          intent: "Stabilize before trimming more.",
          doThis: "Steer smoothly through puffs and waves before making another adjustment.",
          why: "Downwind instability is often a steering problem first and a trim problem second.",
        },
      ],
    };
  }

  if (symptom === "overpowered" || symptom === "too_much_helm") {
    return {
      headline: "Depower the main first.",
      focus: "Traveler down, slight sheet ease, keep the boat flatter.",
      actions: [
        {
          title: "Traveler",
          intent: "Unload heel and helm.",
          doThis: `Drop traveler from ${travelerPos} down 1-2 numbers.`,
          why: "Traveler is the fastest way to unload the main without killing shape completely.",
        },
        {
          title: "Sheet",
          intent: "Open the leech slightly.",
          doThis: `Ease sheet from ${sheetTension} a small amount, not a full dump.`,
          why: "A small sheet ease adds twist and reduces stalling or loaded helm.",
        },
        {
          title: "Mode",
          intent: "Stop chasing angle.",
          doThis: `Stay in ${band === "heavy" ? "control" : "speed"} mode until the boat settles.`,
          why: "You cannot point well while overloaded and dragging the rudder.",
        },
      ],
    };
  }

  if (symptom === "slow" || symptom === "stalling") {
    return {
      headline: "Rebuild flow before asking for height.",
      focus: "Ease a touch, get the boat alive, then compare.",
      actions: [
        {
          title: "Sheet",
          intent: "Free the leech.",
          doThis: `Ease mainsheet slightly from ${sheetTension}.`,
          why: "A tiny ease often brings the top of the main back to life.",
        },
        {
          title: "Traveler",
          intent: "Support angle later.",
          doThis: `Hold traveler near ${travelerPos} for now and change only after speed returns.`,
          why: "Changing too many controls at once makes it harder to know what helped.",
        },
        {
          title: "Compare",
          intent: "Validate the change.",
          doThis: "Hold the new setting for 30-60 seconds and compare against a nearby boat.",
          why: "Speed calls need a clean comparison window, not constant trimming.",
        },
      ],
    };
  }

  if (symptom === "pinching" || symptom === "cannot_point") {
    return {
      headline: "Stop forcing angle.",
      focus: "Get speed first, then rebuild height with traveler.",
      actions: [
        {
          title: "Sheet",
          intent: "Open the groove.",
          doThis: `Ease mainsheet slightly from ${sheetTension}.`,
          why: "A slightly more open leech gives the boat a wider groove and better pace.",
        },
        {
          title: "Steering",
          intent: "Foot for speed.",
          doThis: "Bear off slightly and keep the boat moving before trying to point again.",
          why: "Pointing comes from speed, not from simply turning the bow up.",
        },
        {
          title: "Traveler",
          intent: "Recover angle later.",
          doThis: `Once speed is back, bring traveler up from ${travelerPos} in small steps.`,
          why: "Traveler is cleaner than re-sheeting too hard too early.",
        },
      ],
    };
  }

  if (leechState === "too_closed" || leechState === "hooked") {
    return {
      headline: "The leech is too tight.",
      focus: "Ease sheet first, then use traveler for angle.",
      actions: [
        {
          title: "Sheet",
          intent: "Unhook the upper leech.",
          doThis: `Ease sheet slightly from ${sheetTension}.`,
          why: "A hooked leech stalls the upper main and makes the boat feel sticky.",
        },
        {
          title: "Traveler",
          intent: "Hold lane without re-hooking.",
          doThis: `If needed, raise traveler slightly from ${travelerPos} after easing sheet.`,
          why: "Traveler can recover angle without closing the leech back down immediately.",
        },
        {
          title: "Check",
          intent: "Re-check feel.",
          doThis: "Look for a more open, stable top section and a less loaded helm.",
          why: "That is the signal the change actually worked.",
        },
      ],
    };
  }

  if (leechState === "too_open") {
    return {
      headline: "The leech needs more support.",
      focus: "Trim slightly or use traveler to add angle support.",
      actions: [
        {
          title: "Sheet",
          intent: "Support the top of the sail.",
          doThis: `Trim sheet slightly from ${sheetTension}.`,
          why: "Too much twist can leave speed and angle on the table.",
        },
        {
          title: "Traveler",
          intent: "Add angle carefully.",
          doThis: `If needed, raise traveler slightly from ${travelerPos}.`,
          why: "Traveler can support angle without snapping the leech shut.",
        },
        {
          title: "Compare",
          intent: "Do not over-correct.",
          doThis: "Hold the new setting and reverse it if the boat gets sticky.",
          why: "A supported leech is good; a stalled leech is slow.",
        },
      ],
    };
  }

  if (boatMode === "pointing") {
    return {
      headline: "Point only after speed is stable.",
      focus: "Use traveler for angle, sheet for fine tuning.",
      actions: [
        {
          title: "Traveler",
          intent: "Add angle first.",
          doThis: `Raise traveler slightly from ${travelerPos}.`,
          why: "Traveler usually gives cleaner angle support than just over-sheeting.",
        },
        {
          title: "Sheet",
          intent: "Fine tune the leech.",
          doThis: `Trim sheet from ${sheetTension} only to the edge of stall.`,
          why: "You want support, not a stalled upper leech.",
        },
        {
          title: "Steering",
          intent: "Stay honest.",
          doThis: "If the boat gets sticky, go back to speed mode immediately.",
          why: "A forced point mode costs more than it gains.",
        },
      ],
    };
  }

  if (boatMode === "control") {
    return {
      headline: "Widen the groove and calm the platform.",
      focus: "Slightly easier trim, smoother steering, fewer sharp changes.",
      actions: [
        {
          title: "Traveler",
          intent: "Reduce load.",
          doThis: `Lower traveler slightly from ${travelerPos}.`,
          why: "That helps calm the boat without dumping shape all at once.",
        },
        {
          title: "Sheet",
          intent: "Keep the main forgiving.",
          doThis: `Keep sheet slightly easier than max trim, around ${sheetTension}.`,
          why: "A forgiving leech is easier to steer through waves and puffs.",
        },
        {
          title: "Process",
          intent: "Make one clean move.",
          doThis: "Hold the setting through a full puff or wave set before changing again.",
          why: "Control mode works best when the crew stops chasing every second of noise.",
        },
      ],
    };
  }

  return {
    headline: "Keep the main driving and alive.",
    focus: "Use sheet for leech tension and traveler for angle.",
    actions: [
      {
        title: "Sheet",
        intent: "Trim to the edge of stall.",
        doThis: `Trim or ease around ${sheetTension} until the sail feels alive, not sticky.`,
        why: "The mainsheet is your main throttle for leech tension.",
      },
      {
        title: "Traveler",
        intent: "Support the target mode.",
        doThis: `Use traveler around ${travelerPos} to balance speed versus angle.`,
        why: "Traveler changes angle of attack more cleanly than sheet alone.",
      },
      {
        title: "Vang",
        intent: "Do not overthink it upwind.",
        doThis: `Keep vang around ${vangTension} unless the boom needs more support.`,
        why: "Upwind, the sheet and traveler usually matter more than vang for the first move.",
      },
    ],
  };
}