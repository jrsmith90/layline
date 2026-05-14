import type {
  DeriveRaceStateInput,
  RaceState,
  RaceStateConfidenceLevel,
  RaceStateConfidenceSignal,
  RaceStateSourceConfidenceHint,
  RaceStateSourceFreshness,
  RaceStateSourceStatus,
} from "./types";

const LOW_CONFIDENCE_ACCURACY_M = 35;
const LOW_CONFIDENCE_SOG_KT = 1.2;
const GPS_AGING_MS = 5000;
const GPS_STALE_MS = 15000;
const WIND_AGING_MS = 10 * 60 * 1000;
const WIND_STALE_MS = 30 * 60 * 1000;

const CONFIDENCE_SCORE: Record<RaceStateConfidenceLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function speedKt(sogMps: number | null) {
  return sogMps == null ? null : sogMps * 1.943844;
}

function ageMs(observedAt: string | null, nowMs: number) {
  if (!observedAt) return null;

  const observedAtMs = new Date(observedAt).getTime();
  if (Number.isNaN(observedAtMs)) return null;

  return Math.max(0, nowMs - observedAtMs);
}

function deriveFreshness(params: {
  observedAt: string | null;
  nowMs: number;
  agingMs: number;
  staleMs: number;
}): RaceStateSourceFreshness {
  const nextAgeMs = ageMs(params.observedAt, params.nowMs);

  if (nextAgeMs == null) return "unknown";
  if (nextAgeMs <= params.agingMs) return "fresh";
  if (nextAgeMs <= params.staleMs) return "aging";
  return "stale";
}

function formatAge(value: number | null) {
  if (value == null) return "unknown";
  if (value < 90_000) {
    return `${Math.max(1, Math.round(value / 1000))} s`;
  }

  return `${Math.max(1, Math.round(value / 60_000))} min`;
}

function minConfidence(
  ...levels: RaceStateConfidenceLevel[]
): RaceStateConfidenceLevel {
  let lowest = levels[0] ?? "high";

  for (const level of levels) {
    if (CONFIDENCE_SCORE[level] < CONFIDENCE_SCORE[lowest]) {
      lowest = level;
    }
  }

  return lowest;
}

function deriveGpsStatus(input: DeriveRaceStateInput): RaceStateSourceStatus {
  if (!input.gps.supported) return "unavailable";
  if (input.gps.permission === "denied") return "denied";
  if (!input.gps.enabled) return "unavailable";
  if (input.gps.lat == null || input.gps.lon == null || input.gps.cogDeg == null) {
    return "missing";
  }

  return "live";
}

function deriveWindStatus(input: DeriveRaceStateInput): RaceStateSourceStatus {
  if (input.wind.directionFromDeg == null) return "missing";
  return input.wind.sourceMode === "manual" ? "manual" : "live";
}

function deriveGpsConfidenceHint(params: {
  status: RaceStateSourceStatus;
  freshness: RaceStateSourceFreshness;
  accuracyM: number | null;
  sogMps: number | null;
}): RaceStateSourceConfidenceHint {
  if (params.status !== "live") return "none";
  if (params.freshness === "stale") return "low";
  if (params.freshness === "aging") return "medium";
  if (params.accuracyM != null && params.accuracyM > LOW_CONFIDENCE_ACCURACY_M) {
    return "low";
  }

  const sogKt = speedKt(params.sogMps);
  if (sogKt != null && sogKt < LOW_CONFIDENCE_SOG_KT) {
    return "low";
  }

  return "high";
}

function deriveWindConfidenceHint(params: {
  status: RaceStateSourceStatus;
  freshness: RaceStateSourceFreshness;
}): RaceStateSourceConfidenceHint {
  if (params.status === "missing") return "none";
  if (params.status === "manual") return "medium";
  if (params.freshness === "stale") return "low";
  if (params.freshness === "aging") return "medium";
  return "high";
}

