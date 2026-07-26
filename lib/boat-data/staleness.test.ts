import { describe, expect, it } from "vitest";
import { createReading } from "./normalizer";
import { countStaleFields, getReadingFreshness, isFieldStale } from "./staleness";
import { createEmptyBoatDataSnapshot } from "./types";

describe("getReadingFreshness", () => {
  it("is unknown when there is no reading", () => {
    expect(getReadingFreshness("sogKt", null, 10000)).toBe("unknown");
  });

  it("is fresh just after the reading arrives", () => {
    const reading = createReading({ value: 6, source: "test", rawTimestamp: "r", nowMs: 1000 });
    expect(getReadingFreshness("sogKt", reading, 1500)).toBe("fresh");
  });

  it("is aging within the class's stale window", () => {
    const reading = createReading({ value: 6, source: "test", rawTimestamp: "r", nowMs: 1000 });
    expect(getReadingFreshness("sogKt", reading, 1000 + 6000)).toBe("aging");
  });

  it("is stale past the class's stale threshold", () => {
    const reading = createReading({ value: 6, source: "test", rawTimestamp: "r", nowMs: 1000 });
    expect(getReadingFreshness("sogKt", reading, 1000 + 20000)).toBe("stale");
  });

  it("uses a slower threshold for depth than for fast-changing navigation fields", () => {
    const reading = createReading({ value: 12, source: "test", rawTimestamp: "r", nowMs: 1000 });
    // 12s: stale for navigation (>10s) but still just "aging" for depth (<=20s)
    expect(getReadingFreshness("sogKt", reading, 1000 + 12000)).toBe("stale");
    expect(getReadingFreshness("depthBelowKeelM", reading, 1000 + 12000)).toBe("aging");
  });
});

describe("isFieldStale / countStaleFields", () => {
  it("counts only fields whose readings have gone stale", () => {
    const snapshot = createEmptyBoatDataSnapshot();
    snapshot.sogKt = createReading({ value: 6, source: "test", rawTimestamp: "r", nowMs: 0 });
    snapshot.depthBelowKeelM = createReading({ value: 12, source: "test", rawTimestamp: "r", nowMs: 0 });

    const nowMs = 12000;
    expect(isFieldStale("sogKt", snapshot.sogKt, nowMs)).toBe(true);
    expect(isFieldStale("depthBelowKeelM", snapshot.depthBelowKeelM, nowMs)).toBe(false);
    expect(countStaleFields(snapshot, nowMs)).toBe(1);
  });
});
