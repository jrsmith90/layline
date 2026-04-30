"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import startUpwindLogic from "@/data/logic/startUpwindLogic";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";

type ForwardEscape = "YES" | "MAYBE" | "NO";
type WindwardThreat = "NONE" | "PRESENT" | "CONTROLLING";
type LeewardPressure = "NONE" | "BUILDING" | "CLEAR";
type MessageState = "hold" | "prep_bail" | "bail_now";
type StartEnd = "committee" | "pin" | "even";
type FleetSize = "small" | "medium" | "large";
type WindStability = "steady" | "oscillating" | "shifty";

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function signedAngleDiff(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function getLineBias(params: {
  windwardMarkBearing: number;
  pinToCommitteeBearing: number;
}): {
  idealPinToCommitteeBearing: number;
  lineBiasDeg: number;
  favoredEnd: StartEnd;
  label: string;
} {
  const idealPinToCommitteeBearing = normalizeDegrees(
    params.windwardMarkBearing + 90
  );
  const lineBiasDeg = signedAngleDiff(
    idealPinToCommitteeBearing,
    params.pinToCommitteeBearing
  );

  if (Math.abs(lineBiasDeg) < 5) {
    return {
      idealPinToCommitteeBearing,
      lineBiasDeg,
      favoredEnd: "even",
      label: "Line is close to square",
    };
  }

  if (lineBiasDeg < 0) {
    return {
      idealPinToCommitteeBearing,
      lineBiasDeg,
      favoredEnd: "committee",
      label: "Committee end is higher",
    };
  }

  return {
    idealPinToCommitteeBearing,
    lineBiasDeg,
    favoredEnd: "pin",
    label: "Pin end is higher",
  };
}

function getWindShiftBias(params: {
  referenceWindDeg: number;
  currentWindDeg: number;
}): {
  shiftDeg: number;
  favoredEnd: StartEnd;
  label: string;
} {
  const shiftDeg = signedAngleDiff(params.referenceWindDeg, params.currentWindDeg);

  if (Math.abs(shiftDeg) < 5) {
    return {
      shiftDeg,
      favoredEnd: "even",
      label: "Wind shift is small",
    };
  }

  if (shiftDeg > 0) {
    return {
      shiftDeg,
      favoredEnd: "committee",
      label: "Right shift favors committee / right-side setup",
    };
  }

  return {
    shiftDeg,
    favoredEnd: "pin",
    label: "Left shift favors pin / left-side setup",
  };
}

function getStartAreaCall(params: {
  lineFavoredEnd: StartEnd;
  windFavoredEnd: StartEnd;
  lineBiasDeg: number;
  shiftDeg: number;
}): {
  call: string;
  reason: string;
  toneClass: string;
} {
  const lineWeight = Math.abs(params.lineBiasDeg);
  const windWeight = Math.abs(params.shiftDeg);
  const lineMatters = lineWeight >= 5;
  const windMatters = windWeight >= 5;

  if (!lineMatters && !windMatters) {
    return {
      call: "Start central and flexible",
      reason:
        "Neither the line geometry nor the wind shift is strong enough to force an end. Prioritize lane quality, time-distance, and acceleration.",
      toneClass: "border-sky-400/35 bg-sky-400/10 text-sky-100",
    };
  }

  if (
    params.lineFavoredEnd !== "even" &&
    params.lineFavoredEnd === params.windFavoredEnd
  ) {
    const end = params.lineFavoredEnd === "committee" ? "committee" : "pin";
    return {
      call: `Favor the ${end} end`,
      reason:
        "Line bias and wind shift point the same way. If you can get clear air and avoid being trapped, that end has the strongest signal.",
      toneClass: "border-green-400/35 bg-green-400/10 text-green-100",
    };
  }

  if (lineWeight > windWeight + 2 && params.lineFavoredEnd !== "even") {
    const end = params.lineFavoredEnd === "committee" ? "committee" : "pin";
    return {
      call: `Lean ${end}, but protect your lane`,
      reason:
        "The line setup is the stronger signal. Do not force the end if it is crowded or if you cannot launch cleanly.",
      toneClass: "border-yellow-300/35 bg-yellow-300/10 text-yellow-100",
    };
  }

  if (windWeight > lineWeight + 2 && params.windFavoredEnd !== "even") {
    const end = params.windFavoredEnd === "committee" ? "committee" : "pin";
    return {
      call: `Lean ${end} for the wind shift`,
      reason:
        "The wind shift is stronger than the line geometry. Use the favored end only if it also sets up the first beat.",
      toneClass: "border-yellow-300/35 bg-yellow-300/10 text-yellow-100",
    };
  }

  return {
    call: "Signals conflict",
    reason:
      "Line bias and wind shift are pulling different ways. Start where you can win a clean lane and execute the first-leg plan.",
    toneClass: "border-orange-400/35 bg-orange-400/10 text-orange-100",
  };
}

function getTargetZone(params: {
  call: string;
  lineBiasDeg: number;
  shiftDeg: number;
  fleetSize: FleetSize;
}): {
  target: string;
  reason: string;
} {
  const strongestSignal = Math.max(
    Math.abs(params.lineBiasDeg),
    Math.abs(params.shiftDeg)
  );
  const heavyTraffic = params.fleetSize === "large";
  const moderateTraffic = params.fleetSize === "medium";
  const mentionsEnd =
    params.call.includes("committee") || params.call.includes("pin");

  if (!mentionsEnd || strongestSignal < 5) {
    return {
      target: "Middle third",
      reason:
        "The signal is modest, so a clean middle-third lane keeps both first-shift options open.",
    };
  }

  if (strongestSignal >= 15 && !heavyTraffic) {
    return {
      target: params.call.includes("committee")
        ? "Upper third, close to committee"
        : "Lower third, close to pin",
      reason:
        "The signal is strong enough to move toward the favored end, but still leave an escape lane.",
    };
  }

  if (heavyTraffic || moderateTraffic) {
    return {
      target: params.call.includes("committee")
        ? "One-third down from committee"
        : "One-third up from pin",
      reason:
        "The favored end is likely crowded. Starting just off it lowers the pileup risk while keeping most of the advantage.",
    };
  }

  return {
    target: params.call.includes("committee") ? "Committee half" : "Pin half",
    reason:
      "The bias matters, but lane quality still beats winning the exact end and getting trapped.",
  };
}

function getApproachScript(params: {
  approachTravelSeconds: number;
  tackAllowanceSeconds: number;
  targetSetupSeconds: number;
}) {
  const leaveAt =
    params.approachTravelSeconds +
    params.tackAllowanceSeconds +
    params.targetSetupSeconds;

  return {
    leaveAt,
    tackBy: params.targetSetupSeconds,
    text: `Leave the reference end with about ${leaveAt}s to go, allowing ${params.approachTravelSeconds}s to reach the hole, ${params.tackAllowanceSeconds}s for the tack/setup, and aiming to be on starboard by ${params.targetSetupSeconds}s.`,
  };
}

function getCommitteeIntentRead(params: {
  lineBiasDeg: number;
  shiftDeg: number;
  firstLegSquareOffsetDeg: number;
  lineLengthBoatLengths: number;
  fleetBoats: number;
  windStability: WindStability;
}): {
  title: string;
  risk: string;
  confidence: "High" | "Medium" | "Low";
  notes: string[];
} {
  const lineBias = Math.abs(params.lineBiasDeg);
  const shift = Math.abs(params.shiftDeg);
  const firstLegOffset = Math.abs(params.firstLegSquareOffsetDeg);
  const boatsPerLineLength =
    params.lineLengthBoatLengths > 0
      ? params.fleetBoats / params.lineLengthBoatLengths
      : 1;
  const notes: string[] = [];

  if (lineBias < 5 && firstLegOffset < 10) {
    notes.push("The line looks close to the race-committee target: square to wind and generally square to the first leg.");
  } else if (lineBias >= 10 || firstLegOffset >= 15) {
    notes.push("The line/course setup is far enough off square that one end may attract traffic quickly.");
  } else {
    notes.push("The setup is a little off square. Treat it as a useful signal, not an automatic end start.");
  }

  if (params.windStability === "shifty") {
    notes.push("The wind is moving around enough that a favored end may be temporary.");
  } else if (params.windStability === "oscillating") {
    notes.push("Oscillating breeze lowers confidence in a hard end commitment.");
  } else {
    notes.push("Steadier breeze makes the geometry read more trustworthy.");
  }

  if (boatsPerLineLength > 0.28) {
    notes.push("The line is short for the fleet. Avoid being lured into a packed favored end unless the signal is very strong.");
  } else if (boatsPerLineLength > 0.18) {
    notes.push("Line length is workable but traffic still matters. Plan a second-row escape before choosing an end.");
  } else {
    notes.push("There appears to be enough line length to prioritize the best tactical lane.");
  }

  if (lineBias >= 8 && shift >= 8 && Math.sign(params.lineBiasDeg) !== Math.sign(params.shiftDeg)) {
    notes.push("Race committee geometry and wind shift disagree. Sail the first beat plan more than the exact line bias.");
  }

  const confidence =
    params.windStability === "shifty" || boatsPerLineLength > 0.28
      ? "Low"
      : lineBias >= 10 || shift >= 10
        ? "Medium"
        : "High";

  return {
    title:
      confidence === "High"
        ? "Committee likely set a fair line"
        : confidence === "Medium"
          ? "Useful signal, traffic-sensitive"
          : "Low-confidence line read",
    risk:
      boatsPerLineLength > 0.28
        ? "Short-line crowd risk"
        : params.windStability === "shifty"
          ? "Shifty-wind risk"
          : firstLegOffset >= 15
            ? "Course-square risk"
            : "Normal start risk",
    confidence,
    notes: notes.slice(0, 4),
  };
}

function getStartMessage(params: {
  forwardEscape: ForwardEscape;
  windwardThreat: WindwardThreat;
  leewardPressure: LeewardPressure;
  timeToStart: number;
}): MessageState {
  const { forwardEscape, windwardThreat, leewardPressure, timeToStart } = params;

  if (forwardEscape === "NO") return "bail_now";

  const tierTwoThreat =
    windwardThreat === "CONTROLLING" || leewardPressure === "CLEAR";

  const anyPressure =
    windwardThreat !== "NONE" || leewardPressure !== "NONE";

  if (forwardEscape === "MAYBE") {
    if (tierTwoThreat && timeToStart <= 20) return "bail_now";
    return "prep_bail";
  }

  if (tierTwoThreat && timeToStart <= 20) return "bail_now";
  if (anyPressure) return "prep_bail";

  return "hold";
}

function getStartReason(params: {
  forwardEscape: ForwardEscape;
  windwardThreat: WindwardThreat;
  leewardPressure: LeewardPressure;
  timeToStart: number;
  message: MessageState;
}): string {
  const {
    forwardEscape,
    windwardThreat,
    leewardPressure,
    timeToStart,
    message,
  } = params;

  if (message === "bail_now") {
    if (forwardEscape === "NO") {
      return "You do not have a forward lane anymore. Clear air and acceleration matter more than trying to salvage this exact hole.";
    }

    if (timeToStart <= 20) {
      return "Inside 20 seconds, pressure compounds fast. A bad lane now usually gets worse, not better.";
    }

    return "Your exit options are collapsing. Reset before you get pinned and rolled off the line.";
  }

  if (message === "prep_bail") {
    if (windwardThreat === "CONTROLLING") {
      return "The windward boat can squeeze you and kill your lane. Be ready to foot off or leave before you run out of room.";
    }

    if (leewardPressure === "CLEAR") {
      return "The leeward boat is accelerating and can shut the door. Keep the boat free and prepare your escape.";
    }

    return "Your lane is still usable, but it is getting tighter. Stay loose enough to accelerate or leave cleanly.";
  }

  return "The lane is workable. Stay calm, preserve space, and keep the boat ready to accelerate.";
}

function getStartHelmAction(params: {
  message: MessageState;
  timeToStart: number;
}): string {
  const { message, timeToStart } = params;

  if (message === "bail_now") {
    return "Bear off slightly, get the bow free, and accelerate into the nearest clear exit. Do not stay high and slow trying to save the original hole.";
  }

  if (message === "prep_bail") {
    return timeToStart <= 20
      ? "Keep the turn options open. Sail slightly lower if needed so you can accelerate, duck, or foot off without stalling."
      : "Hold a loose groove and avoid over-committing high. Stay ready to foot off or reset before the lane closes.";
  }

  return "Hold your line, keep the bow moving, and avoid extra steering. Stay calm and focus on a clean acceleration path.";
}

function getStartJibAction(params: {
  message: MessageState;
}): string {
  const { message } = params;

  if (message === "bail_now") {
    return "Ease the jib sheet 2–4 inches and, if needed, move the lead/car back slightly to open the leech. You want a forgiving setup that lets the boat accelerate immediately.";
  }

  if (message === "prep_bail") {
    return "Ease the jib sheet a touch and keep the lead neutral or slightly aft. Open the leech enough that the sail breathes while you protect the option to foot off or duck.";
  }

  return "Trim the jib for flow, not max height. Keep the top telltale just on the edge of lifting so the boat stays lively and ready to launch.";
}

function getStartMainAction(params: {
  message: MessageState;
}): string {
  const { message } = params;

  if (message === "bail_now") {
    return "Ease the mainsheet and drop the traveler slightly to reduce heel and helm. The priority is a fast, maneuverable boat, not a perfect line-up trim.";
  }

  if (message === "prep_bail") {
    return "Ease the mainsheet slightly for twist and lower the traveler just enough to keep the boat stable. Keep speed on so you can still make a move.";
  }

  return "Keep enough mainsheet tension for response, but do not over-trim. A little twist and a stable traveler position will help you accelerate cleanly.";
}

function getStartWhy(params: {
  message: MessageState;
  sail: "helm" | "jib" | "main";
}): string {
  const { message, sail } = params;

  if (message === "bail_now") {
    if (sail === "helm") {
      return "A small bear-off and quick acceleration are usually better than sitting high and getting rolled or pinned.";
    }

    if (sail === "jib") {
      return "A more open jib makes it easier to accelerate and turn without choking the slot.";
    }

    return "A slightly easier main reduces helm load and gives you a more maneuverable boat when you need to escape fast.";
  }

  if (message === "prep_bail") {
    if (sail === "helm") {
      return "You are still in the fight, but only if the boat stays free enough to change plan quickly.";
    }

    if (sail === "jib") {
      return "A breathing jib keeps the groove wider so you can foot off, duck, or launch without stalling.";
    }

    return "A stable main keeps speed on and reduces the risk of getting stuck high and slow.";
  }

  if (sail === "helm") {
    return "Smooth steering preserves speed and keeps your timing under control in the final seconds.";
  }

  if (sail === "jib") {
    return "A flowing jib is the fastest way to keep the boat lively and ready to accelerate at the gun.";
  }

  return "A settled main helps the boat feel predictable so you can focus on timing and space, not recovery.";
}

export default function StartPage() {
  const logic = startUpwindLogic;
  const [forwardEscapeQuestion, windwardThreatQuestion, leewardPressureQuestion] =
    logic.start.laneQuestions;

  const [forwardEscape, setForwardEscape] = useState<ForwardEscape>("YES");
  const [windwardThreat, setWindwardThreat] = useState<WindwardThreat>("NONE");
  const [leewardPressure, setLeewardPressure] = useState<LeewardPressure>("NONE");
  const [timeToStart, setTimeToStart] = useState(45);
  const [windwardMarkBearing, setWindwardMarkBearing] = useState(300);
  const [pinToCommitteeBearing, setPinToCommitteeBearing] = useState(30);
  const [referenceWindDeg, setReferenceWindDeg] = useState(300);
  const [currentWindDeg, setCurrentWindDeg] = useState(300);
  const [fleetSize, setFleetSize] = useState<FleetSize>("medium");
  const [approachTravelSeconds, setApproachTravelSeconds] = useState(40);
  const [tackAllowanceSeconds, setTackAllowanceSeconds] = useState(12);
  const [targetSetupSeconds, setTargetSetupSeconds] = useState(60);
  const [lineLengthBoatLengths, setLineLengthBoatLengths] = useState(45);
  const [fleetBoats, setFleetBoats] = useState(9);
  const [windStability, setWindStability] = useState<WindStability>("oscillating");

  const lineBias = useMemo(
    () =>
      getLineBias({
        windwardMarkBearing,
        pinToCommitteeBearing,
      }),
    [pinToCommitteeBearing, windwardMarkBearing]
  );

  const windShiftBias = useMemo(
    () =>
      getWindShiftBias({
        referenceWindDeg,
        currentWindDeg,
      }),
    [currentWindDeg, referenceWindDeg]
  );

  const startAreaCall = useMemo(
    () =>
      getStartAreaCall({
        lineFavoredEnd: lineBias.favoredEnd,
        windFavoredEnd: windShiftBias.favoredEnd,
        lineBiasDeg: lineBias.lineBiasDeg,
        shiftDeg: windShiftBias.shiftDeg,
      }),
    [lineBias.favoredEnd, lineBias.lineBiasDeg, windShiftBias.favoredEnd, windShiftBias.shiftDeg]
  );

  const targetZone = useMemo(
    () =>
      getTargetZone({
        call: startAreaCall.call,
        lineBiasDeg: lineBias.lineBiasDeg,
        shiftDeg: windShiftBias.shiftDeg,
        fleetSize,
      }),
    [fleetSize, lineBias.lineBiasDeg, startAreaCall.call, windShiftBias.shiftDeg]
  );

  const approachScript = useMemo(
    () =>
      getApproachScript({
        approachTravelSeconds,
        tackAllowanceSeconds,
        targetSetupSeconds,
      }),
    [approachTravelSeconds, tackAllowanceSeconds, targetSetupSeconds]
  );
  const firstLegSquareOffsetDeg = useMemo(
    () => signedAngleDiff(windwardMarkBearing, currentWindDeg),
    [currentWindDeg, windwardMarkBearing]
  );
  const committeeIntentRead = useMemo(
    () =>
      getCommitteeIntentRead({
        lineBiasDeg: lineBias.lineBiasDeg,
        shiftDeg: windShiftBias.shiftDeg,
        firstLegSquareOffsetDeg,
        lineLengthBoatLengths,
        fleetBoats,
        windStability,
      }),
    [
      firstLegSquareOffsetDeg,
      fleetBoats,
      lineBias.lineBiasDeg,
      lineLengthBoatLengths,
      windShiftBias.shiftDeg,
      windStability,
    ]
  );

  const message = useMemo<MessageState>(
    () =>
      getStartMessage({
        forwardEscape,
        windwardThreat,
        leewardPressure,
        timeToStart,
      }),
    [forwardEscape, windwardThreat, leewardPressure, timeToStart]
  );

  const current = logic.messages[message];
  const currentReason = getStartReason({
    forwardEscape,
    windwardThreat,
    leewardPressure,
    timeToStart,
    message,
  });

  const helmAction = getStartHelmAction({ message, timeToStart });
  const jibAction = getStartJibAction({ message });
  const mainAction = getStartMainAction({ message });
  const helmWhy = getStartWhy({ message, sail: "helm" });
  const jibWhy = getStartWhy({ message, sail: "jib" });
  const mainWhy = getStartWhy({ message, sail: "main" });

  const alertClasses: Record<MessageState, string> = {
    hold: "border-green-500/40 bg-green-500/10 text-green-300",
    prep_bail: "border-yellow-400/40 bg-yellow-400/10 text-yellow-200",
    bail_now: "border-red-500/50 bg-red-500/15 text-red-200",
  };

  const toneDotClasses: Record<MessageState, string> = {
    hold: "bg-green-500",
    prep_bail: "bg-yellow-400",
    bail_now: "bg-red-500",
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Start</h1>
          <p className="text-sm opacity-70">
            Final minute logic built for quick, glance-only decisions.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] opacity-50">
          Start Mode
        </div>
      </div>

      <LiveInstrumentsPanel context="start" />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Start Line Bias
            </div>
            <h2 className="mt-1 text-xl font-semibold">Line geometry + wind shift</h2>
            <p className="mt-1 text-sm leading-6 opacity-70">
              Use the line angle and the latest wind shift to decide whether the
              committee end, pin end, or a central lane has the best risk/reward.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide opacity-75">
            5 deg threshold
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                Windward mark bearing
              </span>
              <input
                type="number"
                min={0}
                max={359}
                value={windwardMarkBearing}
                onChange={(event) =>
                  setWindwardMarkBearing(normalizeDegrees(Number(event.target.value)))
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                Pin to committee bearing
              </span>
              <input
                type="number"
                min={0}
                max={359}
                value={pinToCommitteeBearing}
                onChange={(event) =>
                  setPinToCommitteeBearing(normalizeDegrees(Number(event.target.value)))
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                Reference wind
              </span>
              <input
                type="number"
                min={0}
                max={359}
                value={referenceWindDeg}
                onChange={(event) =>
                  setReferenceWindDeg(normalizeDegrees(Number(event.target.value)))
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                Current wind
              </span>
              <input
                type="number"
                min={0}
                max={359}
                value={currentWindDeg}
                onChange={(event) =>
                  setCurrentWindDeg(normalizeDegrees(Number(event.target.value)))
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className={["rounded-2xl border p-4", startAreaCall.toneClass].join(" ")}>
              <div className="text-xs uppercase tracking-[0.2em] opacity-70">
                Start area call
              </div>
              <div className="mt-1 text-2xl font-bold">{startAreaCall.call}</div>
              <p className="mt-2 text-sm leading-6 opacity-85">
                {startAreaCall.reason}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-50">
                  Ideal line
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {Math.round(lineBias.idealPinToCommitteeBearing)} deg
                </div>
                <div className="mt-1 text-xs opacity-65">{lineBias.label}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-50">
                  Line bias
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {Math.abs(lineBias.lineBiasDeg).toFixed(1)} deg
                </div>
                <div className="mt-1 text-xs opacity-65">
                  {lineBias.favoredEnd === "even"
                    ? "Even"
                    : `${lineBias.favoredEnd} favored`}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-50">
                  Wind shift
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {windShiftBias.shiftDeg > 0 ? "+" : ""}
                  {windShiftBias.shiftDeg.toFixed(1)} deg
                </div>
                <div className="mt-1 text-xs opacity-65">{windShiftBias.label}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-50">
                  Priority
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {Math.abs(lineBias.lineBiasDeg) > Math.abs(windShiftBias.shiftDeg)
                    ? "Line setup"
                    : Math.abs(windShiftBias.shiftDeg) > Math.abs(lineBias.lineBiasDeg)
                      ? "Wind shift"
                      : "Balanced"}
                </div>
                <div className="mt-1 text-xs opacity-65">
                  Bigger signal drives the call.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Race committee read
            </div>
            <div className="mt-2 text-xl font-bold">{committeeIntentRead.title}</div>
            <div className="mt-1 text-sm font-semibold opacity-75">
              {committeeIntentRead.risk} · {committeeIntentRead.confidence} confidence
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-60">
                  Line length
                </span>
                <input
                  type="number"
                  min={1}
                  value={lineLengthBoatLengths}
                  onChange={(event) =>
                    setLineLengthBoatLengths(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
                <span className="mt-1 block text-xs opacity-55">boat lengths</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-60">
                  Fleet boats
                </span>
                <input
                  type="number"
                  min={1}
                  value={fleetBoats}
                  onChange={(event) => setFleetBoats(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-60">
                Wind stability
              </span>
              <select
                value={windStability}
                onChange={(event) =>
                  setWindStability(event.target.value as WindStability)
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                <option value="steady">Steady</option>
                <option value="oscillating">Oscillating</option>
                <option value="shifty">Shifty / unstable</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              How to use the committee read
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 opacity-80">
              {committeeIntentRead.notes.map((note) => (
                <li key={note} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 opacity-75">
              A race committee usually tries to set a fair, square, usable line.
              If your calculator shows a big advantage, ask whether it is a real
              opportunity, a temporary shift, or a traffic trap.
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Target zone
            </div>
            <div className="mt-2 text-2xl font-bold">{targetZone.target}</div>
            <p className="mt-2 text-sm leading-6 opacity-75">{targetZone.reason}</p>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide opacity-60">
                Fleet size / traffic
              </span>
              <select
                value={fleetSize}
                onChange={(event) => setFleetSize(event.target.value as FleetSize)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                <option value="small">Small fleet / open line</option>
                <option value="medium">Medium fleet</option>
                <option value="large">Large fleet / crowded end</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Approach script
            </div>
            <div className="mt-2 text-sm leading-6 opacity-80">
              {approachScript.text}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-60">
                  Travel
                </span>
                <input
                  type="number"
                  min={0}
                  value={approachTravelSeconds}
                  onChange={(event) =>
                    setApproachTravelSeconds(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-60">
                  Tack
                </span>
                <input
                  type="number"
                  min={0}
                  value={tackAllowanceSeconds}
                  onChange={(event) =>
                    setTackAllowanceSeconds(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide opacity-60">
                  Set
                </span>
                <input
                  type="number"
                  min={0}
                  value={targetSetupSeconds}
                  onChange={(event) =>
                    setTargetSetupSeconds(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-50">
                  Leave reference end
                </div>
                <div className="mt-1 text-lg font-semibold">
                  -{approachScript.leaveAt}s
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-50">
                  On starboard by
                </div>
                <div className="mt-1 text-lg font-semibold">
                  -{approachScript.tackBy}s
                </div>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm leading-6 opacity-75">
              <li>Keep water moving over the foils; dead slow removes your steering options.</li>
              <li>If you are early, head up to slow down before burning the leeward hole.</li>
              <li>In the final 15-20 seconds, match the boats to weather and preserve runway to leeward.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              {forwardEscapeQuestion.prompt}
            </div>
            <div className="mt-1 text-base font-semibold">{forwardEscape}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              {windwardThreatQuestion.prompt}
            </div>
            <div className="mt-1 text-base font-semibold">{windwardThreat}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              {leewardPressureQuestion.prompt}
            </div>
            <div className="mt-1 text-base font-semibold">{leewardPressure}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
              Time To Start
            </div>
            <div className="mt-1 text-base font-semibold">{timeToStart}s</div>
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border p-6 text-center transition-colors",
            alertClasses[message],
          ].join(" ")}
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] opacity-70">
            <span
              className={[
                "h-2.5 w-2.5 rounded-full",
                toneDotClasses[message],
              ].join(" ")}
            />
            Current Call
          </div>
          <div className="text-3xl font-bold tracking-tight sm:text-4xl">
            {current.text}
          </div>
          <p className="mt-3 text-sm opacity-80">{currentReason}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Start Inputs
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium">
                {forwardEscapeQuestion.prompt}
              </span>
              <select
                value={forwardEscape}
                onChange={(e) => setForwardEscape(e.target.value as ForwardEscape)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                {forwardEscapeQuestion.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">
                {windwardThreatQuestion.prompt}
              </span>
              <select
                value={windwardThreat}
                onChange={(e) => setWindwardThreat(e.target.value as WindwardThreat)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                {windwardThreatQuestion.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">
                {leewardPressureQuestion.prompt}
              </span>
              <select
                value={leewardPressure}
                onChange={(e) =>
                  setLeewardPressure(e.target.value as LeewardPressure)
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none"
              >
                {leewardPressureQuestion.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Time to start</span>
                <span>{timeToStart}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={timeToStart}
                onChange={(e) => setTimeToStart(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] opacity-50">
              Action Plan
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
                Helm
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Intent
                </div>
                <div className="mt-1 text-base font-semibold">{current.text}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Do This
                </div>
                <div className="mt-1 text-sm opacity-90">{helmAction}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Why
                </div>
                <div className="mt-1 text-sm opacity-75">{helmWhy}</div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
                Jib
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Intent
                </div>
                <div className="mt-1 text-base font-semibold">
                  Keep the jib flowing
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Do This
                </div>
                <div className="mt-1 text-sm opacity-90">{jibAction}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Why
                </div>
                <div className="mt-1 text-sm opacity-75">{jibWhy}</div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-50">
                Main
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Intent
                </div>
                <div className="mt-1 text-base font-semibold">
                  Keep the platform stable
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Do This
                </div>
                <div className="mt-1 text-sm opacity-90">{mainAction}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50">
                  Why
                </div>
                <div className="mt-1 text-sm opacity-75">{mainWhy}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="inline-block rounded-xl bg-white px-4 py-2 font-semibold text-black shadow transition active:scale-[0.98]"
      >
        Back to Home
      </Link>
    </div>
  );
}
