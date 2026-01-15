"use client";

import { useEffect, useMemo, useState } from "react";
import { useGpsCourse } from "@/lib/useGpsCourse";

type SailMode = "upwind" | "downwind";
type BoatMode = "speed" | "pointing" | "control";
type Symptom =
  | "normal"
  | "slow"
  | "pinching"
  | "overpowered"
  | "badair"
  | "cant_hold_lane";

type TelltaleRead =
  | "unknown"
  | "all_streaming"
  | "leeward_lifting"
  | "windward_lifting"
  | "leech_stalling";

const MODE_KEY = "trim-mode"; // shared across Trim pages
const WIND_DIR_KEY = "wind-dir-deg";
const WIND_SPD_KEY = "wind-spd-kt";

function titleCase(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function wrap360(d: number) {
  return (d % 360 + 360) % 360;
}

function smallestAngle(a: number, b: number) {
  const diff = Math.abs(wrap360(a) - wrap360(b));
  return Math.min(diff, 360 - diff);
}

// If course is within 70° of wind => upwind
// If course is 110°+ away from wind => downwind
function inferMode(cog: number, windDir: number): SailMode | null {
  const rel = smallestAngle(cog, windDir);
  if (rel <= 70) return "upwind";
  if (rel >= 110) return "downwind";
  return null; // reach/ambiguous
}

function windBand(kt: number | null): "light" | "medium" | "heavy" | "unknown" {
  if (kt === null) return "unknown";
  if (kt < 8) return "light";
  if (kt <= 14) return "medium";
  return "heavy";
}

export default function TrimMainPage() {
  // Upwind/Downwind section (remembered across Trim pages)
  const [sailMode, setSailMode] = useState<SailMode>("upwind");

  // GPS
  const [gpsOn, setGpsOn] = useState(false);
  const gps = useGpsCourse(gpsOn);

  // Wind direction + speed (stored)
  const [windDir, setWindDir] = useState<number | "">("");
  const [windSpd, setWindSpd] = useState<number | "">("");

  // Dropdown inputs
  const [boatMode, setBoatMode] = useState<BoatMode>("speed");
  const [symptom, setSymptom] = useState<Symptom>("normal");
  const [telltales, setTelltales] = useState<TelltaleRead>("unknown");

  // Load saved sailMode
  useEffect(() => {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "upwind" || saved === "downwind") {
      setSailMode(saved);
    }
  }, []);

  // Save sailMode
  useEffect(() => {
    localStorage.setItem(MODE_KEY, sailMode);
  }, [sailMode]);

  // Load wind dir + speed
  useEffect(() => {
    const savedDir = localStorage.getItem(WIND_DIR_KEY);
    if (savedDir) {
      const n = Number(savedDir);
      if (!Number.isNaN(n)) setWindDir(wrap360(n));
    }

    const savedSpd = localStorage.getItem(WIND_SPD_KEY);
    if (savedSpd) {
      const n = Number(savedSpd);
      if (!Number.isNaN(n)) setWindSpd(n);
    }
  }, []);

  // Save wind dir + speed
  useEffect(() => {
    if (windDir !== "") localStorage.setItem(WIND_DIR_KEY, String(wrap360(windDir)));
  }, [windDir]);

  useEffect(() => {
    if (windSpd !== "") localStorage.setItem(WIND_SPD_KEY, String(windSpd));
  }, [windSpd]);

  // Auto-switch sailMode when GPS + wind dir are available AND it's clearly up/downwind
  useEffect(() => {
    if (!gpsOn) return;
    if (windDir === "") return;
    if (gps.cogDeg === null) return;

    const suggestion = inferMode(gps.cogDeg, windDir);
    if (suggestion) setSailMode(suggestion);
  }, [gpsOn, gps.cogDeg, windDir]);

  const tabBase =
    "flex-1 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98]";
  const tabOn = "bg-white text-black shadow";
  const tabOff = "bg-white/10 text-white border border-white/10";

  const recommendation = useMemo(() => {
    const spd = windSpd === "" ? null : Number(windSpd);
    const band = windBand(Number.isNaN(spd as number) ? null : spd);
    const bandHint =
      band === "light"
        ? "Light air: protect flow and depth; avoid over-sheeting."
        : band === "medium"
        ? "Medium air: trim to the edge of stall, then hold."
        : band === "heavy"
        ? "Heavy air: depower in sequence (traveler → backstay → outhaul → cunningham)."
        : "";

    let call = "";
    let why = "";
    let next = "";
    let ifthen = "";

    // Base logic by sailMode + boatMode (Mainsail-focused)
    if (sailMode === "upwind") {
      if (boatMode === "speed") {
        call =
          "Keep main flow attached: ease slightly if the leech feels hooked, and use traveler to keep the boat on its feet.";
        why =
          "Speed comes from attached flow and a stable groove; over-trimming the main stalls the leech and loads the helm.";
        next =
          "Hold 30–60 seconds and compare speed. Make one change at a time (traveler OR sheet OR backstay).";
        ifthen =
          "If still slow, add a touch of depth (ease backstay or outhaul slightly). If helm is heavy, go to Control.";
      }

      if (boatMode === "pointing") {
        call =
          "Press for pointing only after speed is stable: traveler up for angle, then sheet for leech control without stalling.";
        why =
          "Pointing is the highest angle you can sail while maintaining speed and flow—stalling turns ‘high’ into slow.";
        next =
          "If speed holds, fine-tune: add backstay + cunningham as breeze builds to stabilize shape.";
        ifthen =
          "If speed drops or stall appears, go back to Speed (foot slightly and reattach flow).";
      }

      if (boatMode === "control") {
        call =
          "Depower in order: traveler down first, then add backstay, then tighten outhaul, then add cunningham.";
        why =
          "Excess heel and helm drag slow the boat and destroy groove. Control restores repeatable speed.";
        next =
          "After each change, re-check helm (neutral-to-light) and whether the boat tracks without constant rudder.";
        ifthen =
          "If still overpowered, flatten more (backstay/outhaul) and avoid steering to ‘fix’ trim.";
      }

      // Symptom overrides (Upwind)
      if (symptom === "slow") {
        call =
          "Confirm clear air first. Then reattach flow: ease slightly (don’t hook the leech) and sail a touch lower to build speed.";
        why =
          "A stalled leech or pinched groove kills acceleration; speed must come first.";
        next =
          "Hold for 30–60 seconds and compare to a similar boat.";
        ifthen =
          "If still slow, add power (ease outhaul/backstay slightly) OR improve flow (ease sheet a touch)—one change only.";
      }

      if (symptom === "pinching") {
        call =
          "Ease slightly and sail lower until flow returns, then rebuild pointing gradually.";
        why =
          "Pinching stalls flow. You can’t point without speed and attached air.";
        next =
          "Once fast, head up slowly until you’re just at the edge of stall—then hold.";
        ifthen =
          "If stall returns immediately, stay in Speed mode longer and/or open twist slightly.";
      }

      if (symptom === "overpowered") {
        call =
          "Control sequence: traveler down → backstay on → outhaul tighter → cunningham on.";
        why =
          "Reducing heel and helm drag is faster than fighting the rudder.";
        next =
          "Aim for neutral helm and steadier speed through puffs.";
        ifthen =
          "If still heavy, flatten further (backstay/outhaul) rather than steering more.";
      }

      if (symptom === "badair") {
        call =
          "Prioritize clean air first. Once clear, trim for stable flow (don’t over-sheet and stall).";
        why =
          "Bad air makes trim feedback unreliable and speed inconsistent.";
        next =
          "After clearing, build speed before pressing for pointing.";
        ifthen =
          "If you re-enter bad air, reposition early instead of fighting for inches.";
      }

      if (symptom === "cant_hold_lane") {
        call =
          "Foot slightly for speed and lane stability. A fast boat holds lanes; a slow one can’t.";
        why =
          "Lane-holding requires speed more than trim perfection.";
        next =
          "Re-evaluate: do we have clear air for the next 30 seconds?";
        ifthen =
          "If pinned, make one decisive move to clear air rather than small corrections while slow.";
      }
    }

    if (sailMode === "downwind") {
      call =
        "Cal 25 default: vang OFF (eased). Use mainsheet to manage twist and keep the main drawing without forcing it.";
      why =
        "Downwind is about stable flow and avoiding stall/over-trim. Small, steady changes beat constant trimming.";
      next =
        "Hold trim long enough to evaluate. If speed feels sticky, ease slightly to reattach flow.";
      ifthen =
        "If the main keeps collapsing, trim slightly to stabilize. If you’re on a run, some stall can be normal—focus on stability.";
    }

    // Telltale overlays (Practical Sailor quick reference)
    // NOTE: “windward/leeward” here assumes you’re using body telltales or equivalent indicators.
    if (telltales === "all_streaming") {
      call = `Telltales streaming aft: hold trim. ${call}`;
      why = why || "Streaming telltales indicate attached flow and efficient trim.";
    }

    if (telltales === "leeward_lifting") {
      // Article: leeward lifting => ease sheet or head up
      call =
        "Leeward telltales lifting: ease sheet slightly OR head up a touch until they stream aft. Then hold and evaluate.";
      why =
        "Leeward telltales lifting is a sign the sail is trimmed too hard for the current angle.";
      next =
        "Make one change, then wait 20–30 seconds to confirm steadier flow and speed.";
      ifthen =
        "If you keep lifting leeward telltales, check you’re not sailing too low for your trim.";
    }

    if (telltales === "windward_lifting") {
      // Article: windward lifting => sheet in or bear away
      call =
        "Windward telltales lifting: sheet in slightly OR bear away a touch until they stream aft. Then hold.";
      why =
        "Windward telltales lifting indicates the sail is under-trimmed for the current angle (or you’re sailing too high for your trim).";
      next =
        "Choose one change (sheet OR helm). Confirm speed doesn’t drop.";
      ifthen =
        "If speed drops when you sheet, you may be close to stall—return to Speed mode and rebuild flow first.";
    }

    if (telltales === "leech_stalling") {
      // Article: leech telltales stalling => over-sheeted
      call =
        "Leech telltales stalling/sucking behind: you’re over-sheeted. Ease mainsheet to open the leech and restore flow.";
      why =
        "A stalled leech means air isn’t exiting cleanly, which increases drag and loads the helm.";
      next =
        "Ease until leech telltales fly consistently, then stop changing things for 30 seconds.";
      ifthen =
        "If easing makes you lose too much angle, use traveler to regain angle without re-stalling the leech.";
    }

    const hint = bandHint ? `\n\nWind note: ${bandHint}` : "";

    return { call: call + hint, why, next, ifthen };
  }, [sailMode, boatMode, symptom, telltales, windSpd]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trim — Mainsail</h1>

      {/* Upwind/Downwind Toggle */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
        <div className="flex gap-2">
          <button
            type="button"
            className={`${tabBase} ${sailMode === "upwind" ? tabOn : tabOff}`}
            onClick={() => setSailMode("upwind")}
          >
            Upwind
          </button>
          <button
            type="button"
            className={`${tabBase} ${sailMode === "downwind" ? tabOn : tabOff}`}
            onClick={() => setSailMode("downwind")}
          >
            Downwind
          </button>
        </div>
        <div className="text-xs opacity-70 mt-2 px-1">
          Remembers selection across Trim pages
        </div>
      </div>

      {/* GPS + Wind */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="text-xs uppercase tracking-wide opacity-60">GPS + Wind</div>

        <div className="grid grid-cols-1 gap-3">
          <label className="block space-y-2">
            <div className="text-sm opacity-80">Wind direction (°)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
              placeholder="Example: 225"
              value={windDir}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v === "") return setWindDir("");
                const n = Number(v);
                if (!Number.isNaN(n)) setWindDir(wrap360(n));
              }}
            />
          </label>

          <label className="block space-y-2">
            <div className="text-sm opacity-80">Wind speed (kt)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
              placeholder="Example: 12"
              value={windSpd}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v === "") return setWindSpd("");
                const n = Number(v);
                if (!Number.isNaN(n)) setWindSpd(n);
              }}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98] ${
              gpsOn ? "bg-white text-black shadow" : "bg-white/10 text-white border border-white/10"
            }`}
            onClick={() => setGpsOn((v) => !v)}
          >
            {gpsOn ? "GPS ON" : "GPS OFF"}
          </button>

          <button
            type="button"
            className="flex-1 rounded-xl py-3 text-sm font-semibold bg-white/10 text-white border border-white/10 active:scale-[0.98]"
            onClick={() => {
              if (windDir === "" || gps.cogDeg === null) return;
              const suggestion = inferMode(gps.cogDeg, windDir);
              if (suggestion) setSailMode(suggestion);
            }}
          >
            Set Up/Down from GPS
          </button>
        </div>

        <div className="text-xs opacity-70">
          COG: {gps.cogDeg === null ? "—" : `${Math.round(gps.cogDeg)}°`}
          {" · "}
          {gps.permission === "denied" ? "Location denied" : gpsOn ? "Listening…" : "GPS off"}
          {gps.error ? ` · ${gps.error}` : ""}
        </div>

        <div className="text-xs opacity-60">
          Auto-switches only when clearly Upwind (≤70°) or Downwind (≥110°). Reaches won’t flip it.
        </div>
      </div>

      {/* Inputs */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="text-xs uppercase tracking-wide opacity-60">Inputs</div>

        {sailMode === "upwind" && (
          <label className="block space-y-2">
            <div className="text-sm opacity-80">Boat Mode</div>
            <select
              className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
              value={boatMode}
              onChange={(e) => setBoatMode(e.target.value as BoatMode)}
            >
              <option value="speed">Speed</option>
              <option value="pointing">Pointing</option>
              <option value="control">Control</option>
            </select>
          </label>
        )}

        <label className="block space-y-2">
          <div className="text-sm opacity-80">Symptom</div>
          <select
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value as Symptom)}
          >
            <option value="normal">Normal / General</option>
            <option value="slow">Slow</option>
            <option value="pinching">Pinching / stalling</option>
            <option value="overpowered">Overpowered / heavy helm</option>
            <option value="cant_hold_lane">Can’t hold lane</option>
            <option value="badair">Bad air</option>
          </select>
        </label>

        <label className="block space-y-2">
          <div className="text-sm opacity-80">Telltales (what are you seeing?)</div>
          <select
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
            value={telltales}
            onChange={(e) => setTelltales(e.target.value as TelltaleRead)}
          >
            <option value="unknown">Not sure / not looking</option>
            <option value="all_streaming">All telltales streaming aft</option>
            <option value="leeward_lifting">Leeward telltales lifting</option>
            <option value="windward_lifting">Windward telltales lifting</option>
            <option value="leech_stalling">Leech telltales stalling/sucking</option>
          </select>
        </label>

        <div className="text-xs opacity-60">
          Tip: Telltales override the recommendation with the fastest “fix the flow” move.  [oai_citation:1‡Practical Sailor](https://www.practical-sailor.com/sails-rigging-deckgear/reading-the-telltales-on-your-sails)
        </div>
      </div>

      {/* Answer */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-4">
          <div className="text-xs uppercase tracking-wide opacity-60">Recommendation</div>
          <div className="text-sm opacity-80 mt-1">
            {sailMode === "upwind"
              ? `Upwind · ${titleCase(boatMode)} · ${titleCase(symptom)}`
              : `Downwind · ${titleCase(symptom)}`}
            {windSpd !== "" ? ` · Wind ${windSpd} kt` : ""}
          </div>
        </div>

        <div className="border-t border-white/10" />

        <section className="px-5 py-4 space-y-4">
          <div className="border-l-4 border-blue-400/70 pl-4">
            <div className="text-xs font-semibold tracking-wide text-blue-300">CALL</div>
            <div className="text-sm opacity-90 mt-1 leading-relaxed whitespace-pre-line">
              {recommendation.call}
            </div>
          </div>

          <div className="border-l-4 border-white/20 pl-4">
            <div className="text-xs font-semibold tracking-wide text-white/60">WHY</div>
            <div className="text-sm opacity-80 mt-1 leading-relaxed">
              {recommendation.why}
            </div>
          </div>

          <div className="border-l-4 border-green-400/70 pl-4">
            <div className="text-xs font-semibold tracking-wide text-green-300">DO NEXT</div>
            <div className="text-sm opacity-80 mt-1 leading-relaxed">
              {recommendation.next}
            </div>
          </div>

          <div className="border-l-4 border-amber-400/70 pl-4">
            <div className="text-xs font-semibold tracking-wide text-amber-300">IF / THEN</div>
            <div className="text-sm opacity-80 mt-1 leading-relaxed">
              {recommendation.ifthen}
            </div>
          </div>
        </section>
      </div>

      {/* Links */}
      <div className="grid grid-cols-1 gap-3">
        <a
          href="/trim"
          className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Back to Trim
        </a>

        <a
          href="/"
          className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}