function deriveConfidence(params: {
  courseReady: boolean;
  gpsStatus: RaceStateSourceStatus;
  windStatus: RaceStateSourceStatus;
  gpsFreshness: RaceStateSourceFreshness;
  gpsAgeMs: number | null;
  windFreshness: RaceStateSourceFreshness;
  windAgeMs: number | null;
  accuracyM: number | null;
  sogMps: number | null;
}) {
  const signals: RaceStateConfidenceSignal[] = [];

  let courseConfidence: RaceStateConfidenceLevel = params.courseReady ? "high" : "none";
  let gpsConfidence: RaceStateConfidenceLevel = "high";
  let windConfidence: RaceStateConfidenceLevel = "high";
  const performanceConfidence: RaceStateConfidenceLevel = "medium";

  if (!params.courseReady) {
    signals.push({
      key: "course_missing_active_leg",
      source: "course",
      level: "none",
      message: "Course is selected, but the active leg or mark data is incomplete.",
    });
    courseConfidence = "none";
  }

  if (params.gpsStatus === "denied") {
    signals.push({
      key: "gps_denied",
      source: "gps",
      level: "none",
      message: "Phone GPS permission is denied.",
    });
    gpsConfidence = "none";
  } else if (params.gpsStatus === "missing" || params.gpsStatus === "unavailable") {
    signals.push({
      key: "gps_missing_course_over_ground",
      source: "gps",
      level: "none",
      message: "Live position and COG are not ready yet.",
    });
    gpsConfidence = "none";
  } else {
    if (params.gpsFreshness === "stale") {
      signals.push({
        key: "gps_stale_feed",
        source: "gps",
        level: "low",
        message: `Phone GPS has not refreshed for about ${formatAge(params.gpsAgeMs)}.`,
      });
      gpsConfidence = "low";
    } else if (params.gpsFreshness === "aging") {
      signals.push({
        key: "gps_aging_feed",
        source: "gps",
        level: "medium",
        message: `Phone GPS is aging at about ${formatAge(params.gpsAgeMs)} since the last fix.`,
      });
      gpsConfidence = minConfidence(gpsConfidence, "medium");
    }

    if (params.accuracyM != null && params.accuracyM > LOW_CONFIDENCE_ACCURACY_M) {
      signals.push({
        key: "gps_low_accuracy",
        source: "gps",
        level: "low",
        message: `GPS accuracy is currently about ${Math.round(params.accuracyM)} m.`,
      });
      gpsConfidence = "low";
    }

    const sogKt = speedKt(params.sogMps);
    if (sogKt != null && sogKt < LOW_CONFIDENCE_SOG_KT) {
      signals.push({
        key: "gps_low_speed",
        source: "gps",
        level: "low",
        message: "Boat speed is low, so COG may still be unstable.",
      });
      gpsConfidence = "low";
    }
  }

  if (params.windStatus === "missing") {
    signals.push({
      key: "wind_missing_direction",
      source: "wind",
      level: "low",
      message: "Wind direction is not set, so tack and layline calls are incomplete.",
    });
    windConfidence = "low";
  } else if (params.windStatus === "manual") {
    signals.push({
      key: "wind_manual_override",
      source: "wind",
      level: "medium",
      message: "Wind direction is currently a manual override.",
    });
    windConfidence = "medium";
  }

  if (params.windStatus !== "missing") {
    if (params.windFreshness === "stale") {
      signals.push({
        key: "wind_stale_observation",
        source: "wind",
        level: "low",
        message: `Wind observation is about ${formatAge(params.windAgeMs)} old.`,
      });
      windConfidence = minConfidence(windConfidence, "low");
    } else if (params.windFreshness === "aging") {
      signals.push({
        key: "wind_aging_observation",
        source: "wind",
        level: "medium",
        message: `Wind observation is aging at about ${formatAge(params.windAgeMs)} old.`,
      });
      windConfidence = minConfidence(windConfidence, "medium");
    }
  }

  const overall = minConfidence(
    courseConfidence,
    gpsConfidence,
    windConfidence,
    performanceConfidence,
  );

  return {
    overall,
    gps: gpsConfidence,
    wind: windConfidence,
    course: courseConfidence,
    performance: performanceConfidence,
    signals,
  };
}

