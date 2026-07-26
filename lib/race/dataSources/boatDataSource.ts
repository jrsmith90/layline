"use client";

import { knotsToMetersPerSecond } from "@/lib/boat-data/normalizer";
import { useBoatDataSnapshot, useNowMs } from "@/lib/boat-data/store";
import { getReadingFreshness } from "@/lib/boat-data/staleness";
import type {
  RaceInputSourceState,
  RaceSourceConfidenceHint,
  RaceSourceFreshness,
} from "./types";

const EMPTY_TRACK: RaceInputSourceState["track"] = [];

function getConfidenceHint(params: {
  connected: boolean;
  freshness: RaceSourceFreshness;
  hasPosition: boolean;
}): RaceSourceConfidenceHint {
  if (!params.connected || !params.hasPosition) return "none";
  if (params.freshness === "stale" || params.freshness === "unknown") return "low";
  if (params.freshness === "aging") return "medium";
  return "high";
}

/**
 * Adapts the boat-data store into the RaceInputSourceState shape already used by
 * phone GPS, so future race-state fusion (lib/race/state/deriveRaceState.ts) can
 * treat "instrument_feed" the same way it treats "phone_gps". Not yet consumed
 * by deriveRaceState.ts - that wiring is Phase 2 tactical integration.
 */
export function useBoatDataInstrumentSource(): RaceInputSourceState {
  const snapshot = useBoatDataSnapshot();
  const nowMs = useNowMs(2000);

  const connected = snapshot.connection.status === "connected";
  const freshness = getReadingFreshness("position", snapshot.position, nowMs);
  const confidence = getConfidenceHint({
    connected,
    freshness,
    hasPosition: Boolean(snapshot.position),
  });

  return {
    sourceId: "instrument_feed",
    kind: "instrument_feed",
    label: snapshot.connection.sourceLabel,
    snapshot: {
      supported: true,
      enabled: snapshot.connection.mode !== "none",
      permission: connected ? "granted" : "unknown",
      position: snapshot.position?.value ?? null,
      cogDeg: snapshot.cogTrueDeg?.value ?? null,
      sogMps: snapshot.sogKt ? knotsToMetersPerSecond(snapshot.sogKt.value) : null,
      accuracyM: snapshot.gpsAccuracyM?.value ?? null,
      observedAt: snapshot.position?.normalizedTimestamp ?? null,
      freshness,
      confidence,
      error: snapshot.connection.error,
    },
    track: EMPTY_TRACK,
    clearTrack: () => undefined,
  };
}
