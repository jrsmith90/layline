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
import getMainActionPlan, {
  type SailMode,
  type BoatMode,
  type Symptom,
} from "@/data/logic/mainTrimLogic";

const MODE_KEY = "main-trim-mode";
const WIND_DIR_KEY = "main-wind-dir-deg";
const WIND_SPD_KEY = "main-wind-spd-kt";
const TRAVELER_KEY = "main-traveler-pos-v1";
const SHEET_KEY = "main-sheet-tension-v1";
const VANG_KEY = "main-vang-tension-v1";

const LOGIC_VERSION = "main_v2_2026-04-12";

function wrap360(d: number) {
  return (d % 360 + 360) % 360;
}

function clampScale(n: number) {
  if (n < 1) return 1;
  if (n > 10) return 10;
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

export default function TrimMainPage() {
  const [sailMode, setSailMode] = useState<SailMode>("upwind");

  const [gpsOn, setGpsOn] = useState(false);
  const gps = useGpsCourse(gpsOn);

  const [windDir, setWindDir] = useState<number | "">("");
  const [windSpd, setWindSpd] = useState<number | "">("");

  const [travelerPos, setTravelerPos] = useState<number>(5);
  const [sheetTension, setSheetTension] = useState<number>(5);
  const [vangTension, setVangTension] = useState<number>(2);

  const [boatMode, setBoatMode] = useState<BoatMode>("speed");
  const [symptom, setSymptom] = useState<Symptom>("normal");
  const [leechState, setLeechState] = useState<LeechState>("unknown");

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

    const savedTraveler = localStorage.getItem(TRAVELER_KEY);
    if (savedTraveler) {
      const n = Number(savedTraveler);
      if (!Number.isNaN(n)) setTravelerPos(clampScale(n));
    }

    const savedSheet = localStorage.getItem(SHEET_KEY);
    if (savedSheet) {
      const n = Number(savedSheet);
      if (!Number.isNaN(n)) setSheetTension(clampScale(n));
    }

    const savedVang = localStorage.getItem(VANG_KEY);
    if (savedVang) {
      const n = Number(savedVang);
      if (!Number.isNaN(n)) setVangTension(clampScale(n));
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
    localStorage.setItem(TRAVELER_KEY, String(clampScale(travelerPos)));
  }, [travelerPos]);

  useEffect(() => {
    localStorage.setItem(SHEET_KEY, String(clampScale(sheetTension)));
  }, [sheetTension]);

  useEffect(() => {
    localStorage.setItem(VANG_KEY, String(clampScale(vangTension)));
  }, [vangTension]);

  useEffect(() => {
    if (!gpsOn) return;
    if (windDir === "") return;
    if (gps.cogDeg == null) return;

    const suggestion = inferMode(gps.cogDeg, windDir);
    if (suggestion) setSailMode(suggestion);
  }, [gpsOn, gps.cogDeg, windDir]);

  const computed = useMemo(() => {
    const spd = windSpd === "" ? null : Number(windSpd);
    const band = windBand(Number.isNaN(spd as number) ? null : spd);

    let call = "";
    let why = "";
    let next = "";
    let ifthen = "";

    if (sailMode === "downwind") {
      call =
        "Downwind main: ease vang (vang mostly OFF), ease sheet for twist, and stabilize with steering before making more changes.";
      why =
        "Downwind you want an open leech and stable airflow. Vang on too hard can hook the leech and stall the top.";
      next =
        "Ease vang → ease sheet until the sail fills cleanly → steer smoothly through pressure changes.";
      ifthen =
        "If rolling or boom bounce gets excessive, add only a touch of vang—just enough to stabilize, not enough to hook the leech.";
      return { call, why, next, ifthen };
    }

    if (symptom === "badair") {
      call = "Bad air: prioritize lane and clear air first, then reset the main trim.";
      why = "Dirty air makes main trim feedback unreliable and can hide the real problem.";
      next = "Once clear, rebuild speed first, then decide whether you can point again.";
      ifthen = "If you keep re-entering bad air, change lanes instead of stacking trim changes on a broken platform.";
      return { call, why, next, ifthen };
    }

    if (symptom === "overpowered") {
      call =
        "Overpowered: depower the main first. Traveler down, sheet eased slightly for twist, then flatten with rig controls if available.";
      why =
        "The main is usually the fastest place to reduce heel and helm load without killing the whole boat.";
      next =
        "Traveler down → small sheet ease → keep vang soft enough upwind that the top can still twist.";
      ifthen =
        `If wind is ${band === "heavy" ? "heavy" : "up"} and you are still loaded up, flatten more and do not try to hold a high mode too early.`;
      return { call, why, next, ifthen };
    }

    if (symptom === "pinching" || symptom === "cannot_point") {
      call =
        "Stop forcing angle. Ease the main slightly, rebuild speed, then use traveler to recover height later.";
      why =
        "A boat that is pinching or unable to point usually does not have enough flow to support the angle it is trying to hold.";
      next =
        "Ease sheet slightly → foot for speed → bring traveler up later if the boat can carry it.";
      ifthen =
        "If you get sticky again immediately, go back to speed mode and stop chasing height for the moment.";
      return { call, why, next, ifthen };
    }

    if (symptom === "cant_hold_lane") {
      call =
        "Can’t hold lane: prioritize speed and platform stability. Keep the leech breathing and sail slightly freer if needed.";
      why = "Holding a lane requires enough speed and control to keep the boat alive.";
      next =
        "Ease sheet slightly → sail a touch lower if needed → make one decision, not three half-decisions.";
      ifthen =
        "If you still cannot hold the lane after one clean adjustment, leave earlier instead of fighting while slow.";
      return { call, why, next, ifthen };
    }

    if (symptom === "too_much_helm") {
      call =
        "Too much helm: unload the boat first. Traveler down, sheet eased slightly if needed, then steer smoothly.";
      why = "Heavy helm is drag. It slows the boat and makes every other trim signal worse.";
      next =
        "Traveler down 1 → if still heavy, ease sheet slightly and stop asking the boat for max angle.";
      ifthen =
        "If helm stays loaded, flatten more and do not retrim the leech closed too quickly.";
      return { call, why, next, ifthen };
    }

    if (symptom === "stalling") {
      call =
        "Main is stalling: free the leech and re-open the groove. Ease before trying to point again.";
      why = "A sticky, stalled main cannot support speed or angle for long.";
      next = "Ease sheet slightly, keep traveler supportive, and give the sail time to reset.";
      ifthen =
        "If it stalls again right away, the mode is too high for the trim or the boat is still underpowered.";
      return { call, why, next, ifthen };
    }

    if (symptom === "slow") {
      call =
        "Slow: rebuild pace and flow. Ease the main a touch first, then compare before making a second move.";
      why = "A tiny mainsheet ease is often the fastest way to get the boat breathing again.";
      next = "Ease slightly → hold 30–60 seconds → compare to a similar nearby boat.";
      ifthen =
        `If wind is ${band === "heavy" ? "heavy" : "up"} and you still feel stuck, check that you are not too twisted-off or over-depowered.`;
      return { call, why, next, ifthen };
    }

    if (leechState === "too_closed" || leechState === "hooked") {
      call =
        "Leech too closed: ease the mainsheet slightly, then use traveler to hold angle instead of re-sheeting too hard.";
      why = "A hooked or too-closed leech stalls the upper main and makes the boat feel sticky.";
      next = "Ease sheet slightly → re-check feel and speed → use traveler for angle if needed.";
      ifthen =
        "If easing makes you too low, add a little traveler up rather than pulling sheet back to the old problem.";
      return { call, why, next, ifthen };
    }

    if (leechState === "too_open") {
      call =
        "Leech too open: trim slightly or bring the traveler up a touch to support angle without over-closing the sail.";
      why = "Too much twist can leave height on the table and make the main feel under-supported.";
      next = "Trim slightly → if needed, traveler up 1 → hold for a clean comparison window.";
      ifthen =
        "If the boat gets sticky after the change, reverse the last move and go back to speed mode.";
      return { call, why, next, ifthen };
    }

    if (boatMode === "pointing") {
      call =
        "Pointing: only press once speed is stable. Traveler up first, then fine-tune with the mainsheet.";
      why = "Traveler usually gives cleaner angle support than just pulling the leech tighter with sheet.";
      next = "Build speed → traveler up slightly → trim sheet to the edge of stall, not past it.";
      ifthen =
        "If the boat gets sticky or helm loads up, return to speed mode immediately.";
      return { call, why, next, ifthen };
    }

    if (boatMode === "control") {
      call =
        "Control: widen the groove and stabilize the boat. Favor a slightly easier, more forgiving main.";
      why = "Control mode is about repeatable speed and steering, not max angle.";
      next = "Traveler down a touch if needed → sheet slightly easier → hold through one puff or wave set.";
      ifthen =
        "If the platform calms down but angle drops, recover angle later with traveler, not by instantly over-sheeting.";
      return { call, why, next, ifthen };
    }

    call =
      "Speed: keep the main driving with attached flow. Use mainsheet for leech tension and traveler for angle.";
    why = "A fast main is alive, slightly forgiving, and stable enough to support acceleration.";
    next = "Trim to the edge of stall, keep the traveler supportive, and hold 30–60 seconds before changing again.";
    ifthen =
      "If you are still slow, ease first and rebuild pace before you ask the boat to point higher.";
    return { call, why, next, ifthen };
  }, [windSpd, sailMode, symptom, boatMode, leechState]);

  const confidence = useMemo(() => {
    const spd = windSpd === "" ? null : Number(windSpd);
    const band = windBand(Number.isNaN(spd as number) ? null : spd);

    const rated = getLogs().filter((l) => l.status === "rated");

    const similar = rated.filter((l) => {
      const lBand = windBand(l.windSpeedKt ?? null);
      return (
        l.page === "/trim/main" &&
        l.sailMode === sailMode &&
        lBand === band
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
  }, [windSpd, sailMode]);

  const actionPlan = useMemo(
    () =>
      getMainActionPlan({
        sailMode,
        boatMode,
        symptom,
        leechState,
        travelerPos,
        sheetTension,
        vangTension,
        windSpd,
      }),
    [sailMode, boatMode, symptom, leechState, travelerPos, sheetTension, vangTension, windSpd]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }

      const windDirNum = windDir === "" ? null : Number(windDir);
      const windSpdNum = windSpd === "" ? null : Number(windSpd);

      const log = createPendingLog({
        page: "/trim/main",
        sailMode,
        windDirTrueFromDeg:
          windDirNum == null || Number.isNaN(windDirNum) ? null : wrap360(windDirNum),
        windSpeedKt:
          windSpdNum == null || Number.isNaN(windSpdNum) ? null : windSpdNum,

        boatMode: sailMode === "upwind" ? boatMode : null,
        symptom,
        telltales: null,

        carBefore: travelerPos,
        carSuggested: travelerPos,
        carDelta: 0,

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
    leechState,
    travelerPos,
    sheetTension,
    vangTension,
    computed.call,
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
        <h1 className="text-2xl font-bold tracking-tight">Mainsail</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Sheet + traveler drive the boat. Flatten with outhaul, cunningham, and rig load.
        </p>
      </header>

      <Panel title="Instruments">
        <div className="grid grid-cols-2 gap-3">
          <Chip label="Mode" value={modeText} accent="blue" />
          <Chip label="Wind" value={windText} accent="teal" />
          <Chip label="Target" value={sailMode === "upwind" ? boatMode : "Downwind"} accent="neutral" />
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
            <div className="text-xs text-[color:var(--muted)]">Traveler (1–10)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={travelerPos}
              onChange={(e) => {
                const v = e.target.value.trim();
                const n = Number(v);
                if (!Number.isNaN(n)) setTravelerPos(clampScale(n));
              }}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-[color:var(--muted)]">Mainsheet (1–10)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={sheetTension}
              onChange={(e) => {
                const v = e.target.value.trim();
                const n = Number(v);
                if (!Number.isNaN(n)) setSheetTension(clampScale(n));
              }}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-[color:var(--muted)]">Vang (1–10)</div>
            <input
              inputMode="numeric"
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={vangTension}
              onChange={(e) => {
                const v = e.target.value.trim();
                const n = Number(v);
                if (!Number.isNaN(n)) setVangTension(clampScale(n));
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
            <div className="text-xs text-[color:var(--muted)]">Leech / Twist</div>
            <select
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={leechState}
              onChange={(e) => setLeechState(e.target.value as LeechState)}
            >
              <option value="unknown">Not sure</option>
              <option value="balanced">Looks balanced</option>
              <option value="too_closed">Too closed</option>
              <option value="too_open">Too open</option>
              <option value="hooked">Hooked</option>
              <option value="twisty_then_stall">Twisty then stall</option>
              <option value="erratic_waves">Erratic in waves</option>
              <option value="erratic_dirty_air">Erratic in dirty air</option>
              <option value="dead_unreliable">Dead / unreliable</option>
            </select>
          </label>

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
              <option value="too_much_helm">Too much helm</option>
              <option value="stalling">Stalling</option>
              <option value="cannot_point">Cannot point</option>
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

          <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4 space-y-3">
            <div>
              <div className="text-xs tracking-widest text-[color:var(--muted)] uppercase">
                Headline
              </div>
              <div className="mt-2 text-sm opacity-90 leading-relaxed">
                {actionPlan.headline}
              </div>
            </div>
            <div>
              <div className="text-xs tracking-widest text-[color:var(--muted)] uppercase">
                Focus
              </div>
              <div className="mt-2 text-sm opacity-80 leading-relaxed">
                {actionPlan.focus}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {actionPlan.actions.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4 space-y-3"
              >
                <div className="text-xs tracking-widest text-[color:var(--teal)] uppercase">
                  {item.title}
                </div>
                <div>
                  <div className="text-[11px] tracking-widest text-[color:var(--muted)] uppercase">
                    Intent
                  </div>
                  <div className="mt-1 text-sm opacity-90 leading-relaxed">
                    {item.intent}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] tracking-widest text-[color:var(--muted)] uppercase">
                    Do This
                  </div>
                  <div className="mt-1 text-sm opacity-90 leading-relaxed">
                    {item.doThis}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] tracking-widest text-[color:var(--muted)] uppercase">
                    Why
                  </div>
                  <div className="mt-1 text-sm opacity-80 leading-relaxed">
                    {item.why}
                  </div>
                </div>
              </div>
            ))}
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

      <div className="grid grid-cols-2 gap-3">
        <BtnLink href="/" tone="neutral">
          Return Home
        </BtnLink>
        <BtnLink href="/trim" tone="neutral">
          Back to Trim
        </BtnLink>
      </div>

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