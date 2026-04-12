// Jib Trim Logic (v2)

export type SailMode = "upwind" | "downwind";
export type BoatMode = "speed" | "pointing" | "control";

export type Symptom =
  | "normal"
  | "slow"
  | "pinching"
  | "overpowered"
  | "badair"
  | "cant_hold_lane";

export type Telltales =
  | "unknown"
  | "all_flowing"
  | "leeward_stalled"
  | "windward_lifting"
  | "top_stalled_bottom_flowing"
  | "top_flowing_bottom_stalled"
  | "erratic_waves"
  | "erratic_dirty_air"
  | "streaming_then_collapsing"
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

function clampCar(n: number) {
  if (n < 1) return 1;
  if (n > 24) return 24;
  return Math.round(n);
}

function windBand(kt: number | null): "light" | "medium" | "heavy" | "unknown" {
  if (kt == null) return "unknown";
  if (kt < 8) return "light";
  if (kt <= 14) return "medium";
  return "heavy";
}

export function getJibActionPlan(params: {
  sailMode: SailMode;
  boatMode: BoatMode;
  symptom: Symptom;
  telltales: Telltales;
  carPos: number;
  windSpd: number | "";
}): ActionPlan {
  const { sailMode, boatMode, symptom, telltales, carPos, windSpd } = params;
  const parsedWind = windSpd === "" ? null : Number(windSpd);
  const spd = parsedWind == null || Number.isNaN(parsedWind) ? null : parsedWind;
  const band = windBand(spd);

  if (sailMode === "downwind") {
    return {
      headline: "Downwind headsail mode",
      focus: "Keep the sail drawing and avoid over-trimming through angle changes.",
      actions: [
        {
          title: "Sheet",
          intent: "Keep the sail powered",
          doThis: "Ease until the sail just fills cleanly, then trim only enough to stop collapse.",
          why: "Downwind speed comes from stable flow, not constant trimming.",
        },
        {
          title: "Steering",
          intent: "Stabilize angle",
          doThis: "Steer smoothly through puffs and lulls instead of trimming every small change.",
          why: "Angle changes usually matter more than tiny sheet changes downwind.",
        },
        {
          title: "Rhythm",
          intent: "Make one change at a time",
          doThis: "Hold the setting 20–30 seconds before making another adjustment.",
          why: "Rapid changes make it hard to know what actually improved the boat.",
        },
      ],
    };
  }

  if (telltales === "top_stalled_bottom_flowing") {
    return {
      headline: "Upper leech too closed",
      focus: "Open the top of the sail first, then re-check flow before changing anything else.",
      actions: [
        {
          title: "Car",
          intent: "Add twist up high",
          doThis: `Move the jib car aft 1 click from ${carPos} to ${clampCar(carPos + 1)}.`,
          why: "If the top stalls before the bottom, the upper leech is too tight.",
        },
        {
          title: "Sheet",
          intent: "Do not over-correct",
          doThis: "Hold the sheet nearly where it is, or ease only a hair after the car move.",
          why: "The car should fix twist first. Too much sheet easing can make the whole sail too open.",
        },
        {
          title: "Steering",
          intent: "Preserve flow",
          doThis: "Sail a touch lower until the top telltale recovers, then come back up slowly.",
          why: "You cannot point with a stalled upper leech.",
        },
      ],
    };
  }

  if (telltales === "top_flowing_bottom_stalled") {
    return {
      headline: "Lower section too open / under-supported",
      focus: "Support the bottom of the sail before adding a lot more sheet.",
      actions: [
        {
          title: "Car",
          intent: "Support the lower leech",
          doThis: `Move the jib car forward 1 click from ${carPos} to ${clampCar(carPos - 1)}.`,
          why: "If the bottom stalls while the top still flows, the lower section often needs more support.",
        },
        {
          title: "Sheet",
          intent: "Trim only after the car move",
          doThis: "Trim slightly after moving the car, just enough to restore clean lower telltale flow.",
          why: "More sheet alone can choke the sail if the car is still too far aft.",
        },
        {
          title: "Steering",
          intent: "Avoid a high, sticky groove",
          doThis: "Keep the bow moving and avoid pinching while the sail resets.",
          why: "Low flow down low usually shows up as a sticky, underpowered feel.",
        },
      ],
    };
  }

  if (telltales === "leeward_stalled") {
    return {
      headline: "Jib is over-trimmed",
      focus: "Free the leech and get flow back before trying to point again.",
      actions: [
        {
          title: "Sheet",
          intent: "Open the sail slightly",
          doThis: "Ease the jib sheet 1–2 inches and watch for the inside telltales to recover.",
          why: "A stalled leeward telltale usually means the sail is trimmed too hard or the boat is sailing too high for the trim.",
        },
        {
          title: "Car",
          intent: "Widen the groove if needed",
          doThis: `If it still feels sticky, move the car aft 1 from ${carPos} to ${clampCar(carPos + 1)}.`,
          why: "A slightly more open leech makes the groove easier to hold.",
        },
        {
          title: "Steering",
          intent: "Rebuild pace first",
          doThis: "Foot off slightly until the sail flows, then climb back up gradually.",
          why: "Trying to hold max height while stalled usually makes the boat slower and lower overall.",
        },
      ],
    };
  }

  if (telltales === "windward_lifting") {
    return {
      headline: "Jib is too open or under-trimmed",
      focus: "Trim just enough to stop the windward telltale from lifting constantly.",
      actions: [
        {
          title: "Sheet",
          intent: "Tighten the slot slightly",
          doThis: "Trim the jib a touch until the windward telltale settles, but stop before the leeward side stalls.",
          why: "A lifting windward telltale usually means the sail is too open for your angle.",
        },
        {
          title: "Car",
          intent: "Support the entry if needed",
          doThis: `If trimming alone is not enough, move the car forward 1 from ${carPos} to ${clampCar(carPos - 1)}.`,
          why: "A slightly more forward lead can help the sail carry a higher mode.",
        },
        {
          title: "Steering",
          intent: "Do not sail too low forever",
          doThis: "After flow stabilizes, head up slowly and stop right at the edge of lift.",
          why: "The fastest pointing mode is just below sustained lift or stall.",
        },
      ],
    };
  }

  if (telltales === "streaming_then_collapsing") {
    return {
      headline: "Groove is too narrow for the conditions",
      focus: "Make the sail more forgiving instead of chasing every cycle.",
      actions: [
        {
          title: "Sheet",
          intent: "Widen the groove",
          doThis: "Ease the jib a touch so the sail keeps flowing through the soft spots.",
          why: "A sail that is perfect only for one second is slower than one that stays live through the cycle.",
        },
        {
          title: "Car",
          intent: "Add stability",
          doThis: `If it keeps cycling, move the car aft 1 from ${carPos} to ${clampCar(carPos + 1)}.`,
          why: "Aft lead increases twist and makes the upper leech less twitchy.",
        },
        {
          title: "Rhythm",
          intent: "Hold through the pattern",
          doThis: "Give the new setup 2–3 cycles before deciding if it helped.",
          why: "Constant trimming in unstable conditions usually creates noise, not speed.",
        },
      ],
    };
  }

  if (symptom === "overpowered") {
    return {
      headline: "Depower the headsail",
      focus: "Flatten the jib and make the groove easier to hold.",
      actions: [
        {
          title: "Car",
          intent: "Open the upper leech",
          doThis: `Move the car aft ${band === "heavy" ? 2 : 1} clicks from ${carPos} to ${clampCar(carPos + (band === "heavy" ? 2 : 1))}.`,
          why: "An aft car reduces lower fullness and opens the top of the sail.",
        },
        {
          title: "Luff / Halyard",
          intent: "Flatten the draft",
          doThis: "Add a little more halyard or luff tension after the car move.",
          why: "A flatter entry reduces drag and keeps the sail from feeling too full in breeze.",
        },
        {
          title: "Rig Power",
          intent: "Reduce sag if needed",
          doThis: "If you are still loaded up, add backstay to reduce headstay sag and make the jib flatter.",
          why: "Less sag reduces excess power and helps the boat stay on its feet.",
        },
      ],
    };
  }

  if (symptom === "slow") {
    return {
      headline: "Rebuild flow and acceleration",
      focus: "Fix speed first. Sheet changes usually matter before car changes.",
      actions: [
        {
          title: "Sheet",
          intent: "Free the sail slightly",
          doThis: "Ease the jib sheet 1–2 inches and let the sail breathe.",
          why: "A small ease is the fastest way to restore flow if the sail is sticky.",
        },
        {
          title: "Car",
          intent: "Only move after sheet",
          doThis: `If it still feels narrow or sticky after 30–60 seconds, move the car aft 1 from ${carPos} to ${clampCar(carPos + 1)}.`,
          why: "The car is a second-order change. Use it when the groove itself is too narrow.",
        },
        {
          title: "Compare",
          intent: "Validate the change",
          doThis: "Hold one setup for 30–60 seconds and compare against a similar nearby boat before changing again.",
          why: "You need a stable comparison window to know if the change actually worked.",
        },
      ],
    };
  }

  if (symptom === "pinching") {
    return {
      headline: "Stop sailing above the trim",
      focus: "Ease, foot, and rebuild speed before asking the boat to point.",
      actions: [
        {
          title: "Sheet",
          intent: "Open the sail",
          doThis: "Ease the jib slightly until the inside telltales flow again.",
          why: "A pinching boat is usually trimmed or steered too high for the available flow.",
        },
        {
          title: "Steering",
          intent: "Foot for pace",
          doThis: "Bear away a touch and let the boat accelerate before climbing back up.",
          why: "Pointing only works when the boat has enough speed to support it.",
        },
        {
          title: "Car",
          intent: "Widen the groove if repeatable",
          doThis: `If pinching keeps returning, move the car aft 1 from ${carPos} to ${clampCar(carPos + 1)}.`,
          why: "A wider groove makes it easier to stay fast at the top of the mode.",
        },
      ],
    };
  }

  if (symptom === "cant_hold_lane") {
    return {
      headline: "Trade a little height for a lot more control",
      focus: "Holding the lane requires enough speed to keep the boat alive.",
      actions: [
        {
          title: "Steering",
          intent: "Foot slightly",
          doThis: "Sail a touch lower so the bow keeps moving and the boat can support the lane.",
          why: "A slow boat loses lanes faster than a slightly lower, faster one.",
        },
        {
          title: "Sheet",
          intent: "Keep flow attached",
          doThis: "Ease the jib a touch rather than forcing max height trim.",
          why: "A breathing sail is easier to keep alive in a narrow lane.",
        },
        {
          title: "Decision",
          intent: "Know when to leave",
          doThis: "If you still cannot hold the lane after one clean adjustment, make one decisive move to clear air instead of stacking small corrections.",
          why: "Repeated micro-fixes in a dead lane usually make you slower and more pinned.",
        },
      ],
    };
  }

  if (boatMode === "pointing") {
    return {
      headline: "Convert speed into height",
      focus: "Point only while the sail is still flowing cleanly.",
      actions: [
        {
          title: "Sheet",
          intent: "Trim to the edge",
          doThis: "Trim the jib until the inside telltales are just on the edge of stalling, but not parked there.",
          why: "The fastest pointing setup lives just below sustained stall.",
        },
        {
          title: "Car",
          intent: "Support the leech",
          doThis: `If the sail still feels too open, move the car forward 1 from ${carPos} to ${clampCar(carPos - 1)}.`,
          why: "A slightly more forward lead helps hold shape when pressing for angle.",
        },
        {
          title: "Discipline",
          intent: "Abort if speed breaks",
          doThis: "If the boat gets sticky or speed drops, ease and go back to speed mode immediately.",
          why: "You cannot point effectively once the boat falls out of its groove.",
        },
      ],
    };
  }

  if (boatMode === "control") {
    return {
      headline: "Favor a wider, steadier groove",
      focus: "Repeatable flow and steering matter more than max angle right now.",
      actions: [
        {
          title: "Sheet",
          intent: "Keep the sail forgiving",
          doThis: "Ease slightly so the sail stays live through puffs, chop, or disturbed air.",
          why: "A forgiving jib gives you more room to steer and recover.",
        },
        {
          title: "Car",
          intent: "Add twist",
          doThis: `If the groove still feels narrow, move the car aft 1 from ${carPos} to ${clampCar(carPos + 1)}.`,
          why: "More twist makes the boat easier to keep on its feet and in control.",
        },
        {
          title: "Tempo",
          intent: "Reduce changes",
          doThis: "Make one small adjustment, then hold it through a puff or wave set before touching anything else.",
          why: "Control mode works best when the crew stops chasing every twitch in the sail.",
        },
      ],
    };
  }

  return {
    headline: "Build speed first",
    focus: "Use flow and groove width before chasing extra height.",
    actions: [
      {
        title: "Sheet",
        intent: "Keep flow attached",
        doThis: "Trim to the edge of stall, then ease just enough that the sail feels live and responsive.",
        why: "Sheet changes are the fastest way to correct speed loss.",
      },
      {
        title: "Car",
        intent: "Fine-tune the groove",
        doThis: `If the groove feels too narrow, move the car aft 1 from ${carPos} to ${clampCar(carPos + 1)}. If it feels too open, go forward 1.`,
        why: "The car should tune twist after the sheet has already put the sail in the right neighborhood.",
      },
      {
        title: "Hold Time",
        intent: "Validate the setup",
        doThis: "Keep the same setting for 30–60 seconds and compare to a similar nearby boat.",
        why: "You need a steady comparison window to know whether the change made the boat faster.",
      },
    ],
  };
}