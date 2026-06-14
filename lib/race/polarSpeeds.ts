/**
 * Target upwind boat speeds for a typical PHRF keelboat (IOR/IRC ~1.0).
 * These are approximations suitable for simulation and VMG comparison.
 * Calibrate by comparing to GPS SOG averages from race sessions at known wind speeds.
 *
 * Each entry: [trueWindKt, targetBoatSpeedKt]
 * Assumes optimal upwind angle (≈ tack angle / 2 from close-hauled).
 */
const UPWIND_TARGET_SPEEDS: ReadonlyArray<readonly [windKt: number, speedKt: number]> = [
  [4, 2.8],
  [6, 3.7],
  [8, 4.5],
  [10, 5.2],
  [12, 5.7],
  [14, 6.0],
  [16, 6.2],
  [18, 6.3],
  [20, 6.3],
  [25, 6.1],
  [30, 5.8],
];

/**
 * Target downwind boat speeds (broad reach / running).
 * Each entry: [trueWindKt, targetBoatSpeedKt]
 */
const DOWNWIND_TARGET_SPEEDS: ReadonlyArray<readonly [windKt: number, speedKt: number]> = [
  [6, 3.5],
  [8, 4.4],
  [10, 5.1],
  [12, 5.7],
  [14, 6.2],
  [16, 6.6],
  [18, 6.9],
  [20, 7.0],
  [25, 7.1],
  [30, 6.8],
];

function interpolateSpeed(
  table: ReadonlyArray<readonly [number, number]>,
  windKt: number
): number {
  if (windKt <= table[0][0]) return table[0][1];
  if (windKt >= table[table.length - 1][0]) return table[table.length - 1][1];

  for (let i = 0; i < table.length - 1; i++) {
    const [w0, s0] = table[i];
    const [w1, s1] = table[i + 1];
    if (windKt >= w0 && windKt <= w1) {
      const t = (windKt - w0) / (w1 - w0);
      return s0 + t * (s1 - s0);
    }
  }

  return table[table.length - 1][1];
}

/** Target upwind boat speed in knots for a given true wind speed. */
export function getUpwindTargetSpeedKt(windKt: number): number {
  return interpolateSpeed(UPWIND_TARGET_SPEEDS, windKt);
}

/** Target downwind boat speed in knots for a given true wind speed. */
export function getDownwindTargetSpeedKt(windKt: number): number {
  return interpolateSpeed(DOWNWIND_TARGET_SPEEDS, windKt);
}

/**
 * Percentage of target speed being achieved.
 * Returns null if either value is unavailable.
 */
export function getSpeedVsTargetPct(
  actualKt: number | null | undefined,
  targetKt: number
): number | null {
  if (actualKt == null || actualKt < 0 || targetKt <= 0) return null;
  return Math.round((actualKt / targetKt) * 100);
}

/**
 * Qualitative label for speed-vs-target percentage.
 */
export function getSpeedPerformanceLabel(
  pct: number | null
): "unknown" | "slow" | "below_target" | "on_target" | "fast" {
  if (pct == null) return "unknown";
  if (pct < 80) return "slow";
  if (pct < 93) return "below_target";
  if (pct <= 108) return "on_target";
  return "fast";
}
