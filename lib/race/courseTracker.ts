import type { RaceLeg, RaceMark } from "@/data/race/getCourseData";

type Position = {
  lat: number;
  lon: number;
};

export type TackSide = "left" | "right";
export type MarkProgressCall =
  | "need_gps"
  | "set_wind"
  | "hold"
  | "prepare_tack"
  | "tack_now"
  | "overstood"
  | "not_progressing";

export type MarkProgressInput = {
  position: Position | null;
  cogDeg: number | null;
  sogMps: number | null;
  accuracyM: number | null;
  windFromDeg: number | null;
  tackAngleDeg: number;
  leg: RaceLeg;
  fromMark: RaceMark;
  toMark: RaceMark;
};

export type MarkProgressResult = {
  call: MarkProgressCall;
  headline: string;
  detail: string;
  warnings: string[];
  distanceToMarkNm: number | null;
  bearingToMarkDeg: number | null;
  vmgToMarkKt: number | null;
  crossTrackErrorNm: number | null;
  currentTack: TackSide | null;
  currentTackHeadingDeg: number | null;
  oppositeTackHeadingDeg: number | null;
  currentTackFetches: boolean;
  oppositeTackFetches: boolean;
  headingErrorDeg: number | null;
  oppositeHeadingErrorDeg: number | null;
  tackHeadingDeviationDeg: number | null;
  oppositeTackGainDeg: number | null;
  degreesOffLaylineDeg: number | null;
  nextTackHeadingDeg: number | null;
  distanceToTackNm: number | null;
  minutesToTack: number | null;
  distanceAfterTackNm: number | null;
};

const EARTH_RADIUS_NM = 3440.065;
const FETCH_WINDOW_DEG = 14;
const TACK_SOON_WINDOW_DEG = 8;
const DRASTIC_TACK_HEADING_CHANGE_DEG = 18;
const PREPARE_TACK_HEADING_CHANGE_DEG = 15;
const TACK_NOW_GAIN_DEG = 16;
const PREPARE_TACK_GAIN_DEG = 8;
const LOW_CONFIDENCE_ACCURACY_M = 35;
const LOW_CONFIDENCE_SOG_KT = 1.2;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

export function wrap360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function angleDiffDeg(fromDeg: number, toDegValue: number) {
  return ((((toDegValue - fromDeg) % 360) + 540) % 360) - 180;
}

export function absAngleDiffDeg(a: number, b: number) {
  return Math.abs(angleDiffDeg(a, b));
}

export function distanceNm(a: Position, b: Position) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_NM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearingDeg(a: Position, b: Position) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const deltaLon = toRad(b.lon - a.lon);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return wrap360(toDeg(Math.atan2(y, x)));
}

export function crossTrackErrorNm(start: Position, end: Position, point: Position) {
  const distanceStartToPointRad = distanceNm(start, point) / EARTH_RADIUS_NM;
  const bearingStartToPoint = toRad(bearingDeg(start, point));
  const bearingStartToEnd = toRad(bearingDeg(start, end));

  return Math.asin(
    Math.sin(distanceStartToPointRad) *
      Math.sin(bearingStartToPoint - bearingStartToEnd)
  ) * EARTH_RADIUS_NM;
}

function speedKt(sogMps: number | null) {
  return sogMps == null ? null : sogMps * 1.943844;
}

function getTackHeadings(windFromDeg: number, tackAngleDeg: number) {
  return {
    left: wrap360(windFromDeg - tackAngleDeg),
    right: wrap360(windFromDeg + tackAngleDeg),
  };
}

function getNearestTack(cogDeg: number, windFromDeg: number, tackAngleDeg: number) {
  const headings = getTackHeadings(windFromDeg, tackAngleDeg);
  const leftError = absAngleDiffDeg(cogDeg, headings.left);
  const rightError = absAngleDiffDeg(cogDeg, headings.right);
  const currentTack: TackSide = leftError <= rightError ? "left" : "right";
  const oppositeTack: TackSide = currentTack === "left" ? "right" : "left";

  return {
    currentTack,
    oppositeTack,
    currentHeading: headings[currentTack],
    oppositeHeading: headings[oppositeTack],
  };
}

function headingVector(headingDeg: number) {
  const rad = toRad(headingDeg);
  return {
    x: Math.sin(rad),
    y: Math.cos(rad),
  };
}

