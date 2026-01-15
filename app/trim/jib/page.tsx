"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGpsCourse } from "@/lib/useGpsCourse";
import {
  createPendingLog,
  getPendingLogId,
  markPendingAsUnrated,
  rateLog,
  getLogs,
  type Rating,
} from "@/lib/logStore";

type SailMode = "upwind" | "downwind";
type BoatMode = "speed" | "pointing" | "control";
type Symptom =
  | "normal"
  | "slow"
  | "pinching"
  | "overpowered"
  | "badair"
  | "cant_hold_lane";

type Telltales =
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

const MODE_KEY = "trim-mode";
const WIND_DIR_KEY = "wind-dir-deg";
const WIND_SPD_KEY = "wind-spd-kt";
const CAR_POS_KEY = "jib-car-pos-screw-v1";

const LOGIC_VERSION = "jib_v1_2026-01-11";

function wrap360(d: number) {
  return (d % 360 + 360) % 360;
}

function clampCar(n: number) {
  if (n < 1) return 1;
  if (n > 24) return 24;
  return Math.round(n);
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
  return null;
}

function windBand(kt: number | null): "light" | "medium" | "heavy" | "unknown" {
  if (kt == null) return "unknown";
  if (kt < 8) return "light";
  if (kt <= 14) return "medium";
  return "heavy";
}