export function deriveRaceState(input: DeriveRaceStateInput): RaceState {
  const now = new Date(input.now ?? Date.now());
  const nowMs = now.getTime();
  const totalLegs = input.courseData.course.legs.length;
  const safeLegIndex =
    totalLegs === 0 ? 0 : Math.min(Math.max(input.legIndex, 0), totalLegs - 1);
  const activeLeg = input.courseData.course.legs[safeLegIndex] ?? null;
  const fromMark = activeLeg
    ? input.courseData.marks[activeLeg.fromMark] ?? null
    : null;
  const toMark = activeLeg ? input.courseData.marks[activeLeg.toMark] ?? null : null;
  const gpsStatus = deriveGpsStatus(input);
  const windStatus = deriveWindStatus(input);
  const gpsObservedAt = input.gps.observedAt ?? null;
  const windObservedAt = input.wind.observedAt ?? null;
  const gpsAgeMs = ageMs(gpsObservedAt, nowMs);
  const windAgeMs = ageMs(windObservedAt, nowMs);
  const gpsFreshness =
    input.gps.freshness ??
    deriveFreshness({
      observedAt: gpsObservedAt,
      nowMs,
      agingMs: GPS_AGING_MS,
      staleMs: GPS_STALE_MS,
    });
  const windFreshness =
    input.wind.freshness ??
    deriveFreshness({
      observedAt: windObservedAt,
      nowMs,
      agingMs: WIND_AGING_MS,
      staleMs: WIND_STALE_MS,
    });
  const gpsConfidenceHint =
    input.gps.confidence ??
    deriveGpsConfidenceHint({
      status: gpsStatus,
      freshness: gpsFreshness,
      accuracyM: input.gps.accuracyM,
      sogMps: input.gps.sogMps,
    });
  const windConfidenceHint =
    input.wind.confidence ??
    deriveWindConfidenceHint({
      status: windStatus,
      freshness: windFreshness,
    });

  return {
    generatedAt: now.toISOString(),
    boat: {
      position:
        input.gps.lat == null || input.gps.lon == null
          ? null
          : {
              lat: input.gps.lat,
              lon: input.gps.lon,
            },
      cogDeg: input.gps.cogDeg,
      sogMps: input.gps.sogMps,
      accuracyM: input.gps.accuracyM,
      observedAt: gpsObservedAt,
    },
    wind: {
      directionFromDeg: input.wind.directionFromDeg,
      avgKt: input.wind.avgKt ?? null,
      gustKt: input.wind.gustKt ?? null,
      observedAt: windObservedAt,
      sourceMode: input.wind.sourceMode ?? "unknown",
      sourceLabel: input.wind.sourceLabel ?? "Wind",
      sourceDetail: input.wind.sourceDetail ?? "",
      isManual: input.wind.sourceMode === "manual",
    },
    performance: {
      tackAngleDeg: input.performance.tackAngleDeg,
      standardTackAngleDeg: input.performance.standardTackAngleDeg ?? null,
    },
    course: {
      selectedCourseId: input.courseId,
      summary: input.courseData,
      legIndex: input.legIndex,
      safeLegIndex,
      activeLeg,
      fromMark,
      toMark,
      totalLegs,
      canGoPrev: safeLegIndex > 0,
      canGoNext: safeLegIndex < totalLegs - 1,
      markApproachDistanceNm: input.markApproachDistanceNm ?? 0.08,
    },
    sources: {
      gps: {
        kind: "phone_gps",
        status: gpsStatus,
        enabled: Boolean(input.gps.enabled),
        supported: Boolean(input.gps.supported),
        permission: input.gps.permission ?? "unknown",
        observedAt: gpsObservedAt,
        ageMs: gpsAgeMs,
        freshness: gpsFreshness,
        confidenceHint: gpsConfidenceHint,
        error: input.gps.error,
      },
      wind: {
        kind: "wind",
        status: windStatus,
        mode: input.wind.sourceMode ?? "unknown",
        label: input.wind.sourceLabel ?? "Wind",
        detail: input.wind.sourceDetail ?? "",
        observedAt: windObservedAt,
        ageMs: windAgeMs,
        freshness: windFreshness,
        confidenceHint: windConfidenceHint,
      },
    },
    confidence: deriveConfidence({
      courseReady: Boolean(activeLeg && fromMark && toMark),
      gpsStatus,
      windStatus,
      gpsFreshness,
      gpsAgeMs,
      windFreshness,
      windAgeMs,
      accuracyM: input.gps.accuracyM,
      sogMps: input.gps.sogMps,
    }),
  };
}