function positionToLocalNm(origin: Position, point: Position) {
  return {
    x: (point.lon - origin.lon) * 60 * Math.cos(toRad(origin.lat)),
    y: (point.lat - origin.lat) * 60,
  };
}

function calculateTackToLayline(params: {
  position: Position;
  target: Position;
  currentHeadingDeg: number;
  nextHeadingDeg: number;
  sogKt: number | null;
}) {
  const targetVector = positionToLocalNm(params.position, params.target);
  const current = headingVector(params.currentHeadingDeg);
  const next = headingVector(params.nextHeadingDeg);
  const determinant = current.x * next.y - current.y * next.x;

  if (Math.abs(determinant) < 0.001) return null;

  const distanceToTackNm =
    (targetVector.x * next.y - targetVector.y * next.x) / determinant;
  const distanceAfterTackNm =
    (current.x * targetVector.y - current.y * targetVector.x) / determinant;

  if (distanceToTackNm < 0 || distanceAfterTackNm < 0) return null;

  return {
    distanceToTackNm,
    minutesToTack:
      params.sogKt == null || params.sogKt <= 0
        ? null
        : (distanceToTackNm / params.sogKt) * 60,
    distanceAfterTackNm,
  };
}

export function calculateMarkProgress(input: MarkProgressInput): MarkProgressResult {
  const { position, cogDeg, sogMps, accuracyM, windFromDeg, tackAngleDeg, fromMark, toMark } = input;

  if (!position || cogDeg == null) {
    return {
      call: "need_gps",
      headline: "Turn on Phone GPS",
      detail: "Live position and COG are needed before Layline can judge progress to the mark.",
      warnings: [],
      distanceToMarkNm: null,
      bearingToMarkDeg: null,
      vmgToMarkKt: null,
      crossTrackErrorNm: null,
      currentTack: null,
      currentTackHeadingDeg: null,
      oppositeTackHeadingDeg: null,
      currentTackFetches: false,
      oppositeTackFetches: false,
      headingErrorDeg: null,
      oppositeHeadingErrorDeg: null,
      tackHeadingDeviationDeg: null,
      oppositeTackGainDeg: null,
      degreesOffLaylineDeg: null,
      nextTackHeadingDeg: null,
      distanceToTackNm: null,
      minutesToTack: null,
      distanceAfterTackNm: null,
    };
  }

  const target = { lat: toMark.lat, lon: toMark.lon };
  const start = { lat: fromMark.lat, lon: fromMark.lon };
  const distanceToMark = distanceNm(position, target);
  const bearingToMark = bearingDeg(position, target);
  const headingError = absAngleDiffDeg(cogDeg, bearingToMark);
  const sogKt = speedKt(sogMps);
  const vmgToMark = sogKt == null ? null : sogKt * Math.cos(toRad(headingError));
  const crossTrack = crossTrackErrorNm(start, target, position);
  const warnings: string[] = [];

  if (accuracyM != null && accuracyM > LOW_CONFIDENCE_ACCURACY_M) {
    warnings.push(`Low GPS confidence: accuracy is about ${Math.round(accuracyM)} m.`);
  }

  if (sogKt != null && sogKt < LOW_CONFIDENCE_SOG_KT) {
    warnings.push("Low SOG: COG may be unstable until the boat is moving.");
  }

  if (windFromDeg == null) {
    return {
      call: "set_wind",
      headline: "Set wind direction",
      detail: "COG and distance are live. Add wind direction to make tack and layline calls.",
      warnings,
      distanceToMarkNm: distanceToMark,
      bearingToMarkDeg: bearingToMark,
      vmgToMarkKt: vmgToMark,
      crossTrackErrorNm: crossTrack,
      currentTack: null,
      currentTackHeadingDeg: null,
      oppositeTackHeadingDeg: null,
      currentTackFetches: false,
      oppositeTackFetches: false,
      headingErrorDeg: headingError,
      oppositeHeadingErrorDeg: null,
      tackHeadingDeviationDeg: null,
      oppositeTackGainDeg: null,
      degreesOffLaylineDeg: headingError,
      nextTackHeadingDeg: null,
      distanceToTackNm: null,
      minutesToTack: null,
      distanceAfterTackNm: null,
    };
  }

  const tack = getNearestTack(cogDeg, windFromDeg, tackAngleDeg);
  const currentHeadingError = absAngleDiffDeg(tack.currentHeading, bearingToMark);
  const oppositeHeadingError = absAngleDiffDeg(tack.oppositeHeading, bearingToMark);
  const currentTackFetches = currentHeadingError <= FETCH_WINDOW_DEG;
  const oppositeTackFetches = oppositeHeadingError <= FETCH_WINDOW_DEG;
  const tackHeadingDeviation = absAngleDiffDeg(cogDeg, tack.currentHeading);
  const oppositeTackGain = headingError - oppositeHeadingError;
  const makingPoorProgress = vmgToMark != null && vmgToMark < 0.4;
  const tackPlan = calculateTackToLayline({
    position,
    target,
    currentHeadingDeg: tack.currentHeading,
    nextHeadingDeg: tack.oppositeHeading,
    sogKt,
  });

  let call: MarkProgressCall = "hold";
  let headline = "Hold this tack";
  let detail =
    "You are making useful progress. Keep speed on and re-check the layline as the bearing changes.";

  if (vmgToMark != null && vmgToMark < -0.2) {
    call = "not_progressing";
    headline = "Not making progress";
    detail =
      "Your COG is taking you away from the mark. Bear away for speed or tack if the opposite tack points closer.";
  } else if (currentTackFetches && headingError > FETCH_WINDOW_DEG + 10) {
    call = "overstood";
    headline = "Likely overstood";
    detail =
      "The mark is inside your current layline, but your actual COG is wide. Foot fast and avoid adding extra distance.";
  } else if (oppositeTackFetches && !currentTackFetches) {
    call = "tack_now";
    headline = "Tack now";
    detail =
      "The opposite tack is the one that fetches the mark. Tack while you still have room and speed.";
  } else if (
    tackHeadingDeviation >= DRASTIC_TACK_HEADING_CHANGE_DEG &&
    oppositeTackGain >= TACK_NOW_GAIN_DEG
  ) {
    call = "tack_now";
    headline = "Tack now";
    detail =
      "Your COG has fallen well away from the expected tack heading, and the opposite tack points much closer to the mark.";
  } else if (oppositeHeadingError + TACK_SOON_WINDOW_DEG < currentHeadingError) {
    call = "prepare_tack";
    headline = "Prepare to tack";
    detail =
      "The opposite tack is lining up better. Build speed, find a clear lane, and tack if this trend holds.";
  } else if (
    tackHeadingDeviation >= PREPARE_TACK_HEADING_CHANGE_DEG &&
    oppositeTackGain >= PREPARE_TACK_GAIN_DEG
  ) {
    call = "prepare_tack";
    headline = "Prepare to tack";
    detail =
      "Your heading has changed sharply from the expected tack angle. Get ready if the opposite tack keeps aiming closer to the mark.";
  } else if (makingPoorProgress) {
    call = "prepare_tack";
    headline = "Progress is weak";
    detail =
      "SOG may be okay, but VMG to the mark is low. Shift to a faster mode or prepare to change tacks.";
  }

  if (warnings.length > 0 && call === "hold") {
    detail =
      "Hold only if the boat feels settled. The live call has reduced confidence from GPS or speed data.";
  }

  return {
    call,
    headline,
    detail,
    warnings,
    distanceToMarkNm: distanceToMark,
    bearingToMarkDeg: bearingToMark,
    vmgToMarkKt: vmgToMark,
    crossTrackErrorNm: crossTrack,
    currentTack: tack.currentTack,
    currentTackHeadingDeg: tack.currentHeading,
    oppositeTackHeadingDeg: tack.oppositeHeading,
    currentTackFetches,
    oppositeTackFetches,
    headingErrorDeg: currentHeadingError,
    oppositeHeadingErrorDeg: oppositeHeadingError,
    tackHeadingDeviationDeg: tackHeadingDeviation,
    oppositeTackGainDeg: oppositeTackGain,
    degreesOffLaylineDeg: currentHeadingError,
    nextTackHeadingDeg: tack.oppositeHeading,
    distanceToTackNm: tackPlan?.distanceToTackNm ?? null,
    minutesToTack: tackPlan?.minutesToTack ?? null,
    distanceAfterTackNm: tackPlan?.distanceAfterTackNm ?? null,
  };
}
