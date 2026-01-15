"use client";

import { useEffect, useMemo, useState } from "react";
import { useGpsCourse } from "@/lib/useGpsCourse";

import { Panel } from "@/components/ui/Panel";
import { Btn, BtnLink } from "@/components/ui/Btn";
import { Chip } from "@/components/ui/Chip";

type SailMode = "upwind" | "downwind";
type BoatMode = "speed" | "pointing" | "control";

type MainSymptom =
  | "normal"
  | "slow"
  | "overpowered"
  | "pinching"
  | "cant_hold_lane"
  | "badair";

type MainTwist =
  | "unknown"
  | "too_closed"
  | "too_open"
  | "balanced";

const MODE_KEY = "trim-mode";
const WIND_DIR_KEY = "wind-dir-deg";
const WIND_SPD_KEY = "wind-spd-kt";

function wrap360(d: number) {
  return (d % 360 + 360) % 360;
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
  // shared sail mode (remembered)
  const [sailMode, setSailMode] = useState<SailMode>("upwind");

  // GPS
  const [gpsOn, setGpsOn] = useState(false);
  const gps = useGpsCourse(gpsOn);

  // Wind inputs (stored)
  const [windDir, setWindDir] = useState<number | "">("");
  const [windSpd, setWindSpd] = useState<number | "">("");

  // Main tuning intent
  const [boatMode, setBoatMode] = useState<BoatMode>("speed");
  const [symptom, setSymptom] = useState<MainSymptom>("normal");
  const [twist, setTwist] = useState<MainTwist>("unknown");

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
  }, []);

  // Persist
  useEffect(() => localStorage.setItem(MODE_KEY, sailMode), [sailMode]);

  useEffect(() => {
    if (windDir !== "") localStorage.setItem(WIND_DIR_KEY, String(wrap360(windDir)));
  }, [windDir]);

  useEffect(() => {
    if (windSpd !== "") localStorage.setItem(WIND_SPD_KEY, String(windSpd));
  }, [windSpd]);

  // Auto-switch mode from GPS if clear up/downwind
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

    // Output fields
    let call = "";
    let why = "";
    let next = "";
    let ifthen = "";

    // Downwind baseline (your Cal 25 rule: vang eased/off)
    if (sailMode === "downwind") {
      call =
        "Downwind main: ease vang (vang mostly OFF), ease sheet for twist, and control with traveler if needed.";
      why =
        "Downwind you want an open leech and stable airflow. Vang on downwind can hook the leech and stall.";
      next =
        "Set vang light/off → ease sheet until top opens → stabilize with steering.";
      ifthen =
        "If rolling/unstable, add a touch of vang only to stop boom bounce—but avoid hooking the leech.";
      return { call, why, next, ifthen };
    }

    // Upwind logic (simple v1)
    if (symptom === "badair") {
      call = "Bad air: prioritize lane/clear air first, then reset main trim.";
      why = "Dirty air makes trim feedback unreliable.";
      next = "Once clear, build speed, then press for pointing.";
      ifthen = "If pinned, make one decisive lane move rather than constant trim changes.";
      return { call, why, next, ifthen };
    }

    if (symptom === "overpowered") {
      call =
        "Overpowered: depower main first. Flatten with outhaul + cunningham, add backstay, then use traveler down.";
      why =
        "Flattening reduces heel/helm and improves pointing and speed in breeze.";
      next =
        "Outhaul tight → Cunningham on → Backstay on → Traveler down enough to keep flow.";
      ifthen =
        "If still loaded, ease sheet slightly to open leech. If you lose too much height, bring traveler up a touch.";
      return { call, why, next, ifthen };
    }

    if (symptom === "pinching") {
      call =
        "Pinching: open the leech slightly and rebuild speed. Traveler down a touch OR ease sheet slightly.";
      why =
        "Pinching often comes from too much leech tension / too narrow a groove.";
      next =
        "Ease sheet 1–2 inches OR drop traveler slightly, then steer for speed.";
      ifthen =
        "If heel is the reason you’re pinching, depower: outhaul/cunningham/backstay first.";
      return { call, why, next, ifthen };
    }

    if (symptom === "cant_hold_lane") {
      call =
        "Can’t hold lane: prioritize speed and control. Ease sheet slightly, keep traveler in a stable range, and steer smoothly.";
      why =
        "Lane control requires speed and a forgiving groove.";
      next =
        "Open leech slightly (sheet) → keep boat flat (traveler/backstay as needed) → hold 30–60 seconds.";
      ifthen =
        "If you’re still getting rolled, shift lanes instead of fighting while slow.";
      return { call, why, next, ifthen };
    }

    if (symptom === "slow") {
      call =
        "Slow: build flow and power. Ease cunningham, ease outhaul slightly (if not windy), and trim sheet to the edge of stall.";
      why =
        "In lighter air, too-flat = no power. You need depth and attached flow.";
      next =
        "Ease cunningham → ease outhaul a touch → trim sheet until top telltales are just on the edge.";
      ifthen =
        `If wind is ${band === "heavy" ? "heavy" : "up"} and you’re still slow, check you’re not over-depowered (traveler too low / too much backstay).`;
      return { call, why, next, ifthen };
    }

    // Twist guidance
    if (twist === "too_closed") {
      call =
        "Leech too closed: ease sheet slightly OR reduce vang-like leech tension (upwind: traveler + sheet balance).";
      why =
        "A hooked leech stalls the upper main and kills pointing/speed.";
      next =
        "Ease sheet a touch, then use traveler to recover height without re-hooking the leech.";
      ifthen =
        "If easing sheet makes you too low, add a little traveler up instead of more sheet.";
      return { call, why, next, ifthen };
    }

    if (twist === "too_open") {
      call =
        "Leech too open: trim sheet slightly OR bring traveler up to add leech tension without over-sheeting.";
      why =
        "Too much twist can reduce pointing and make the main feel powerless.";
      next =
        "Trim sheet slightly, then fine-tune with traveler.";
      ifthen =
        "If you start stalling up high, reverse the last change and prioritize flow (speed mode).";
      return { call, why, next, ifthen };
    }

    // Default by boat mode
    if (boatMode === "speed") {
      call =
        "Speed: keep the main driving with attached flow. Use sheet for twist, traveler for angle.";
      why =
        "Sheet controls leech tension; traveler controls angle of attack.";
      next =
        "Trim to the edge of stall, keep boat flat, then hold 30–60 seconds.";
      ifthen =
        "If you’re slow, add a touch of depth (ease cunningham/outhaul) before trimming harder.";
      return { call, why, next, ifthen };
    }

    if (boatMode === "pointing") {
      call =
        "Pointing: only press once speed is stable. Add traveler up first, then fine-tune with sheet.";
      why =
        "Traveler increases angle without immediately hooking the leech.";
      next =
        "Build speed → traveler up slightly → adjust sheet to keep top flowing.";
      ifthen =
        "If you stall, return to speed mode immediately (ease sheet / traveler down slightly).";
      return { call, why, next, ifthen };
    }

    call =
      "Control: widen the groove and stabilize the boat. Keep the leech slightly open and avoid constant trimming.";
    why =
      "Control means repeatable speed through puffs/chop.";
    next =
      "Keep boat flat with traveler/backstay as needed. Hold settings through one puff/wave set.";
    ifthen =
      "If you’re still unstable, depower with cunningham/outhaul before making large traveler moves.";
    return { call, why, next, ifthen };
  }, [windSpd, sailMode, symptom, boatMode, twist]);

  const modeText = sailMode === "upwind" ? "Upwind" : "Downwind";
  const windText = windSpd === "" ? "— kt" : `${windSpd} kt`;
  const gpsText = gpsOn ? (gps.cogDeg == null ? "On" : `${Math.round(gps.cogDeg)}°`) : "Off";

  return (
    <main className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mainsail</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Sheet + traveler drive the boat. Flatten with outhaul/cunningham/backstay.
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

          <label className="space-y-1">
            <div className="text-xs text-[color:var(--muted)]">Twist / Leech</div>
            <select
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={twist}
              onChange={(e) => setTwist(e.target.value as MainTwist)}
            >
              <option value="unknown">Not sure</option>
              <option value="balanced">Looks balanced</option>
              <option value="too_closed">Too closed / hooked</option>
              <option value="too_open">Too open / too twisty</option>
            </select>
          </label>

          <label className="space-y-1 col-span-2">
            <div className="text-xs text-[color:var(--muted)]">Symptom</div>
            <select
              className="w-full rounded-2xl bg-black/40 border border-[color:var(--divider)] p-3"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value as MainSymptom)}
            >
              <option value="normal">Normal / General</option>
              <option value="slow">Slow</option>
              <option value="pinching">Pinching</option>
              <option value="overpowered">Overpowered</option>
              <option value="cant_hold_lane">Can’t hold lane</option>
              <option value="badair">Bad air</option>
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
            Downwind reminder: vang is mostly OFF on the Cal 25.
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

      <div className="grid grid-cols-2 gap-3">
        <BtnLink href="/troubleshoot/slow" tone="amber">
          I’M SLOW
        </BtnLink>
        <BtnLink href="/logs" tone="neutral">
          Logs
        </BtnLink>
      </div>

      <BtnLink href="/trim" tone="neutral">
        Back to Trim
      </BtnLink>
    </main>
  );
}