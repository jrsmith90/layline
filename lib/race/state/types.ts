import type { CourseSummary, RaceLeg, RaceMark } from "@/data/race/getCourseData";
import type { MarkProgressCall, MarkProgressResult } from "@/lib/race/courseTracker";
import type {
  RaceSourceConfidenceHint,
  RaceSourceFreshness,
  RaceSourcePermission,
} from "@/lib/race/dataSources/types";

export type RaceStateConfidenceLevel = "none" | "low" | "medium" | "high";
export type RaceStateConfidenceSource =
  | "gps"
  | "wind"
  | "course"
  | "performance";
export type RaceStateSourceStatus =
  | "live"
  | "manual"
  | "missing"
  | "denied"
  | "unavailable";
export type RaceStateWindSourceMode =
  | "nearest"
  | "top"
  | "bottom"
  | "river"
  | "manual"
  | "unknown";
export type RaceStateGpsPermission = RaceSourcePermission;
export type RaceStateSourceFreshness = RaceSourceFreshness;
export type RaceStateSourceConfidenceHint = RaceSourceConfidenceHint;

export type RaceStatePosition = {
  lat: number;
  lon: number;
};

export type RaceStateBoatState = {
  position: RaceStatePosition | null;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
  observedAt: string | null;
};

export type RaceStateWindState = {
  directionFromDeg: number | null;
  avgKt: number | null;
  gustKt: number | null;
  observedAt: string | null;
  sourceMode: RaceStateWindSourceMode;
  sourceLabel: string;
  sourceDetail: string;
  isManual: boolean;
};

export type RaceStatePerformanceState = {
  tackAngleDeg: number;
  standardTackAngleDeg: number | null;
};

export type RaceStateCourseState = {
  selectedCourseId: string;
  summary: CourseSummary;
  legIndex: number;
  safeLegIndex: number;
  activeLeg: RaceLeg | null;
  fromMark: RaceMark | null;
  toMark: RaceMark | null;
  totalLegs: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  markApproachDistanceNm: number;
};

export type RaceStateSourceMeta = {
  gps: {
    kind: "phone_gps";
    status: RaceStateSourceStatus;
    enabled: boolean;
    supported: boolean;
    permission: RaceStateGpsPermission;
    observedAt: string | null;
    ageMs: number | null;
    freshness: RaceStateSourceFreshness;
    confidenceHint: RaceStateSourceConfidenceHint;
    error?: string;
  };
  wind: {
    kind: "wind";
    status: RaceStateSourceStatus;
    mode: RaceStateWindSourceMode;
    label: string;
    detail: string;
    observedAt: string | null;
    ageMs: number | null;
    freshness: RaceStateSourceFreshness;
    confidenceHint: RaceStateSourceConfidenceHint;
  };
};

export type RaceStateConfidenceSignal = {
  key: string;
  source: RaceStateConfidenceSource;
  level: RaceStateConfidenceLevel;
  message: string;
};

export type RaceStateConfidence = {
  overall: RaceStateConfidenceLevel;
  gps: RaceStateConfidenceLevel;
  wind: RaceStateConfidenceLevel;
  course: RaceStateConfidenceLevel;
  performance: RaceStateConfidenceLevel;
  signals: RaceStateConfidenceSignal[];
};

export type RaceState = {
  generatedAt: string;
  boat: RaceStateBoatState;
  wind: RaceStateWindState;
  performance: RaceStatePerformanceState;
  course: RaceStateCourseState;
  sources: RaceStateSourceMeta;
  confidence: RaceStateConfidence;
};

export type RaceStateSnapshotProgress = Pick<
  MarkProgressResult,
  | "call"
  | "headline"
  | "detail"
  | "warnings"
  | "distanceToMarkNm"
  | "bearingToMarkDeg"
  | "vmgToMarkKt"
  | "crossTrackErrorNm"
  | "currentTack"
  | "currentTackHeadingDeg"
  | "oppositeTackHeadingDeg"
  | "currentTackFetches"
  | "oppositeTackFetches"
  | "degreesOffLaylineDeg"
  | "nextTackHeadingDeg"
  | "distanceToTackNm"
  | "minutesToTack"
>;

export type RaceStateSnapshotCourseState = Pick<
  RaceStateCourseState,
  | "selectedCourseId"
  | "legIndex"
  | "safeLegIndex"
  | "totalLegs"
  | "markApproachDistanceNm"
> & {
  activeLeg: RaceLeg | null;
  fromMark: RaceMark | null;
  toMark: RaceMark | null;
};

export type RaceStateSnapshot = {
  capturedAtISO: string;
  stateGeneratedAt: string;
  primaryCall: MarkProgressCall | "approach";
  approachingMark: boolean;
  boat: RaceStateBoatState;
  wind: RaceStateWindState;
  performance: RaceStatePerformanceState;
  course: RaceStateSnapshotCourseState;
  sources: RaceStateSourceMeta;
  confidence: RaceStateConfidence;
  progress: RaceStateSnapshotProgress | null;
};

export type DeriveRaceStateInput = {
  courseId: string;
  courseData: CourseSummary;
  legIndex: number;
  markApproachDistanceNm?: number;
  gps: {
    enabled?: boolean;
    supported?: boolean;
    permission?: RaceStateGpsPermission;
    lat: number | null;
    lon: number | null;
    cogDeg: number | null;
    sogMps: number | null;
    accuracyM: number | null;
    observedAt?: string | null;
    freshness?: RaceStateSourceFreshness;
    confidence?: RaceStateSourceConfidenceHint;
    error?: string;
  };
  wind: {
    sourceMode?: RaceStateWindSourceMode;
    sourceLabel?: string;
    sourceDetail?: string;
    directionFromDeg: number | null;
    avgKt?: number | null;
    gustKt?: number | null;
    observedAt?: string | null;
    freshness?: RaceStateSourceFreshness;
    confidence?: RaceStateSourceConfidenceHint;
  };
  performance: {
    tackAngleDeg: number;
    standardTackAngleDeg?: number | null;
  };
  now?: Date | string | number;
};
