import { describe, expect, it } from "vitest";
import {
  classifyNumericQuality,
  computeAgeSeconds,
  createReading,
  metersPerSecondToKnots,
  resolvePreferredSource,
  wrap360,
  wrapSigned180,
} from "./normalizer";

describe("unit conversions", () => {
  it("converts m/s to knots", () => {
    expect(metersPerSecondToKnots(1)).toBeCloseTo(1.943844, 5);
  });

  it("wraps degrees into 0-360", () => {
    expect(wrap360(-10)).toBe(350);
    expect(wrap360(370)).toBe(10);
  });

  it("wraps degrees into -180..180", () => {
    expect(wrapSigned180(190)).toBe(-170);
    expect(wrapSigned180(-190)).toBe(170);
  });
});

describe("classifyNumericQuality", () => {
  it("flags NaN/non-finite values as invalid", () => {
    expect(classifyNumericQuality(Number.NaN, "speedKt")).toBe("invalid");
  });

  it("flags out-of-range values as suspect, not invalid", () => {
    expect(classifyNumericQuality(999, "speedKt")).toBe("suspect");
  });

  it("accepts plausible values as valid", () => {
    expect(classifyNumericQuality(6.2, "speedKt")).toBe("valid");
  });
});

describe("computeAgeSeconds", () => {
  it("computes age in seconds from a normalized timestamp", () => {
    const timestamp = new Date(1000).toISOString();
    expect(computeAgeSeconds(timestamp, 4000)).toBe(3);
  });

  it("returns Infinity for an unparsable timestamp", () => {
    expect(computeAgeSeconds("not-a-date", 4000)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("createReading", () => {
  it("stamps normalizedTimestamp and ageSeconds from nowMs", () => {
    const reading = createReading({
      value: 6.2,
      source: "test",
      rawTimestamp: "raw",
      nowMs: 5000,
    });
    expect(reading.normalizedTimestamp).toBe(new Date(5000).toISOString());
    expect(reading.ageSeconds).toBe(0);
    expect(reading.quality).toBe("valid");
  });
});

describe("resolvePreferredSource", () => {
  const gps = createReading({ value: 90, source: "gps", rawTimestamp: "r", nowMs: 1000 });
  const compass = createReading({ value: 92, source: "compass", rawTimestamp: "r", nowMs: 2000 });

  it("returns null when no candidates are present", () => {
    expect(resolvePreferredSource([null, undefined])).toBeNull();
  });

  it("honors manual priority order over recency", () => {
    const result = resolvePreferredSource([gps, compass], { manualPriority: ["compass", "gps"] });
    expect(result?.source).toBe("compass");
  });

  it("falls back to the most recent valid reading with no manual priority", () => {
    const result = resolvePreferredSource([gps, compass]);
    expect(result?.source).toBe("compass");
  });

  it("skips invalid readings in favor of valid ones", () => {
    const invalidNewer = createReading({
      value: 999,
      source: "flaky",
      rawTimestamp: "r",
      nowMs: 3000,
      quality: "invalid",
    });
    const result = resolvePreferredSource([gps, invalidNewer]);
    expect(result?.source).toBe("gps");
  });
});
