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

import { Panel } from "@/components/ui/Panel";
import { Btn, BtnLink } from "@/components/ui/Btn";
import { Chip } from "@/components/ui/Chip";

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
  const [sailMode, setSailMode] = useState<SailMode>("upwind");

  // GPS
  const [gpsOn, setGpsOn] = useState(false);
  const gps = useGpsCourse(gpsOn);

  // Wind
  const [windDir, setWindDir] = useState<number | "">("");
  const [windSpd, setWindSpd] = useState<number | "">("");

  // Jib inputs
  const [carPos, setCarPos] = useState<number>(1);
  const [boatMode, setBoatMode] = useState<BoatMode>("speed");
  const [symptom, setSymptom] = useState<Symptom>("normal");
  const [telltales, setTelltales] = useState<Telltales>("unknown");

  // Pending log
  const pendingTimerRef = useRef<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  useEffect(() => localStorage.setItem(MODE_KEY, sailMode), [sailMode]);

  useEffect(() => {
    if (windDir !== "") localStorage.setItem(WIND_DIR_KEY, String(wrap360(windDir)));
  }, [windDir]);

  useEffect(() => {
    if (windSpd !== "") localStorage.setItem(WIND_SPD_KEY, String(windSpd));
  }, [windSpd]);

  useEffect(() => {
    localStorage.setItem(CAR_POS_KEY, String(clampCar(carPos)));
  }, [carPos]);

  // Auto-switch sailMode from GPS when clear up/downwind
  useEffect(() => {
    if (!gpsOn) return;
    if (windDir === "") return;
    if (gps.cogDeg == null) return;

    const suggestion = inferMode(gps.cogDeg, windDir);
    if (suggestion) setSailMode(suggestion);
  }, [gpsOn, gps.cogDeg, windDir]);

  // =========================
  // Recommendation Engine (unchanged)
  // =========================
  const computed = useMemo(() => {
    const spd = windSpd === "" ? null : Number(windSpd);
    const band = windBand(Number.isNaN(spd as number) ? null : spd);

    const stepSmall = band === "heavy" ? 2 : 1;
    const stepBig = band === "heavy" ? 3 : 2;

    const suggestCar = (delta: number) => clampCar(carPos + delta);

    let call = "";
    let why = "";
    let next = "";
    let ifthen = "";
    let carSuggested = carPos;

    // --- telltales priority ---
    if (telltales === "dead_unreliable") {
      call =
        "Telltales look unreliable. Ignore them: build speed, watch helm load, and compare to a similar boat.";
      why =
        "If telltales are lying (wet/hidden/dead), chasing them creates random changes and bad data.";
      next =
        "Hold one setting 30–60 seconds. Make one change at a time.";
      ifthen =
        "If still slow, ease sheet slightly OR confirm you’re in clean air before moving the car.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "erratic_dirty_air") {
      call =
        "Dirty air: prioritize clean air first, then trim to the edge of stall.";
      why =
        "Dirty air makes telltales unreliable and speed inconsistent.";
      next =
        "Once clear, build speed first. Then press for pointing if needed.";
      ifthen =
        "If you keep re-entering bad air, choose the next lane early rather than fighting for inches.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "erratic_waves") {
      call =
        "Chop: don’t chase telltales. Keep a slightly eased sheet for groove and steer smoothly.";
      why =
        "In waves, telltale changes are often motion-driven, not trim-driven.";
      next =
        "Hold settings 30–60 seconds. Make one small change only if the pattern is consistent.";
      ifthen =
        "If slow, ease a touch to keep flow, then consider a small car adjustment.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "all_flowing") {
      call =
        "All flowing: hold trim. Don’t touch the car unless you have a clear symptom.";
      why = "Streaming telltales indicate attached flow.";
      next = "Use your objective: speed first, then pointing.";
      ifthen =
        "If still slow, confirm clean air, then make a small sheet change before moving the car.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "top_stalled_bottom_flowing") {
      carSuggested = suggestCar(+stepSmall);
      call = `Top stalled, bottom flowing: move car aft +${carSuggested - carPos} (${carPos} → ${carSuggested}).`;
      why = "Top stalling first usually means you need more twist up high.";
      next = "After moving, re-check top telltales, then fine-tune with sheet.";
      ifthen =
        "If bottom starts stalling, you moved too far aft—come forward 1.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "top_flowing_bottom_stalled") {
      carSuggested = suggestCar(-stepSmall);
      call = `Top flowing, bottom stalled: move car forward ${carPos - carSuggested} (${carPos} → ${carSuggested}).`;
      why = "Bottom stalling can mean too much twist/open leech down low.";
      next = "Trim sheet until inside telltales flow most of the time.";
      ifthen =
        "If top stalls after the move, go back aft 1 and ease sheet slightly instead.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "leeward_stalled") {
      carSuggested = suggestCar(+stepSmall);
      call =
        "Leeward stalled: ease sheet slightly first. " +
        `If still stalled, move car aft +${carSuggested - carPos} (${carPos} → ${carSuggested}).`;
      why = "Leeward stall usually means overtrim (or sailing too high for the trim).";
      next = "Make one change then hold 20–30 seconds.";
      ifthen =
        "If easing makes you too low, head up slightly after flow returns—don’t re-overtrim immediately.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (telltales === "windward_lifting") {
      const forward1 = suggestCar(-1);
      call =
        "Windward lifting: trim sheet slightly OR bear away a touch. " +
        `If it feels too open, move car forward 1 (${carPos} → ${forward1}).`;
      why = "Windward lift indicates under-trim (or you’re sailing too low for your trim).";
      next = "Choose one change and confirm speed doesn’t drop.";
      ifthen =
        "If trimming stalls leeward quickly, widen groove (car aft) instead of more sheet.";
      return { call, why, next, ifthen, carSuggested: forward1 };
    }

    if (telltales === "streaming_then_collapsing") {
      const aft1 = suggestCar(+1);
      call =
        "Streaming then collapsing: ease sheet a touch to widen groove. " +
        `If it keeps cycling, move car aft +1 (${carPos} → ${aft1}).`;
      why = "In variable wind, a little more groove is faster than constant trimming.";
      next = "Hold through 2–3 cycles before changing again.";
      ifthen =
        "If pointing drops too much, regain with steering/angle first—not by over-sheeting.";
      return { call, why, next, ifthen, carSuggested: aft1 };
    }

    // --- if telltales unknown: symptom/mode ---
    if (sailMode === "downwind") {
      call =
        "Downwind jib: ease enough to keep it drawing through angle changes. Avoid overtrim and stall.";
      why = "Stability beats fiddling downwind.";
      next = "Make one small change then evaluate 20–30 seconds.";
      ifthen = "If sticky, ease slightly. If collapsing, trim slightly and stabilize.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "badair") {
      call = "Bad air: prioritize clean air first. Then trim to the edge of stall.";
      why = "Dirty air makes feedback unreliable.";
      next = "After clearing, build speed before pressing.";
      ifthen = "If you keep re-entering, choose a safer lane early.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "slow") {
      if (band === "heavy") {
        const aft = suggestCar(+1);
        call =
          "Slow: confirm clean air. Ease sheet slightly. " +
          `In breeze, widen groove: move car aft +1 (${carPos} → ${aft}).`;
        carSuggested = aft;
      } else {
        call =
          "Slow: confirm clean air. Ease sheet slightly. If still sticky, adjust car after sheet.";
      }
      why = "Most slow moments are flow loss. Sheet fixes flow fastest.";
      next = "Hold 30–60 seconds and compare to a similar boat.";
      ifthen = "If still slow, adjust halyard slightly or reduce sag with backstay if windy.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "pinching") {
      call = "Pinching: ease sheet until flow returns, then sail slightly lower to rebuild speed.";
      why = "You can’t point without flow and speed.";
      next = "Once fast, head up slowly to the edge of stall—then hold.";
      ifthen = "If stall returns immediately, widen groove (car aft 1) before trying to point again.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "cant_hold_lane") {
      call = "Can’t hold lane: foot slightly for speed and stability, then re-trim to keep flow.";
      why = "Lane-holding requires speed.";
      next = "Re-evaluate: do we have clean air for the next 30 seconds?";
      ifthen = "If pinned, make one decisive move to clear air rather than small corrections while slow.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (symptom === "overpowered") {
      const aft = suggestCar(+(band === "heavy" ? stepBig : stepSmall));
      carSuggested = aft;
      call = `Overpowered: move car aft +${carSuggested - carPos} (${carPos} → ${carSuggested}), then add halyard tension.`;
      why = "A flatter jib and wider groove reduce drag and helm load.";
      next = "Re-trim to the edge of stall and hold. Let the boat settle.";
      ifthen = "If still overpowered, reduce sag with more backstay. If underpowered, come forward 1.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (boatMode === "speed") {
      call = "Speed: keep inside telltales flowing most of the time. Sheet first, car second.";
      why = "Speed comes from attached flow and a wide groove.";
      next = "Trim to the edge of stall, then hold 30–60 seconds.";
      ifthen = "If groove too narrow, move car aft 1. If too open, move forward 1.";
      return { call, why, next, ifthen, carSuggested };
    }

    if (boatMode === "pointing") {
      call = "Pointing: only press for angle once speed is stable. Never accept sustained stall.";
      why = "Pointing is the highest angle while maintaining flow.";
      next = "Fine-tune twist with small car moves, then re-check telltales.";
      ifthen = "If speed drops, return to Speed mode (ease and rebuild) immediately.";
      return { call, why, next, ifthen, carSuggested };
    }

    call = "Control: widen groove first. Favor steadier flow over max angle.";
    why = "Control is repeatable speed with predictable steering.";
    next = "Make one small change, then evaluate through a puff or wave set.";
    ifthen = "If control improves but pointing drops, regain with angle/steering—not overtrim.";
    return { call, why, next, ifthen, carSuggested };
  }, [windSpd, telltales, sailMode, symptom, boatMode, carPos]);

  // Confidence (display-only)
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

  // Auto-log pending changes (kept as-is)
  useEffect(() => {
    const t = window.setTimeout(() => {
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

  const modeText = sailMode === "upwind" ? "Upwind" : "Downwind";
  const windText = windSpd === "" ? "— kt" : `${windSpd} kt`;
  const gpsText = gpsOn ? (gps.cogDeg == null ? "On" : `${Math.round(gps.cogDeg)}°`) : "Off";

  return (
    <main className="space-y-5 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Headsail (150%)</h1>
        <p className="text-sm text-[color:var(--muted)]">
          One change at a time. Hold 30–60 seconds before changing again.
        </p>
      </header>

      <Panel title="Instruments">
        <div className="grid grid-cols-2 gap-3">
          <Chip label="Mode" value={modeText} accent="blue" />
          <Chip label="Wind" value={windText} accent="teal" />
          <Chip label="Car" value={`${carPos} → ${computed.carSuggested}`} accent="neutral" />
          <Chip label="GPS" value={gpsText} accent={gpsOn ? "amber" : "neutral"} />
        </div>
      </Panel>

      <Panel
        title="Controls"
        right={
          <div className="flex gap-2">
            <Btn
              tone={sailMode === "upwind" ? "primary" : "neutral"}
              full={false}
              onClick={() => setSailMode("upwind")}
            >
              Up
            </Btn>
            <Btn
              tone={sailMode === "downwind" ? "primary" : "neutral"}
              full={false}
              onClick={() => setSailMode("downwind")}
            >
              Down
            </Btn>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-xs text-[color:var(--muted)]">Wind Dir (°T)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={windDir}
              placeholder="225"
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v === "") return setWindDir("");
                const n = Number(v);
                if (!Number.isNaN(n)) setWindDir(wrap360(n));
              }}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-[color:var(--muted)]">Wind Speed (kt)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={windSpd}
              placeholder="12"
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v === "") return setWindSpd("");
                const n = Number(v);
                if (!Number.isNaN(n)) setWindSpd(n);
              }}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-[color:var(--muted)]">Car (1–24)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={carPos}
              onChange={(e) => {
                const v = e.target.value.trim();
                const n = Number(v);
                if (!Number.isNaN(n)) setCarPos(clampCar(n));
              }}
            />
          </label>

          {sailMode === "upwind" ? (
            <label className="space-y-1">
              <div className="text-xs text-[color:var(--muted)]">Boat mode</div>
              <select
                className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
                value={boatMode}
                onChange={(e) => setBoatMode(e.target.value as BoatMode)}
              >
                <option value="speed">Speed</option>
                <option value="pointing">Pointing</option>
                <option value="control">Control</option>
              </select>
            </label>
          ) : (
            <div className="rounded-2xl border border-[color:var(--divider)] bg-black/30 p-3">
              <div className="text-xs text-[color:var(--muted)]">Boat mode</div>
              <div className="mt-1 text-sm opacity-80">Downwind</div>
            </div>
          )}

          <label className="space-y-1 col-span-2">
            <div className="text-xs text-[color:var(--muted)]">Symptom</div>
            <select
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value as Symptom)}
            >
              <option value="normal">Normal / General</option>
              <option value="slow">Slow</option>
              <option value="pinching">Pinching</option>
              <option value="overpowered">Overpowered</option>
              <option value="cant_hold_lane">Can’t hold lane</option>
              <option value="badair">Bad air</option>
            </select>
          </label>

          <label className="space-y-1 col-span-2">
            <div className="text-xs text-[color:var(--muted)]">Telltales</div>
            <select
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={telltales}
              onChange={(e) => setTelltales(e.target.value as Telltales)}
            >
              <option value="unknown">Not sure / not looking</option>
              <option value="all_flowing">All flowing</option>
              <option value="leeward_stalled">Leeward stalled</option>
              <option value="windward_lifting">Windward lifting</option>
              <option value="top_stalled_bottom_flowing">Top stalled, bottom flowing</option>
              <option value="top_flowing_bottom_stalled">Top flowing, bottom stalled</option>
              <option value="erratic_waves">Erratic (waves)</option>
              <option value="erratic_dirty_air">Erratic (dirty air)</option>
              <option value="streaming_then_collapsing">Streaming then collapsing</option>
              <option value="dead_unreliable">Dead/unreliable</option>
            </select>
          </label>

          <div className="col-span-2 grid grid-cols-2 gap-3">
            <Btn
              tone={gpsOn ? "amber" : "neutral"}
              onClick={() => setGpsOn((v) => !v)}
            >
              {gpsOn ? "GPS ON" : "GPS OFF"}
            </Btn>
            <Btn
              tone="neutral"
              onClick={() => {
                if (windDir === "" || gps.cogDeg == null) return;
                const suggestion = inferMode(gps.cogDeg, windDir);
                if (suggestion) setSailMode(suggestion);
              }}
            >
              Set Up/Down
            </Btn>
          </div>

          <div className="col-span-2 text-xs text-[color:var(--muted)]">
            Confidence: {confidence.label}
            {confidence.n === 0
              ? " · (no rated history yet)"
              : ` · n=${confidence.n} · Better=${Math.round((confidence.betterPct ?? 0) * 100)}%`}
          </div>
        </div>
      </Panel>

      <Panel title="Answer">
        <div className="space-y-3">
          <div className="rounded-2xl border border-[color:var(--divider)] bg-black/30 p-4">
            <div className="text-xs tracking-widest text-[color:var(--teal)] uppercase">
              Call
            </div>
            <div className="mt-2 text-sm leading-relaxed opacity-90 whitespace-pre-line">
              {computed.call}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
              <div className="text-xs tracking-widest text-[color:var(--muted)] uppercase">
                Why
              </div>
              <div className="mt-2 text-sm opacity-80 leading-relaxed">
                {computed.why}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
              <div className="text-xs tracking-widest text-[color:var(--muted)] uppercase">
                Do next
              </div>
              <div className="mt-2 text-sm opacity-80 leading-relaxed">
                {computed.next}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
            <div className="text-xs tracking-widest text-[color:var(--muted)] uppercase">
              If / Then
            </div>
            <div className="mt-2 text-sm opacity-80 leading-relaxed">
              {computed.ifthen}
            </div>
          </div>
        </div>
      </Panel>

      <BtnLink href="/trim" tone="neutral">
        Back to Trim
      </BtnLink>

      {/* Sticky rating bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[color:var(--divider)] bg-[color:var(--bg)]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            <Btn tone="primary" onClick={() => ratePending("better")} disabled={!pendingId}>
              Better
            </Btn>
            <Btn tone="neutral" onClick={() => ratePending("same")} disabled={!pendingId}>
              Same
            </Btn>
            <Btn tone="danger" onClick={() => ratePending("worse")} disabled={!pendingId}>
              Worse
            </Btn>
            <BtnLink href="/logs" tone="neutral">
              Logs
            </BtnLink>
          </div>
        </div>
      </div>
    </main>
  );
}