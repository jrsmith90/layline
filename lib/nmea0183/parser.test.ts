import { describe, expect, it } from "vitest";
import { computeChecksum } from "./checksum";
import { createSentenceTracker, parseSentence } from "./parser";

function buildSentence(payload: string): string {
  const checksum = computeChecksum(`$${payload}`);
  return `$${payload}*${checksum}`;
}

describe("parseSentence", () => {
  it("parses RMC regardless of talker id", () => {
    const sentence = buildSentence(
      "GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W",
    );
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type).toBe("RMC");
      expect(result.talkerId).toBe("GP");
      expect(result.fields.sogKt).toBe(22.4);
      expect(result.fields.cogTrueDeg).toBe(84.4);
      expect(result.fields.lat).toBeCloseTo(48.1173, 3);
      expect(result.fields.lon).toBeCloseTo(11.5167, 3);
    }
  });

  it("parses the same sentence type from a different talker id", () => {
    const sentence = buildSentence(
      "GNRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W",
    );
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type).toBe("RMC");
      expect(result.talkerId).toBe("GN");
    }
  });

  it("parses GGA fix quality fields", () => {
    const sentence = buildSentence("GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fields.fixQuality).toBe(1);
      expect(result.fields.numSatellites).toBe(8);
      expect(result.fields.altitudeM).toBe(545.4);
    }
  });

  it("parses VTG course/speed fields", () => {
    const sentence = buildSentence("GPVTG,054.7,T,034.4,M,005.5,N,010.2,K");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fields.cogTrueDeg).toBe(54.7);
      expect(result.fields.sogKt).toBe(5.5);
    }
  });

  it("parses HDT heading", () => {
    const sentence = buildSentence("GPHDT,123.4,T");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields.headingTrueDeg).toBe(123.4);
  });

  it("parses MWV apparent wind fields", () => {
    const sentence = buildSentence("WIMWV,45.0,R,12.3,N,A");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fields.windAngleDeg).toBe(45);
      expect(result.fields.reference).toBe("R");
      expect(result.fields.windSpeed).toBe(12.3);
    }
  });

  it("parses DBT depth fields", () => {
    const sentence = buildSentence("SDDBT,059.0,f,018.0,M,009.8,F");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields.depthMeters).toBe(18);
  });

  it("parses MTW water temperature", () => {
    const sentence = buildSentence("YXMTW,18.5,C");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields.waterTempC).toBe(18.5);
  });

  it("rejects a sentence with a bad checksum", () => {
    const result = parseSentence("$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*00");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/checksum/i);
  });

  it("reports an unsupported sentence type without crashing", () => {
    const sentence = buildSentence("GPZDA,123519,07,08,1996,00,00");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.type).toBe("ZDA");
      expect(result.reason).toMatch(/unsupported/i);
    }
  });

  it("rejects malformed input without throwing", () => {
    expect(() => parseSentence("not a sentence at all")).not.toThrow();
    const result = parseSentence("not a sentence at all");
    expect(result.ok).toBe(false);
  });

  it("returns null for unparsable numeric fields instead of NaN", () => {
    const sentence = buildSentence("GPHDT,,T");
    const result = parseSentence(sentence);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fields.headingTrueDeg).toBeNull();
  });
});

describe("createSentenceTracker", () => {
  it("tracks latest-by-type, frequency, and unsupported/checksum failures", () => {
    const tracker = createSentenceTracker();

    tracker.ingest(buildSentence("GPHDT,100.0,T"));
    tracker.ingest(buildSentence("GPHDT,110.0,T"));
    tracker.ingest(buildSentence("GPZDA,123519,07,08,1996,00,00"));
    tracker.ingest("$GPRMC,bad*FF");

    const state = tracker.getState();
    expect(state.frequencyByType.HDT).toBe(2);
    expect(state.latestByType.HDT?.fields.headingTrueDeg).toBe(110);
    expect(state.unsupportedTypeCounts.ZDA).toBe(1);
    expect(state.checksumFailures).toBe(1);
  });
});
