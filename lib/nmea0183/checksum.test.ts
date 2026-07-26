import { describe, expect, it } from "vitest";
import { computeChecksum, validateChecksum } from "./checksum";

describe("computeChecksum", () => {
  it("computes the XOR checksum of a known-good sentence", () => {
    const sentence = "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A";
    expect(computeChecksum(sentence)).toBe("6A");
  });

  it("ignores a leading ! for encapsulation sentences", () => {
    expect(computeChecksum("!AIVDM,1,1,,A,test*00")).toBe(computeChecksum("$AIVDM,1,1,,A,test*00"));
  });
});

describe("validateChecksum", () => {
  it("accepts a sentence with a correct checksum", () => {
    const result = validateChecksum(
      "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a sentence with an incorrect checksum", () => {
    const result = validateChecksum(
      "$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*00",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a sentence missing the * delimiter", () => {
    const result = validateChecksum("$GPRMC,123519,A,4807.038,N");
    expect(result.ok).toBe(false);
  });

  it("rejects a sentence not starting with $ or !", () => {
    const result = validateChecksum("GPRMC,123519,A*6A");
    expect(result.ok).toBe(false);
  });
});
