import { createReading, wrap360, wrapSigned180 } from "./normalizer";
import { setConnectionState, setReading } from "./store";

type DemoState = {
  headingDeg: number;
  boatSpeedKt: number;
  awaDeg: number;
  awsKt: number;
  depthM: number;
  lat: number;
  lon: number;
};

function randomWalk(value: number, stepRange: number, min: number, max: number) {
  const next = value + (Math.random() - 0.5) * stepRange;
  return Math.min(max, Math.max(min, next));
}

export function createInitialDemoState(): DemoState {
  return {
    headingDeg: 45,
    boatSpeedKt: 6.2,
    awaDeg: 32,
    awsKt: 14,
    depthM: 18,
    lat: 39.0,
    lon: -76.47,
  };
}

export function advanceDemoState(state: DemoState): DemoState {
  return {
    headingDeg: wrap360(randomWalk(state.headingDeg, 4, 0, 360)),
    boatSpeedKt: randomWalk(state.boatSpeedKt, 0.4, 3.5, 8.5),
    awaDeg: wrapSigned180(randomWalk(state.awaDeg, 3, -60, 60)),
    awsKt: randomWalk(state.awsKt, 0.8, 8, 20),
    depthM: randomWalk(state.depthM, 0.6, 6, 30),
    lat: state.lat + (Math.random() - 0.5) * 0.00006,
    lon: state.lon + (Math.random() - 0.5) * 0.00006,
  };
}

const DEMO_SOURCE_ID = "demo";
const DEMO_TICK_MS = 1000;

let demoState: DemoState = createInitialDemoState();
let demoIntervalId: ReturnType<typeof setInterval> | null = null;

function publishDemoState(state: DemoState, nowMs: number) {
  const rawTimestamp = new Date(nowMs).toISOString();
  const reading = <T,>(value: T) =>
    createReading({ value, source: DEMO_SOURCE_ID, sourceDevice: "Demo generator", rawTimestamp, nowMs });

  setReading("position", reading({ lat: state.lat, lon: state.lon }), nowMs);
  setReading("headingTrueDeg", reading(state.headingDeg), nowMs);
  setReading("cogTrueDeg", reading(state.headingDeg), nowMs);
  setReading("sogKt", reading(state.boatSpeedKt * 0.98), nowMs);
  setReading("speedThroughWaterKt", reading(state.boatSpeedKt), nowMs);
  setReading("awaDeg", reading(state.awaDeg), nowMs);
  setReading("awsKt", reading(state.awsKt), nowMs);
  setReading("twaDeg", reading(wrapSigned180(state.awaDeg * 1.15)), nowMs);
  setReading("twsKt", reading(Math.max(0, state.awsKt - state.boatSpeedKt * 0.3)), nowMs);
  setReading("twdDeg", reading(wrap360(state.headingDeg + state.awaDeg)), nowMs);
  setReading("depthBelowKeelM", reading(state.depthM), nowMs);
  setReading("depthBelowTransducerM", reading(state.depthM + 0.4), nowMs);
  setReading(
    "vmgKt",
    reading(state.boatSpeedKt * Math.cos((state.awaDeg * Math.PI) / 180)),
    nowMs,
  );
  setReading("targetBoatSpeedKt", reading(state.boatSpeedKt + 0.3), nowMs);
  setReading(
    "targetPercentage",
    reading(Math.round((state.boatSpeedKt / (state.boatSpeedKt + 0.3)) * 100)),
    nowMs,
  );
  setReading("liftHeaderDeg", reading(wrapSigned180(state.awaDeg - 32)), nowMs);
}

export function startDemoMode() {
  if (demoIntervalId != null) return;

  demoState = createInitialDemoState();
  setConnectionState({
    mode: "demo",
    status: "connected",
    sourceLabel: "Demo generator",
    lastMessageAt: new Date().toISOString(),
    reconnectAttempts: 0,
  });

  publishDemoState(demoState, Date.now());
  demoIntervalId = setInterval(() => {
    demoState = advanceDemoState(demoState);
    publishDemoState(demoState, Date.now());
  }, DEMO_TICK_MS);
}

export function stopDemoMode() {
  if (demoIntervalId != null) {
    clearInterval(demoIntervalId);
    demoIntervalId = null;
  }
  setConnectionState({
    mode: "none",
    status: "disconnected",
    sourceLabel: "Not connected",
    lastMessageAt: null,
    reconnectAttempts: 0,
  });
}

export function isDemoModeActive() {
  return demoIntervalId != null;
}
