/**
 * Magnetic variation (declination) utilities.
 *
 * Convention: variationDeg is positive for West (the common navigation convention).
 * Annapolis, MD is approximately 10.5° W.
 *
 * magnetic = true + variation   (West variation means compass reads higher than true)
 * true     = magnetic - variation
 */

export const ANNAPOLIS_VARIATION_DEG = 10.5;
export const DEFAULT_VARIATION_DEG = ANNAPOLIS_VARIATION_DEG;

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Convert a true bearing to magnetic. */
export function trueToMagnetic(trueDeg: number, variationDeg: number): number {
  return wrap360(trueDeg + variationDeg);
}

/** Convert a magnetic bearing to true. */
export function magneticToTrue(magneticDeg: number, variationDeg: number): number {
  return wrap360(magneticDeg - variationDeg);
}

/**
 * Format a true bearing as a magnetic heading string for display.
 * Returns "--" if the value is null/undefined.
 * Example: formatMagDeg(44.5, 10.5) → "55°M"
 */
export function formatMagDeg(
  trueDeg: number | null | undefined,
  variationDeg: number
): string {
  if (trueDeg == null || !Number.isFinite(trueDeg)) return "--";
  return `${Math.round(trueToMagnetic(trueDeg, variationDeg))}°M`;
}

/**
 * Parse a stored variation string (e.g. "10.5") to a number.
 * Falls back to the default (Annapolis) if blank or invalid.
 */
export function parseVariation(stored: string | undefined): number {
  if (!stored || !stored.trim()) return DEFAULT_VARIATION_DEG;
  const n = parseFloat(stored.trim());
  return Number.isFinite(n) ? n : DEFAULT_VARIATION_DEG;
}