export default function TrimJibPage() {
  // Upwind/Downwind section (remembered)
  const [sailMode, setSailMode] = useState<SailMode>("upwind");

  // GPS
  const [gpsOn, setGpsOn] = useState(false);
  const gps = useGpsCourse(gpsOn);

  // Wind direction + speed (stored)
  const [windDir, setWindDir] = useState<number | "">("");
  const [windSpd, setWindSpd] = useState<number | "">("");

  // Jib inputs
  const [carPos, setCarPos] = useState<number>(1); // 1–24 only
  const [boatMode, setBoatMode] = useState<BoatMode>("speed");
  const [symptom, setSymptom] = useState<Symptom>("normal");
  const [telltales, setTelltales] = useState<Telltales>("unknown");

  // Pending log tracking + timer
  const pendingTimerRef = useRef<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Load saved state
  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_KEY);
    if (savedMode === "upwind" || savedMode === "downwind") setSailMode(savedMode);

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

    const savedCar = localStorage.getItem(CAR_POS_KEY);
    if (savedCar) {
      const n = Number(savedCar);
      if (!Number.isNaN(n)) setCarPos(clampCar(n));
    } else {
      setCarPos(1);
    }

    setPendingId(getPendingLogId());
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(MODE_KEY, sailMode);
  }, [sailMode]);

  useEffect(() => {
    if (windDir !== "") localStorage.setItem(WIND_DIR_KEY, String(wrap360(windDir)));
  }, [windDir]);

  useEffect(() => {
    if (windSpd !== "") localStorage.setItem(WIND_SPD_KEY, String(windSpd));
  }, [windSpd]);

  useEffect(() => {
    localStorage.setItem(CAR_POS_KEY, String(clampCar(carPos)));
  }, [carPos]);

  // Auto-switch sailMode from GPS when clearly up/downwind
  useEffect(() => {
    if (!gpsOn) return;
    if (windDir === "") return;
    if (gps.cogDeg == null) return;

    const suggestion = inferMode(gps.cogDeg, windDir);
    if (suggestion) setSailMode(suggestion);
  }, [gpsOn, gps.cogDeg, windDir]);

  const tabBase =
    "flex-1 rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98]";
  const tabOn = "bg-white text-black shadow";
  const tabOff = "bg-white/10 text-white border border-white/10";

  // =========================
  // Recommendation Engine
  // =========================
  const computed = useMemo(() => {
    const spd = windSpd === "" ? null : Number(windSpd);
    const band = windBand(Number.isNaN(spd as number) ? null : spd);

    // wind speed modifies aggressiveness
    const stepSmall = band === "heavy" ? 2 : 1;
    const stepBig = band === "heavy" ? 3 : 2;

    const suggestCar = (delta: number) => clampCar(carPos + delta);

    let call = "";
    let why = "";
    let next = "";
    let ifthen = "";
    let carSuggested = carPos;

    // ---- TELLTALES FIRST ----
    if (telltales === "dead_unreliable") {
      call =
        "Telltales look unreliable right now. Ignore them and trim for feel: build speed, watch helm load, and compare to a similar boat.";
      why =
        "If telltales are lying (wet, hidden, or dead), chasing them creates random trim changes and bad data.";
      next =
        "Hold one trim setting for 30–60 seconds and compare speed/angle. Make one change at a time.";
      ifthen =
        "If you're still slow, ease sheet slightly to widen groove OR check you're in clean air before moving the car.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "erratic_dirty_air") {
      call =
        "Telltales look random from dirty air. Prioritize clean air first, then re-trim the jib to the edge of stall.";
      why =
        "Dirty air makes telltales unreliable and speed inconsistent. Trim fixes don't stick until airflow is clean.";
      next =
        "Once clear, build speed first. Then press for pointing if needed.";
      ifthen =
        "If you keep re-entering bad air, choose the next lane early rather than fighting for inches.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "erratic_waves") {
      call =
        "Telltales are reacting to waves/pitch. Don't chase trim. Keep a slightly eased sheet for groove and steer smoothly.";
      why =
        "In chop, constant telltale changes are often motion-driven, not trim-driven. Stability beats constant fiddling.";
      next =
        "Hold settings and evaluate over 30–60 seconds. Make one small change only if the pattern is consistent.";
      ifthen =
        "If you're slow, go to Speed: ease sheet a touch and keep flow, then consider a small car adjustment.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "all_flowing") {
      call =
        "All telltales are flowing: hold trim. Don't touch the car unless you have a clear symptom.";
      why =
        "Streaming telltales indicate attached flow. Random car moves usually make you slower.";
      next =
        "Use your objective: speed first, then pointing. Make one change at a time.";
      ifthen =
        "If you still feel slow, confirm clear air, then make a small sheet change before moving the car.";
      return { call, why, next, ifthen, carSuggested };
    }

    // Twist mismatch => CAR
    if (telltales === "top_stalled_bottom_flowing") {
      carSuggested = suggestCar(+stepSmall);
      call = `Top stalled, bottom flowing: open the leech up high. Move car aft +${
        carSuggested - carPos
      } screws (${carPos} → ${carSuggested}).`;
      why =
        "A forward car closes the leech and reduces twist. If the top is stalling first, you need more twist.";
      next =
        "After moving, re-check top telltales. Then fine-tune with sheet to the edge of stall.";
      ifthen =
        "If the top still stalls, ease sheet slightly. If the bottom starts stalling, you moved too far aft—come forward 1.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "top_flowing_bottom_stalled") {
      carSuggested = suggestCar(-stepSmall);
      call = `Top flowing, bottom stalled: balance the lower sail. Move car forward ${
        carPos - carSuggested
      } screw(s) (${carPos} → ${carSuggested}).`;
      why =
        "An aft car opens the leech and can over-twist, leaving the bottom overloaded. Moving forward balances twist/depth.";
      next =
        "After moving, trim sheet until inside telltales flow most of the time.";
      ifthen =
        "If the top starts stalling after the move, go back aft 1 and ease sheet slightly instead.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "leeward_stalled") {
      carSuggested = suggestCar(+stepSmall);
      call =
        "Leeward telltales stalled: ease sheet slightly first to restore flow. " +
        `If still stalled, move car aft +${carSuggested - carPos} screws (${carPos} → ${carSuggested}).`;
      why =
        "Leeward stall usually means overtrimmed for the current angle (or sailing too high for the trim).";
      next =
        "Make one change, then hold 20–30 seconds to confirm steadier flow and speed.";
      ifthen =
        "If easing sheet makes you too low, head up slightly after flow returns—don't re-overtrim immediately.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "windward_lifting") {
      const forward1 = suggestCar(-1);
      call =
        "Windward telltales lifting: trim sheet slightly OR bear away a touch until they stream. " +
        `If the sail feels too twisted/open, move car forward 1 (${carPos} → ${forward1}).`;
      why =
        "Windward lift indicates under-trimmed for the angle (or sailing too low for your trim).";
      next =
        "Choose one change (sheet or helm). Confirm speed doesn't drop.";
      ifthen =
        "If trimming sheet stalls leeward telltales quickly, widen groove (car aft) instead of more sheet.";
      return { call, why, next, ifthen, carSuggested: forward1 };
    }

    if (telltales === "streaming_then_collapsing") {
      const aft1 = suggestCar(+1);
      call =
        "Streaming then collapsing: you're on the edge. Ease sheet a touch to widen groove. " +
        `If it keeps cycling, move car aft +1 (${carPos} → ${aft1}).`;
      why =
        "In variable wind, a little more twist and groove width produces steadier speed than constant trimming.";
      next =
        "Hold settings through 2–3 cycles before changing again.";
      ifthen =
        "If you lose pointing too much, take it back with steering/angle first—not by over-sheeting.";
      return { call, why, next, ifthen, carSuggested: aft1 };
    }

    // ---- IF TELLTALES UNKNOWN: SYMPTOM / MODE ----
    if (sailMode === "downwind") {
      call =
        "Downwind jib: ease enough to keep it drawing through angle changes. Avoid overtrim and stall.";
      why =
        "Downwind speed is lost when the sail stalls or you chase trim constantly. Stability beats fiddling.";
      next =
        "Make one small change, then evaluate for 20–30 seconds.";
      ifthen =
        "If speed feels sticky, ease slightly. If it collapses constantly, trim slightly and stabilize.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "badair") {
      call =
        "Bad air: prioritize clean air first. Once clear, trim to the edge of stall (don't overtrim).";
      why =
        "Dirty air makes telltale feedback unreliable and speed inconsistent.";
      next =
        "After clearing, build speed before pressing for pointing.";
      ifthen =
        "If you re-enter bad air, choose a safer lane early instead of fighting for inches.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "slow") {
      if (band === "heavy") {
        const aft = suggestCar(+1);
        call =
          "Slow: confirm clear air first. Ease sheet slightly to keep flow. " +
          `In breeze, widen groove: move car aft +1 (${carPos} → ${aft}).`;
        carSuggested = aft;
      } else {
        call =
          "Slow: confirm clear air first. Ease sheet slightly to keep flow. If still sticky, consider a small car adjustment after sheet.";
      }
      why =
        "Most 'slow' moments are flow loss. Sheet fixes flow fastest; car fixes twist/groove second.";
      next =
        "Hold 30–60 seconds and compare speed to a similar boat.";
      ifthen =
        "If still slow, adjust halyard slightly (shape) or reduce forestay sag (more backstay) if windy.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "pinching") {
      call =
        "Pinching: ease sheet until flow returns, then sail a touch lower to rebuild speed.";
      why =
        "Pinching stalls the jib first. You can't point without flow and speed.";
      next =
        "Once fast, head up slowly until you're just at the edge of stall—then hold.";
      ifthen =
        "If stall returns immediately, widen groove (car aft 1) before trying to point again.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "cant_hold_lane") {
      call =
        "Can't hold lane: foot slightly for speed and stability, then re-trim to keep flow. Fast boats hold lanes.";
      why =
        "Lane-holding requires speed. A slow boat can't defend a lane.";
      next =
        "Re-evaluate: do we have clear air for the next 30 seconds?";
      ifthen =
        "If pinned, make one decisive move to clear air rather than small corrections while slow.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "overpowered") {
      const aft = suggestCar(+(band === "heavy" ? stepBig : stepSmall));
      carSuggested = aft;
      call = `Overpowered: widen groove and depower the jib. Move car aft +${
        carSuggested - carPos
      } (${carPos} → ${carSuggested}), then add halyard tension.`;
      why =
        "In breeze, a flatter jib and wider groove reduce drag, leeway, and helm load.";
      next =
        "After the move, re-trim sheet to the edge of stall and hold. Let the boat settle.";
      ifthen =
        "If still overpowered, reduce forestay sag (more backstay). If underpowered after flattening, come forward 1.";
      return { call, why, next, ifthen, carSuggested };
    }

    // Normal/general
    if (boatMode === "speed") {
      call =
        "Speed mode: keep inside telltales flowing most of the time. Sheet is the first lever; car is second.";
      why =
        "Speed comes from attached flow and a wide enough groove to steer smoothly.";
      next =
        "Trim to the edge of stall, then hold for 30–60 seconds.";
      ifthen =
        "If the groove feels too narrow, move car aft 1. If too open/flat, move forward 1.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (boatMode === "pointing") {
      call =
        "Pointing mode: only press for angle once speed is stable. Trim slightly harder, but never accept sustained stall.";
      why =
        "Pointing is the highest angle you can sail while maintaining flow and speed.";
      next =
        "If speed holds, fine-tune twist with the car (small moves), then re-check telltales.";
      ifthen =
        "If speed drops, return to Speed mode immediately (ease and rebuild).";
      return { call, why, next, ifthen, carSuggested };
    }

    call =
      "Control mode: widen groove first. Favor a slightly more open leech and steadier flow.";
    why =
      "Control is repeatable speed with predictable steering; narrow groove = reactive driving and losses.";
    next =
      "Make one small change (car or halyard), then evaluate through at least one puff or wave set.";
    ifthen =
      "If control improves but pointing drops, regain pointing with angle/steering—not by overtrim.";
    return { call, why, next, ifthen, carSuggested };
  }, [windSpd, telltales, sailMode, symptom, boatMode, carPos]);

  // =========================
  // Confidence (display-only)
  // =========================
  const confidence = useMemo(() => {
    const spd = windSpd === "" ? null : Number(windSpd);
    const band = windBand(Number.isNaN(spd as number) ? null : spd);

    const rated = getLogs().filter((l) => l.status === "rated");

    const similar = rated.filter((l) => {
      const lBand = windBand(l.windSpeedKt ?? null);
      return (
        l.page === "/trim/jib" &&
        l.sailMode === sailMode &&
        lBand === band &&
        l.telltales === telltales
      );
    });

    const n = similar.length;
    if (n === 0) return { label: "None", n: 0, betterPct: null as number | null };

    const better = similar.filter((l) => l.rating === "better").length;
    const betterPct = better / n;

    let label: "Low" | "Medium" | "High" = "Low";
    if (n >= 8 && betterPct >= 0.65) label = "High";
    else if (n >= 4) label = "Medium";

    return { label, n, betterPct };
  }, [windSpd, sailMode, telltales]);

  // =========================
  // Auto-log pending changes
  // =========================
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    const sig = JSON.stringify({
      sailMode,
      windDir,
      windSpd,
      boatMode: sailMode === "upwind" ? boatMode : null,
      symptom,
      telltales,
      carPos,
      carSuggested: computed.carSuggested,
      call: computed.call,
    });

    const t = window.setTimeout(() => {
      if (sig === lastSigRef.current) return;
      lastSigRef.current = sig;

      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }

      const windDirNum = windDir === "" ? null : Number(windDir);
      const windSpdNum = windSpd === "" ? null : Number(windSpd);

      const log = createPendingLog({
        page: "/trim/jib",
        sailMode,
        windDirTrueFromDeg:
          windDirNum == null || Number.isNaN(windDirNum) ? null : wrap360(windDirNum),
        windSpeedKt:
          windSpdNum == null || Number.isNaN(windSpdNum) ? null : windSpdNum,

        boatMode: sailMode === "upwind" ? boatMode : null,
        symptom,
        telltales,

        carBefore: clampCar(carPos),
        carSuggested: clampCar(computed.carSuggested),
        carDelta: clampCar(computed.carSuggested) - clampCar(carPos),

        recommendation: {
          call: computed.call,
          why: computed.why,
          next: computed.next,
          ifthen: computed.ifthen,
        },

        gps: {
          lat: null,
          lon: null,
          cogDeg: gps.cogDeg ?? null,
          sogMps: gps.sogMps ?? null,
          accuracyM: gps.accuracyM ?? null,
        },

        logicVersion: LOGIC_VERSION,
      });

      setPendingId(log.id);

      pendingTimerRef.current = window.setTimeout(() => {
        markPendingAsUnrated(log.id);
      }, 2 * 60 * 1000);
    }, 700);

    return () => window.clearTimeout(t);
  }, [
    sailMode,
    windDir,
    windSpd,
    boatMode,
    symptom,
    telltales,
    carPos,
    computed.call,
    computed.carSuggested,
    computed.why,
    computed.next,
    computed.ifthen,
    gps.cogDeg,
    gps.sogMps,
    gps.accuracyM,
  ]);

  const ratePending = (r: Rating) => {
    if (!pendingId) return;
    rateLog(pendingId, r);
    setPendingId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trim — Headsail (150%)</h1>

      {/* Upwind/Downwind */}
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
            <div className="text-sm opacity-80">Wind direction (True, from °)</div>
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
              if (windDir === "" || gps.cogDeg == null) return;
              const suggestion = inferMode(gps.cogDeg, windDir);
              if (suggestion) setSailMode(suggestion);
            }}
          >
            Set Up/Down from GPS
          </button>
        </div>

        <div className="text-xs opacity-70">
          COG: {gps.cogDeg == null ? "—" : `${Math.round(gps.cogDeg)}°`}
          {" · "}
          {gps.permission === "denied"
            ? "Location denied"
            : gpsOn
            ? "Listening…"
            : "GPS off"}
          {gps.error ? ` · ${gps.error}` : ""}
        </div>

        <div className="text-xs opacity-60">
          Auto-switches only when clearly Upwind (≤70°) or Downwind (≥110°). Reaches won't flip it.
        </div>
      </div>

      {/* Inputs */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="text-xs uppercase tracking-wide opacity-60">Inputs</div>

        <label className="block space-y-2">
          <div className="text-sm opacity-80">Jib car position (screw #, 1–24)</div>
          <input
            inputMode="numeric"
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
            value={carPos}
            onChange={(e) => {
              const v = e.target.value.trim();
              const n = Number(v);
              if (!Number.isNaN(n)) setCarPos(clampCar(n));
            }}
          />
          <div className="text-xs opacity-60">
            1 = forward-most usable. Advice will be "+/- screws (from → to)".
          </div>
        </label>

        {sailMode === "upwind" && (
          <label className="block space-y-2">
            <div className="text-sm opacity-80">Boat mode</div>
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
            <option value="cant_hold_lane">Can't hold lane</option>
            <option value="badair">Bad air</option>
          </select>
        </label>

        <label className="block space-y-2">
          <div className="text-sm opacity-80">Telltales (what are you seeing?)</div>
          <select
            className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
            value={telltales}
            onChange={(e) => setTelltales(e.target.value as Telltales)}
          >
            <option value="unknown">Not sure / not looking</option>
            <option value="all_flowing">All flowing</option>
            <option value="leeward_stalled">Leeward stalled most of the time</option>
            <option value="windward_lifting">Windward lifting most of the time</option>
            <option value="top_stalled_bottom_flowing">Top stalled, bottom flowing</option>
            <option value="top_flowing_bottom_stalled">Top flowing, bottom stalled</option>
            <option value="erratic_waves">Erratic with waves/pitch</option>
            <option value="erratic_dirty_air">Erratic/random (dirty air)</option>
            <option value="streaming_then_collapsing">Streaming → collapsing → streaming</option>
            <option value="dead_unreliable">Dead/drooping (unreliable)</option>
          </select>
        </label>

        <div className="text-xs opacity-60">
          Tip: Telltales override with the fastest "fix flow" move when reliable.
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-4">
          <div className="text-xs uppercase tracking-wide opacity-60">Recommendation</div>

          <div className="text-sm opacity-80 mt-1">
            {sailMode === "upwind" ? `Upwind · ${boatMode}` : "Downwind"}
            {" · "}
            Wind {windSpd === "" ? "—" : `${windSpd} kt`}
            {" · "}
            Car {carPos} → {computed.carSuggested} (
            {computed.carSuggested - carPos >= 0 ? "+" : ""}
            {computed.carSuggested - carPos})
          </div>

          <div className="text-xs opacity-70 mt-1">
            Confidence: {confidence.label}
            {confidence.n === 0 ? (
              " · (no rated history yet)"
            ) : (
              <>
                {" · "}n={confidence.n}
                {" · "}Better={Math.round((confidence.betterPct ?? 0) * 100)}%
              </>
            )}
          </div>
        </div>

        <div className="border-t border-white/10" />

        <section className="px-5 py-4 space-y-4">
          <div className="border-l-4 border-blue-400/70 pl-4">
            <div className="text-xs font-semibold tracking-wide text-blue-300">CALL</div>
            <div className="text-sm opacity-90 mt-1 leading-relaxed whitespace-pre-line">
              {computed.call}
            </div>
          </div>

          <div className="border-l-4 border-white/20 pl-4">
            <div className="text-xs font-semibold tracking-wide text-white/60">WHY</div>
            <div className="text-sm opacity-80 mt-1 leading-relaxed">{computed.why}</div>
          </div>

          <div className="border-l-4 border-green-400/70 pl-4">
            <div className="text-xs font-semibold tracking-wide text-green-300">DO NEXT</div>
            <div className="text-sm opacity-80 mt-1 leading-relaxed">{computed.next}</div>
          </div>

          <div className="border-l-4 border-amber-400/70 pl-4">
            <div className="text-xs font-semibold tracking-wide text-amber-300">IF / THEN</div>
            <div className="text-sm opacity-80 mt-1 leading-relaxed">{computed.ifthen}</div>
          </div>
        </section>

        {/* What to do now */}
<div className="border-t border-white/10 px-5 py-4">
  <div className="text-xs uppercase tracking-wide opacity-60">
    On the boat — checklist
  </div>
  <ul className="mt-2 space-y-1 text-sm opacity-80 list-disc list-inside">
    <li>Make only <strong>one</strong> change at a time</li>
    <li>Hold trim for <strong>30–60 seconds</strong></li>
    <li>Compare speed and angle to a nearby boat</li>
    <li>If unsure, <strong>do nothing</strong> and collect data</li>
  </ul>
</div>
      </div>

      {/* Rating bar */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Rate the latest change</div>
          <a href="/logs" className="text-sm underline opacity-80">
            Review logs
          </a>
        </div>

        <div className="text-xs opacity-70">
          A pending log is created automatically and becomes <span className="font-semibold">Unrated</span> after 2 minutes if you don't tap.
          Only <span className="font-semibold">Rated</span> logs affect learning.
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            className="rounded-xl bg-white text-black px-4 py-3 font-semibold shadow active:scale-[0.98] transition disabled:opacity-40"
            onClick={() => ratePending("better")}
            disabled={!pendingId}
          >
            ✅ Better
          </button>
          <button
            className="rounded-xl bg-white text-black px-4 py-3 font-semibold shadow active:scale-[0.98] transition disabled:opacity-40"
            onClick={() => ratePending("same")}
            disabled={!pendingId}
          >
            ➖ Same
          </button>
          <button
            className="rounded-xl bg-white text-black px-4 py-3 font-semibold shadow active:scale-[0.98] transition disabled:opacity-40"
            onClick={() => ratePending("worse")}
            disabled={!pendingId}
          >
            ❌ Worse
          </button>
        </div>
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