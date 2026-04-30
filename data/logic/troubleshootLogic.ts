export type TroubleshootSlug =
  | "slow"
  | "overpowered"
  | "pinching"
  | "lane"
  | "bad-air";

export type SailSystem = "Mainsail" | "Headsail / Jib" | "Spinnaker";

export type TroubleshootSailFix = {
  system: SailSystem;
  href: string;
  label: string;
  cue: string;
  actions: string[];
};

export type TroubleshootGuide = {
  slug: TroubleshootSlug;
  title: string;
  shortLabel: string;
  tone: string;
  summary: string;
  quickChecks: string[];
  call: string;
  why: string;
  doNext: string;
  ifThen: string;
  sailFixes: TroubleshootSailFix[];
};

export type TroubleshootLiveContext = {
  windAvgKt?: number;
  windGustKt?: number;
  windDirectionDeg?: number;
  currentDirection?: "flood" | "ebb" | "slack" | "unknown";
  currentSpeedKt?: number;
  tideStage?: "high" | "low" | "rising" | "falling";
  sogKt?: number;
  cogDeg?: number;
  sourceNote?: string;
};

export type TroubleshootContextCue = {
  label: string;
  value: string;
  guidance: string;
  tone: "neutral" | "good" | "warning" | "danger";
};

function formatDeg(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)} deg`
    : "--";
}

function formatKt(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)} kt`
    : "--";
}

function getWindBand(windAvgKt?: number) {
  if (typeof windAvgKt !== "number" || Number.isNaN(windAvgKt)) return "unknown";
  if (windAvgKt < 8) return "light";
  if (windAvgKt <= 14) return "medium";
  return "heavy";
}

export function buildTroubleshootContextCues(
  context: TroubleshootLiveContext
): TroubleshootContextCue[] {
  const windBand = getWindBand(context.windAvgKt);
  const gustSpread =
    typeof context.windAvgKt === "number" && typeof context.windGustKt === "number"
      ? context.windGustKt - context.windAvgKt
      : null;

  const cues: TroubleshootContextCue[] = [
    {
      label: "Wind",
      value:
        context.windAvgKt == null
          ? "--"
          : `${formatKt(context.windAvgKt)} avg · ${formatKt(context.windGustKt)} gust · ${formatDeg(context.windDirectionDeg)}`,
      guidance:
        windBand === "heavy"
          ? "Heavy-air context: depower first, open leeches, and prioritize control before pointing or soaking."
          : windBand === "light"
            ? "Light-air context: keep flow attached, avoid overtrimming, and treat speed as the first fix."
            : windBand === "medium"
              ? "Medium-air context: balance speed and mode; make one trim change, then compare."
              : "No wind feed yet. Use visual pressure and sail behavior as the primary inputs.",
      tone: windBand === "heavy" ? "warning" : "neutral",
    },
    {
      label: "Gust spread",
      value: gustSpread == null ? "--" : `${gustSpread.toFixed(1)} kt`,
      guidance:
        gustSpread != null && gustSpread >= 6
          ? "Puffy setup: favor wider grooves, quicker mainsheet/vang response, and conservative spinnaker trim."
          : "Gust spread does not look like the main driver from the available context.",
      tone: gustSpread != null && gustSpread >= 6 ? "warning" : "neutral",
    },
    {
      label: "Current / tide",
      value: `${context.currentDirection ?? "unknown"} · ${formatKt(context.currentSpeedKt)} · ${context.tideStage ?? "unknown"}`,
      guidance:
        context.currentDirection === "slack"
          ? "Slack or weak current: trim and pressure probably matter more than water relief."
          : (context.currentSpeedKt ?? 0) >= 1
            ? "Meaningful current: expect water setup to affect speed, lane choice, and whether chop makes fast mode smarter."
            : "Current context is light or incomplete; keep it as a secondary check.",
      tone: (context.currentSpeedKt ?? 0) >= 1 ? "warning" : "neutral",
    },
    {
      label: "GPS",
      value:
        context.sogKt == null
          ? `SOG -- · COG ${formatDeg(context.cogDeg)}`
          : `SOG ${formatKt(context.sogKt)} · COG ${formatDeg(context.cogDeg)}`,
      guidance:
        context.sogKt != null && context.sogKt < 1.2
          ? "SOG is low: acceleration and flow matter before tactical or trim precision."
          : context.sogKt != null
            ? "Use SOG/COG as the reality check after each trim change."
            : "Turn on Phone GPS to include live SOG/COG in this troubleshoot read.",
      tone: context.sogKt != null && context.sogKt < 1.2 ? "danger" : "good",
    },
  ];

  return cues;
}

