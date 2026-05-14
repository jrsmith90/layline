"use client";

import { usePhoneGpsSource } from "@/lib/race/dataSources/phoneGpsSource";
import type { RaceInputTrackPoint } from "@/lib/race/dataSources/types";

export type GpsTrackPoint = RaceInputTrackPoint;

export function useGpsCourse(enabled: boolean) {
  const source = usePhoneGpsSource(enabled);
  const { snapshot } = source;

  return {
    sourceId: source.sourceId,
    sourceKind: source.kind,
    sourceLabel: source.label,
    supported: snapshot.supported,
    permission: snapshot.permission,
    lat: snapshot.position?.lat ?? null,
    lon: snapshot.position?.lon ?? null,
    cogDeg: snapshot.cogDeg,
    sogMps: snapshot.sogMps,
    accuracyM: snapshot.accuracyM,
    observedAt: snapshot.observedAt,
    freshness: snapshot.freshness,
    confidence: snapshot.confidence,
    error: snapshot.error,
    track: source.track,
    clearTrack: source.clearTrack,
  };
}
