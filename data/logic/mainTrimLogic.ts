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
  backstayTension: number;
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
  backstayTension,
  windSpd,
}: GetMainActionPlanArgs): MainActionPlan {
  const spd = windSpd === "" ? null : Number(windSpd);
  const band = windBand(spd);
  const travelerMode = travelerPos <= 3 ? "down" : travelerPos <= 6 ? "middle" : "up";
  const sheetMode = sheetTension <= 3 ? "eased" : sheetTension <= 6 ? "trimmed" : "hard-trimmed";
  const vangMode = vangTension <= 3 ? "loose" : vangTension <= 6 ? "set" : "on";
  const backstayMode = backstayTension <= 3 ? "off" : backstayTension <= 6 ? "set" : "on";

  if (sailMode === "downwind") {
    return {
      headline: "Open the main and keep it stable.",
      focus: `Keep the boom supported without over-locking the leech. Right now: vang ${vangMode}, sheet ${sheetMode}.`,
      actions: [
        {
          title: "Vang",
          intent: "Keep the leech open.",
          doThis: `If the boom feels too free, move vang one step firmer from ${vangMode}. If the leech feels tight or the boat feels sticky, move it one step looser.`,
          why: "Too much vang downwind hooks the leech and stalls the top of the sail.",
        },
        {
          title: "Sheet",
          intent: "Let the main breathe.",
          doThis: `Use sheet from its current ${sheetMode} setting to keep the sail full without choking the top of the leech.`,
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
      focus: `Depower with the controls, not just the helm. Right now: traveler ${travelerMode}, sheet ${sheetMode}, backstay ${backstayMode}.`,
      actions: [
        {
          title: "Traveler",
          intent: "Unload heel and helm.",
          doThis: `If traveler is ${travelerMode}, move it one step lower first before making a bigger sheet change.`,
          why: "Traveler is the fastest way to unload the main without killing shape completely.",
        },
        {
          title: "Sheet",
          intent: "Open the leech slightly.",
          doThis: `If the sheet is ${sheetMode}, ease it one step to open the leech without fully dumping power.`,
          why: "A small sheet ease adds twist and reduces stalling or loaded helm.",
        },
        {
          title: "Backstay",
          intent: "Flatten and unload the whole rig.",
          doThis: `If backstay is ${backstayMode}, move it one step firmer to flatten the main and tighten the headstay.`,
          why: "Backstay is your bigger-picture depower control when the boat is loaded.",
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
      focus: `Rebuild flow before asking for angle. Right now: sheet ${sheetMode}, traveler ${travelerMode}, backstay ${backstayMode}.`,
      actions: [
        {
          title: "Sheet",
          intent: "Free the leech.",
          doThis: `If the sheet is ${sheetMode}, ease it one step so the upper leech can breathe again.`,
          why: "A tiny ease often brings the top of the main back to life.",
        },
        {
          title: "Traveler",
          intent: "Support angle later.",
          doThis: `Hold traveler at its current ${travelerMode} setting until speed returns, then decide if it should come up or stay put.`,
          why: "Changing too many controls at once makes it harder to know what helped.",
        },
        {
          title: "Backstay",
          intent: "Add fullness if the rig is too flat.",
          doThis: `If backstay is ${backstayMode}, consider easing it one step when the boat feels flat and underpowered.`,
          why: "Too much backstay can make the whole sail plan too flat when you need punch.",
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
      focus: `Do not force angle with a stuck sail plan. Right now: sheet ${sheetMode}, traveler ${travelerMode}.`,
      actions: [
        {
          title: "Sheet",
          intent: "Open the groove.",
          doThis: `If the sheet is ${sheetMode}, ease it one step so the leech opens and the groove widens.`,
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
          doThis: `Once speed is back, move traveler one step up from ${travelerMode} if the boat can handle more angle.`,
          why: "Traveler is cleaner than re-sheeting too hard too early.",
        },
      ],
    };
  }

  if (leechState === "too_closed" || leechState === "hooked") {
    return {
      headline: "The leech is too tight.",
      focus: `The upper leech is too tight. Right now: sheet ${sheetMode}, vang ${vangMode}.`,
      actions: [
        {
          title: "Sheet",
          intent: "Unhook the upper leech.",
          doThis: `Ease the sheet one step from ${sheetMode}; if that is not enough, check whether vang at ${vangMode} is also keeping the leech too firm.`,
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
      focus: `The top of the sail needs more support. Right now: sheet ${sheetMode}, vang ${vangMode}, traveler ${travelerMode}.`,
      actions: [
        {
          title: "Sheet",
          intent: "Support the top of the sail.",
          doThis: `If the sheet is ${sheetMode}, trim it one step firmer to support the upper leech.`,
          why: "Too much twist can leave speed and angle on the table.",
        },
        {
          title: "Traveler",
          intent: "Add angle carefully.",
          doThis: `If traveler is ${travelerMode}, raise it one step only if the boat still feels free and not sticky.`,
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
      focus: `Use controls in sequence for angle. Right now: traveler ${travelerMode}, sheet ${sheetMode}, backstay ${backstayMode}.`,
      actions: [
        {
          title: "Traveler",
          intent: "Add angle first.",
          doThis: `Start by moving traveler one step up from ${travelerMode}.`,
          why: "Traveler usually gives cleaner angle support than just over-sheeting.",
        },
        {
          title: "Sheet",
          intent: "Fine tune the leech.",
          doThis: `If the sheet is not already ${sheetMode === "hard-trimmed" ? "at max trim" : "firm enough"}, trim it one step harder but stop before the leech hooks.`,
          why: "You want support, not a stalled upper leech.",
        },
        {
          title: "Backstay",
          intent: "Support a flatter pointing shape.",
          doThis: `If backstay is ${backstayMode}, a slightly firmer setting can help pointing once the boat already has pace.`,
          why: "Flatter shapes are helpful for angle, but only after speed is established.",
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
      focus: `Widen the groove and simplify the feel. Right now: traveler ${travelerMode}, sheet ${sheetMode}, vang ${vangMode}.`,
      actions: [
        {
          title: "Traveler",
          intent: "Reduce load.",
          doThis: `If traveler is ${travelerMode}, lower it one step to calm the platform.`,
          why: "That helps calm the boat without dumping shape all at once.",
        },
        {
          title: "Sheet",
          intent: "Keep the main forgiving.",
          doThis: `Keep the sheet around its current ${sheetMode} setting, but err one step easier if the boat feels loaded or twitchy.`,
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
    focus: `Use sheet for leech tension, traveler for angle, vang for top-of-sail support, and backstay for overall flattening. Current setup: traveler ${travelerMode}, sheet ${sheetMode}, vang ${vangMode}, backstay ${backstayMode}.`,
    actions: [
      {
        title: "Sheet",
        intent: "Trim to the edge of stall.",
        doThis: `Start from the current ${sheetMode} setting and adjust only one step at a time until the sail feels alive instead of sticky.`,
        why: "The mainsheet is your main throttle for leech tension.",
      },
      {
        title: "Traveler",
        intent: "Support the target mode.",
        doThis: `Use the traveler from its current ${travelerMode} position to balance speed versus angle without over-sheeting.`,
        why: "Traveler changes angle of attack more cleanly than sheet alone.",
      },
      {
        title: "Vang",
        intent: "Do not overthink it upwind.",
        doThis: `Use vang at ${vangMode} for upper-leech support and backstay at ${backstayMode} when you need to change the overall power level of the rig.`,
        why: "Vang and backstay are support controls that matter most after sheet and traveler have done the first job.",
      },
    ],
  };
}