export function buildTroubleshootContextSummary(
  context: TroubleshootLiveContext
) {
  const windBand = getWindBand(context.windAvgKt);
  const currentStrong = (context.currentSpeedKt ?? 0) >= 1;

  if (windBand === "heavy" && currentStrong) {
    return "Heavy breeze plus meaningful current: start with control, flatter sails, wider grooves, and clean lanes before asking for height or depth.";
  }

  if (windBand === "light") {
    return "Light-air read: protect flow. Avoid overtrimming main, jib, or spinnaker, and keep the boat moving before defending position.";
  }

  if (context.sogKt != null && context.sogKt < 1.2) {
    return "Live SOG is low: treat this as an acceleration problem first, then decide whether trim or tactics caused it.";
  }

  if (currentStrong) {
    return "Current is strong enough to affect the diagnosis. Check whether chop, set, or water relief is making a trim problem look worse.";
  }

  return "Use the live context as a sanity check, then follow the symptom cards below one change at a time.";
}

export const troubleshootGuides: TroubleshootGuide[] = [
  {
    slug: "slow",
    title: "Troubleshoot - Slow",
    shortLabel: "Boat feels slow",
    tone: "bg-yellow-500 text-black",
    summary:
      "Rebuild flow first. Slow boats cannot point, cover, hold lanes, or make good downwind decisions.",
    quickChecks: [
      "Are we in clear air?",
      "Are we pinching, stalled, or sailing too low without pressure?",
      "Are jib telltales flowing and is the main leech breathing?",
      "Downwind: is the spinnaker luff showing a soft, repeatable curl?",
      "Are we hitting waves head-on when we need fast mode?",
    ],
    call: "Foot slightly, rebuild flow, and make one sail-control change at a time.",
    why:
      "Speed comes from attached flow and a stable platform. Constant steering and trimming creates noise before it creates pace.",
    doNext:
      "Hold the new setup for 30-60 seconds and compare against a similar nearby boat.",
    ifThen:
      "If still slow upwind, open the groove. If still slow downwind, check spinnaker curl, pole angle, and whether the kite is overtrimmed.",
    sailFixes: [
      {
        system: "Mainsail",
        href: "/trim/main",
        label: "Rebuild main flow",
        cue: "Open the upper leech before asking for height.",
        actions: [
          "Ease mainsheet one step if the top feels hooked or sticky.",
          "Hold traveler steady until speed returns, then add angle carefully.",
          "Ease backstay one step if the rig is too flat and the boat lacks punch.",
        ],
      },
      {
        system: "Headsail / Jib",
        href: "/trim/jib",
        label: "Make the jib forgiving",
        cue: "Fix telltale flow before changing tactics.",
        actions: [
          "Ease sheet 1-2 inches if leeward telltales are stalled.",
          "Move the car aft one click if the top is choking or the groove is too narrow.",
          "Move the car forward one click only if the bottom is under-supported.",
        ],
      },
      {
        system: "Spinnaker",
        href: "/trim/spin",
        label: "Get the kite breathing",
        cue: "A soft curl is faster than a locked, overtrimmed chute.",
        actions: [
          "Ease until the luff starts to curl, then trim only enough to stop a fold.",
          "Undersquare slightly in light air or chop to let the kite float forward.",
          "Move the lead forward on a broad reach if the lower sail is too flat.",
        ],
      },
    ],
  },
  {
    slug: "overpowered",
    title: "Troubleshoot - Overpowered / Heavy Helm",
    shortLabel: "Overpowered",
    tone: "bg-red-500 text-white",
    summary:
      "Unload the boat in sequence. Reduce heel and helm before chasing point, depth, or tactical position.",
    quickChecks: [
      "Excessive heel angle or constant rudder angle?",
      "Boat rounding up in puffs?",
      "Main leech hooked or vang too firm?",
      "Jib too deep or lead too far forward?",
      "Power reaching: is the spinnaker loading the rudder toward a broach?",
    ],
    call:
      "Depower in order: traveler down, open leeches, flatten sails, and dump before control is gone.",
    why:
      "A loaded rudder is drag. The faster and flatter boat usually has more control and more tactical options.",
    doNext:
      "Look for neutral helm, flatter heel, and steadier speed through the next puff.",
    ifThen:
      "If heavy helm remains upwind, flatten main and jib. If it is a spinnaker reach, unload main/vang first and be ready to jerk-ease the kite.",
    sailFixes: [
      {
        system: "Mainsail",
        href: "/trim/main",
        label: "Depower the main first",
        cue: "Traveler is the fast unload; backstay is the bigger system change.",
        actions: [
          "Drop traveler before dumping the whole mainsheet.",
          "Ease sheet slightly to add twist if the leech is tight.",
          "Add backstay, outhaul, or cunningham to flatten the main when pressure stays high.",
        ],
      },
      {
        system: "Headsail / Jib",
        href: "/trim/jib",
        label: "Flatten the headsail",
        cue: "Open the top and reduce depth so the groove is easier to hold.",
        actions: [
          "Move the car aft one or two clicks.",
          "Add halyard/luff tension to pull draft forward.",
          "Add backstay if headstay sag is making the jib too full.",
        ],
      },
      {
        system: "Spinnaker",
        href: "/trim/spin",
        label: "Unload before the broach",
        cue: "Power reaching needs open exits and an instant release plan.",
        actions: [
          "Lead the sheet aft to open the leech.",
          "Lower and slightly oversquare the pole to flatten and stabilize.",
          "Ease mainsheet, ease vang, then jerk-ease spinnaker sheet if the rudder loads up.",
        ],
      },
    ],
  },
  {
    slug: "pinching",
    title: "Troubleshoot - Pinching / Stalling",
    shortLabel: "Pinching",
    tone: "bg-orange-500 text-white",
    summary:
      "Stop forcing angle. Open the groove, get flow back, then climb only as much as the boat can carry.",
    quickChecks: [
      "Are inside jib telltales stalled?",
      "Does speed drop every time you head up?",
      "Is the main top hooked or over-sheeted?",
      "Is chop asking for fast mode instead of point mode?",
      "Downwind: are you sailing too high to defend or too low without pressure?",
    ],
    call: "Ease slightly and sail lower until flow returns.",
    why:
      "Pointing comes from speed. A stalled boat makes leeway and loses the lane it is trying to protect.",
    doNext:
      "Once fast, head up slowly until telltales just begin to lift, then stop before flow collapses.",
    ifThen:
      "If stalling returns immediately, stay in fast mode longer and widen the jib/main groove before trying again.",
    sailFixes: [
      {
        system: "Mainsail",
        href: "/trim/main",
        label: "Open the main groove",
        cue: "Do not point with a hooked leech.",
        actions: [
          "Ease mainsheet one step to free the top.",
          "Use traveler later to recover angle after speed is back.",
          "Avoid adding vang if the leech is already tight.",
        ],
      },
      {
        system: "Headsail / Jib",
        href: "/trim/jib",
        label: "Restore telltale flow",
        cue: "A slightly open jib is better than a perfect-looking stalled jib.",
        actions: [
          "Ease sheet until leeward telltales recover.",
          "Move car aft one click if the top stalls before the bottom.",
          "Foot through waves before asking for height again.",
        ],
      },
      {
        system: "Spinnaker",
        href: "/trim/spin",
        label: "Downwind angle check",
        cue: "The spinnaker has its own version of pinching: sailing too hot or too deep for stable curl.",
        actions: [
          "If the kite is pressed and the rudder loads, open exits and ease sheet.",
          "If the kite collapses from going too low, heat up until curl becomes repeatable.",
          "Settle angle before changing pole height or lead position.",
        ],
      },
    ],
  },
  {
    slug: "lane",
    title: "Troubleshoot - Can't Hold Lane",
    shortLabel: "Lane trouble",
    tone: "bg-blue-500 text-white",
    summary:
      "Lane-holding is a speed problem before it is a tactical problem. Trim for a wider groove, then decide whether to hold or escape.",
    quickChecks: [
      "Are we slow relative to nearby boats?",
      "Are we living in dirty air or disturbed water?",
      "Is our bow being forced up?",
      "Do we have enough speed to defend before covering?",
      "Downwind: are we protecting the inside lane without sailing too high?",
    ],
    call: "Foot slightly to regain speed and protect the lane.",
    why:
      "A boat that is slow and narrow cannot defend. Build pace first, then choose the tactical move.",
    doNext:
      "Re-evaluate after 30 seconds: clear air, speed match, and whether the lane is still worth holding.",
    ifThen:
      "If pinned, make one decisive move to clear air instead of small corrections. Downwind, defend the passing lane without killing VMG.",
    sailFixes: [
      {
        system: "Mainsail",
        href: "/trim/main",
        label: "Choose speed mode",
        cue: "A slightly easier main helps the boat accelerate and live longer.",
        actions: [
          "Ease sheet a touch if helm is loaded.",
          "Keep traveler from dragging the boat too high too early.",
          "Rebuild speed before pressing for height.",
        ],
      },
      {
        system: "Headsail / Jib",
        href: "/trim/jib",
        label: "Widen the lane groove",
        cue: "Car and sheet should make the boat easier to steer, not narrower.",
        actions: [
          "Ease sheet slightly for speed mode.",
          "Move car aft one click if the top is too closed.",
          "Keep telltales flowing through chop and traffic.",
        ],
      },
      {
        system: "Spinnaker",
        href: "/trim/spin",
        label: "Defend without choking the kite",
        cue: "Downwind lane defense still needs flow.",
        actions: [
          "Heat up only enough to stop a windward roll.",
          "Soak back down when the threat stops gaining.",
          "Keep sheet moving so the kite does not stall while defending.",
        ],
      },
    ],
  },
  {
    slug: "bad-air",
    title: "Troubleshoot - Bad Air",
    shortLabel: "Bad air",
    tone: "bg-slate-600 text-white",
    summary:
      "Bad air makes good trim look bad. Find flow first, then decide whether the sails need adjustment.",
    quickChecks: [
      "Are telltales collapsing randomly?",
      "Is speed inconsistent despite reasonable trim?",
      "Is another boat blanketing the main, jib, or spinnaker?",
      "Are we trapped in a narrow lane with no clean exit?",
      "Downwind: is someone blanketing the kite or rolling over us?",
    ],
    call: "Get to clean air, even if it costs distance.",
    why:
      "Bad air destroys speed and removes tactical options. A slower boat cannot trim its way out of a wind shadow.",
    doNext:
      "Once clear, rebuild speed before making another tactical or trim decision.",
    ifThen:
      "If the fleet compresses again, choose the next safe lane early. Downwind, protect clean spinnaker air before soaking low.",
    sailFixes: [
      {
        system: "Mainsail",
        href: "/trim/main",
        label: "Keep the main alive",
        cue: "Dirty air often makes the leech look wrong even when the setting is close.",
        actions: [
          "Ease slightly for twist if the top stalls in disturbed air.",
          "Avoid chasing every flicker with traveler.",
          "Hold the change until clean air confirms whether trim was the problem.",
        ],
      },
      {
        system: "Headsail / Jib",
        href: "/trim/jib",
        label: "Do not over-diagnose telltales",
        cue: "Erratic telltales may mean bad air, not bad lead position.",
        actions: [
          "Make the jib forgiving with a small ease.",
          "Move car aft only if the top stays choked after clear air returns.",
          "Escape first when telltales are dead or unreliable.",
        ],
      },
      {
        system: "Spinnaker",
        href: "/trim/spin",
        label: "Find clean kite air",
        cue: "A blanketed spinnaker cannot be fixed by trimming harder.",
        actions: [
          "Heat up or gybe to get the kite drawing if blanketed.",
          "Do not overtrim just because curl becomes erratic in dirty air.",
          "Once clear, reset to soft curl and choose the downwind lane again.",
        ],
      },
    ],
  },
];

export function getTroubleshootGuide(slug: TroubleshootSlug) {
  return troubleshootGuides.find((guide) => guide.slug === slug);
}
