export type RaceSourcePermission = "unknown" | "granted" | "denied";
export type RaceSourceFreshness = "unknown" | "fresh" | "aging" | "stale";
export type RaceSourceConfidenceHint = "none" | "low" | "medium" | "high";
export type RaceInputSourceKind = "phone_gps" | "instrument_feed";

export type RaceInputTrackPoint = {
  at: string;
  lat: number;
  lon: number;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
};

export type RaceInputSourceSnapshot = {
  supported: boolean;
  enabled: boolean;
  permission: RaceSourcePermission;
  position: {
    lat: number;
    lon: number;
  } | null;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
  observedAt: string | null;
  freshness: RaceSourceFreshness;
  confidence: RaceSourceConfidenceHint;
  error?: string;
};

export interface RaceInputSourceDefinition {
  sourceId: string;
  kind: RaceInputSourceKind;
  label: string;
}

export type RaceInputSourceState = RaceInputSourceDefinition & {
  snapshot: RaceInputSourceSnapshot;
  track: RaceInputTrackPoint[];
  clearTrack: () => void;
};
