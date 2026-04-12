"use client";

import { useMemo, useState } from "react";
import startUpwindLogic from "@/data/logic/startUpwindLogic";

type ForwardEscape = "YES" | "MAYBE" | "NO";
type WindwardThreat = "NONE" | "PRESENT" | "CONTROLLING";
type LeewardPressure = "NONE" | "BUILDING" | "CLEAR";
type MessageState = "hold" | "prep_bail" | "bail_now";

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

      <a
        href="/"
        className="inline-block rounded-xl bg-white px-4 py-2 font-semibold text-black shadow transition active:scale-[0.98]"
      >
        Back to Home
      </a>
    </div>
  );
}