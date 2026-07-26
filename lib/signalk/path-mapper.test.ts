import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPathToFieldIndex,
  convertSignalKValue,
  DEFAULT_SIGNALK_PATH_MAPPINGS,
  getEffectivePathMappings,
  saveOverrides,
} from "./path-mapper";

describe("convertSignalKValue", () => {
  it("converts radians to degrees", () => {
    expect(convertSignalKValue("rad", Math.PI)).toBeCloseTo(180, 5);
  });

  it("converts m/s to knots", () => {
    expect(convertSignalKValue("ms", 1)).toBeCloseTo(1.943844, 5);
  });

  it("converts kelvin to celsius", () => {
    expect(convertSignalKValue("kelvin", 293.15)).toBeCloseTo(20, 5);
  });

  it("converts meters to nautical miles", () => {
    expect(convertSignalKValue("m", 1852)).toBeCloseTo(1, 5);
  });

  it("passes through unitless values", () => {
    expect(convertSignalKValue("none", 42)).toBe(42);
  });
});

describe("getEffectivePathMappings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the defaults with no overrides saved", () => {
    expect(getEffectivePathMappings()).toEqual(DEFAULT_SIGNALK_PATH_MAPPINGS);
  });

  it("applies a saved override on top of the defaults", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });

    saveOverrides([{ field: "awaDeg", path: "environment.wind.angleApparentCustom" }]);
    const mappings = getEffectivePathMappings();
    const awaMapping = mappings.find((m) => m.field === "awaDeg");

    expect(awaMapping?.path).toBe("environment.wind.angleApparentCustom");
  });
});

describe("buildPathToFieldIndex", () => {
  it("indexes mappings by Signal K path", () => {
    const index = buildPathToFieldIndex(DEFAULT_SIGNALK_PATH_MAPPINGS);
    expect(index.get("navigation.speedOverGround")?.field).toBe("sogKt");
  });
});
