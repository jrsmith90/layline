import type { RaceCourseConstraintRecord } from "@/data/race/eventDatabase";
import type { CourseSummary, RaceMark } from "@/data/race/getCourseData";
import { distanceNm } from "@/lib/race/courseTracker";
import {
  getConstraintActionCopy,
  getConstraintHeadline,
  getConstraintsForLeg,
  isBoundaryConstraint,
  isMarkConstraint,
} from "@/lib/race/instructionConstraints";

type Position = {
  lat: number;
  lon: number;
};

type DirectedSide = "left" | "right" | "on_line";

export type RaceConstraintAssessmentStatus =
  | "legal"
  | "at_risk"
  | "violated"
  | "advisory"
  | "unknown";

export type RaceLegalityOverall = "clear" | "warning" | "violated" | "unknown";

export type RaceConstraintAssessment = {
  constraintId: string;
  constraint: RaceCourseConstraintRecord;
  status: RaceConstraintAssessmentStatus;
  headline: string;
  detail: string;
  metricNm: number | null;
};

export type RaceLegalityState = {
  overall: RaceLegalityOverall;
  summary: string;
  detail: string;
  activeConstraints: RaceConstraintAssessment[];
};

type DeriveRaceLegalityParams = {
  course: CourseSummary;
  safeLegIndex: number;
  boatPosition: Position | null;
  markApproachDistanceNm: number;
};

const MARK_SETUP_DISTANCE_NM = 0.18;
const MARK_SIDE_TOLERANCE_NM = 0.01;
const BOUNDARY_SIDE_TOLERANCE_NM = 0.005;
const BOUNDARY_BUFFER_NM = 0.03;

const STATUS_SCORE: Record<RaceConstraintAssessmentStatus, number> = {
  violated: 4,
  at_risk: 3,
  unknown: 2,
  advisory: 1,
  legal: 0,
};

function positionToLocalNm(origin: Position, point: Position) {
  const latScale = Math.cos((origin.lat * Math.PI) / 180);

  return {
    x: (point.lon - origin.lon) * 60 * latScale,
    y: (point.lat - origin.lat) * 60,
  };
}

function signedDistanceToDirectedLineNm(
  start: Position,
  end: Position,
  point: Position,
) {
  const endVector = positionToLocalNm(start, end);
  const pointVector = positionToLocalNm(start, point);
  const legLength = Math.hypot(endVector.x, endVector.y);

  if (legLength < 0.001) {
    return 0;
  }

  return (endVector.x * pointVector.y - endVector.y * pointVector.x) / legLength;
}

function distanceToSegmentNm(start: Position, end: Position, point: Position) {
  const endVector = positionToLocalNm(start, end);
  const pointVector = positionToLocalNm(start, point);
  const segmentLengthSq = endVector.x ** 2 + endVector.y ** 2;

  if (segmentLengthSq < 0.001) {
    return Math.hypot(pointVector.x, pointVector.y);
  }

  const projection =
    (pointVector.x * endVector.x + pointVector.y * endVector.y) / segmentLengthSq;
  const clamped = Math.min(1, Math.max(0, projection));
  const closest = {
    x: endVector.x * clamped,
    y: endVector.y * clamped,
  };

  return Math.hypot(pointVector.x - closest.x, pointVector.y - closest.y);
}

function classifyDirectedSide(
  signedDistanceNm: number,
  toleranceNm: number,
): DirectedSide {
  if (signedDistanceNm > toleranceNm) return "left";
  if (signedDistanceNm < -toleranceNm) return "right";
  return "on_line";
}

function toMarkPosition(mark: RaceMark | null) {
  return mark ? { lat: mark.lat, lon: mark.lon } : null;
}

function getRelevantConstraints(course: CourseSummary, safeLegIndex: number) {
  const activeLeg = course.course.legs[safeLegIndex] ?? null;
  const activeToMarkId = activeLeg?.toMark ?? null;
  const courseSequence = new Set(course.course.sequence ?? []);
  const relevant = new Map<string, RaceCourseConstraintRecord>();

  for (const constraint of getConstraintsForLeg(course, safeLegIndex)) {
    relevant.set(constraint.id, constraint);
  }

  if (activeToMarkId) {
    for (const constraint of course.specialRoutingConstraints) {
      if (
        isMarkConstraint(constraint) &&
        constraint.markKey === activeToMarkId &&
        !(constraint.legNumbers && constraint.legNumbers.length > 0)
      ) {
        relevant.set(constraint.id, constraint);
      }
    }
  }

  for (const constraint of course.specialRoutingConstraints) {
    if (!isBoundaryConstraint(constraint)) continue;

    const appliesNow =
      !(constraint.legNumbers && constraint.legNumbers.length > 0) ||
      constraint.legNumbers.includes(safeLegIndex + 1);
    const touchesCourse =
      !(constraint.boundaryMarkKeys && constraint.boundaryMarkKeys.length > 0) ||
      constraint.boundaryMarkKeys.some((markId) => courseSequence.has(markId));

    if (appliesNow && touchesCourse) {
      relevant.set(constraint.id, constraint);
    }
  }

  return Array.from(relevant.values());
}

function describeRequiredSide(side: Exclude<DirectedSide, "on_line">) {
  return side === "right" ? "starboard-side" : "port-side";
}

function evaluateMarkConstraint(params: {
  constraint: Extract<
    RaceCourseConstraintRecord,
    {
      type: "pass_on_channel_side" | "leave_to_port" | "leave_to_starboard";
    }
  >;
  course: CourseSummary;
  safeLegIndex: number;
  boatPosition: Position | null;
  markApproachDistanceNm: number;
}) {
  const headline = `${getConstraintActionCopy(params.constraint)} · ${getConstraintHeadline(params.constraint)}`;

  if (params.constraint.type === "pass_on_channel_side") {
    const mark =
      params.constraint.markKey ? params.course.marks[params.constraint.markKey] ?? null : null;
    const metricNm =
      params.boatPosition && mark ? distanceNm(params.boatPosition, toMarkPosition(mark)!) : null;

    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "advisory" as const,
      headline,
      detail:
        metricNm != null && metricNm <= Math.max(params.markApproachDistanceNm * 4, 0.25)
          ? "Channel-side rule is live here, but the legal side is not encoded in the course geometry yet."
          : "Channel-side rule remains visual-only until that mark gets a boundary reference in the course data.",
      metricNm,
    } satisfies RaceConstraintAssessment;
  }

  const activeLeg = params.course.course.legs[params.safeLegIndex] ?? null;
  if (!activeLeg || activeLeg.toMark !== params.constraint.markKey) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "This rounding rule is not tied to the active mark yet.",
      metricNm: null,
    } satisfies RaceConstraintAssessment;
  }

  const fromMark = params.course.marks[activeLeg.fromMark] ?? null;
  const toMark = params.course.marks[activeLeg.toMark] ?? null;

  if (!fromMark || !toMark || !params.boatPosition) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "Need live GPS plus complete leg geometry to verify the legal rounding side.",
      metricNm: null,
    } satisfies RaceConstraintAssessment;
  }

  const distanceToMarkNm = distanceNm(params.boatPosition, toMarkPosition(toMark)!);
  const setupDistanceNm = Math.max(
    params.markApproachDistanceNm * 2.5,
    MARK_SETUP_DISTANCE_NM,
  );
  const verifyDistanceNm = Math.max(params.markApproachDistanceNm, 0.05);
  const requiredSide: Exclude<DirectedSide, "on_line"> =
    params.constraint.type === "leave_to_port" ? "right" : "left";
  const signedSideNm = signedDistanceToDirectedLineNm(
    toMarkPosition(fromMark)!,
    toMarkPosition(toMark)!,
    params.boatPosition,
  );
  const approachSide = classifyDirectedSide(signedSideNm, MARK_SIDE_TOLERANCE_NM);
  const hasLegalSetup = approachSide === requiredSide;

  if (approachSide === "on_line") {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status:
        distanceToMarkNm <= verifyDistanceNm
          ? "violated"
          : distanceToMarkNm <= setupDistanceNm
            ? "at_risk"
            : "advisory",
      headline,
      detail: `Commit to the ${describeRequiredSide(requiredSide)} approach before the rounding circle closes.`,
      metricNm: distanceToMarkNm,
    } satisfies RaceConstraintAssessment;
  }

  if (!hasLegalSetup) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status:
        distanceToMarkNm <= verifyDistanceNm
          ? "violated"
          : distanceToMarkNm <= setupDistanceNm
            ? "at_risk"
            : "advisory",
      headline,
      detail: `Boat is ${approachSide} of the incoming leg. ${describeRequiredSide(requiredSide)} setup is required for this rounding.`,
      metricNm: distanceToMarkNm,
    } satisfies RaceConstraintAssessment;
  }

  return {
    constraintId: params.constraint.id,
    constraint: params.constraint,
    status: "legal",
    headline,
    detail:
      distanceToMarkNm <= setupDistanceNm
        ? `Boat is on the legal ${describeRequiredSide(requiredSide)} setup for this rounding.`
        : `Legal ${describeRequiredSide(requiredSide)} setup is already established.`,
    metricNm: distanceToMarkNm,
  } satisfies RaceConstraintAssessment;
}

function evaluateBoundaryConstraint(params: {
  constraint: Extract<
    RaceCourseConstraintRecord,
    {
      type: "stay_inside_marks" | "stay_outside_marks";
    }
  >;
  course: CourseSummary;
  boatPosition: Position | null;
}) {
  const headline = `${getConstraintActionCopy(params.constraint)} · ${getConstraintHeadline(params.constraint)}`;

  if (!params.boatPosition) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "Need live GPS to verify this boundary.",
      metricNm: null,
    } satisfies RaceConstraintAssessment;
  }

  if (
    !params.constraint.boundaryMarkKeys ||
    params.constraint.boundaryMarkKeys.length < 2 ||
    !params.constraint.referenceMarkKey
  ) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "Boundary geometry is missing the marks or reference side needed for a live check.",
      metricNm: null,
    } satisfies RaceConstraintAssessment;
  }

  const boundaryPoints = params.constraint.boundaryMarkKeys
    .map((markId) => params.course.marks[markId] ?? null)
    .filter((mark): mark is RaceMark => mark != null)
    .map((mark) => toMarkPosition(mark)!);
  const referenceMark = params.course.marks[params.constraint.referenceMarkKey] ?? null;

  if (boundaryPoints.length < 2 || !referenceMark) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "Boundary geometry is incomplete for this course.",
      metricNm: null,
    } satisfies RaceConstraintAssessment;
  }

  let nearestSegment:
    | {
        distanceNm: number;
        boatSignedNm: number;
        referenceSignedNm: number;
      }
    | null = null;

  const referencePosition = toMarkPosition(referenceMark)!;

  for (let index = 0; index < boundaryPoints.length - 1; index += 1) {
    const start = boundaryPoints[index];
    const end = boundaryPoints[index + 1];
    if (!start || !end) continue;

    const distanceNmValue = distanceToSegmentNm(start, end, params.boatPosition);
    const boatSignedNm = signedDistanceToDirectedLineNm(start, end, params.boatPosition);
    const referenceSignedNm = signedDistanceToDirectedLineNm(start, end, referencePosition);

    if (!nearestSegment || distanceNmValue < nearestSegment.distanceNm) {
      nearestSegment = {
        distanceNm: distanceNmValue,
        boatSignedNm,
        referenceSignedNm,
      };
    }
  }

  if (!nearestSegment) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "Could not project the boat against this boundary.",
      metricNm: null,
    } satisfies RaceConstraintAssessment;
  }

  const boatSide = classifyDirectedSide(
    nearestSegment.boatSignedNm,
    BOUNDARY_SIDE_TOLERANCE_NM,
  );
  const referenceSide = classifyDirectedSide(
    nearestSegment.referenceSignedNm,
    BOUNDARY_SIDE_TOLERANCE_NM,
  );

  if (referenceSide === "on_line") {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "unknown",
      headline,
      detail: "Boundary reference point sits on the line, so the legal side is ambiguous.",
      metricNm: nearestSegment.distanceNm,
    } satisfies RaceConstraintAssessment;
  }

  if (boatSide === "on_line") {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "at_risk",
      headline,
      detail: "Boat is on the boundary line. Give this limit a little margin before the next move.",
      metricNm: nearestSegment.distanceNm,
    } satisfies RaceConstraintAssessment;
  }

  const isLegalSide =
    params.constraint.type === "stay_inside_marks"
      ? boatSide === referenceSide
      : boatSide !== referenceSide;

  if (!isLegalSide) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "violated",
      headline,
      detail: `Boat has crossed to the wrong side of ${params.constraint.boundaryLabel}.`,
      metricNm: nearestSegment.distanceNm,
    } satisfies RaceConstraintAssessment;
  }

  if (nearestSegment.distanceNm <= BOUNDARY_BUFFER_NM) {
    return {
      constraintId: params.constraint.id,
      constraint: params.constraint,
      status: "at_risk",
      headline,
      detail: `Boat is legal, but only ${nearestSegment.distanceNm.toFixed(2)} nm off ${params.constraint.boundaryLabel}.`,
      metricNm: nearestSegment.distanceNm,
    } satisfies RaceConstraintAssessment;
  }

  return {
    constraintId: params.constraint.id,
    constraint: params.constraint,
    status: "legal",
    headline,
    detail: `Boat is on the legal side of ${params.constraint.boundaryLabel}.`,
    metricNm: nearestSegment.distanceNm,
  } satisfies RaceConstraintAssessment;
}

export function deriveRaceLegality(
  params: DeriveRaceLegalityParams,
): RaceLegalityState {
  const activeConstraints = getRelevantConstraints(params.course, params.safeLegIndex)
    .map((constraint) =>
      isMarkConstraint(constraint)
        ? evaluateMarkConstraint({
            constraint,
            course: params.course,
            safeLegIndex: params.safeLegIndex,
            boatPosition: params.boatPosition,
            markApproachDistanceNm: params.markApproachDistanceNm,
          })
        : evaluateBoundaryConstraint({
            constraint,
            course: params.course,
            boatPosition: params.boatPosition,
          }),
    )
    .sort((left, right) => {
      const scoreDelta = STATUS_SCORE[right.status] - STATUS_SCORE[left.status];
      if (scoreDelta !== 0) return scoreDelta;

      const leftMetric = left.metricNm ?? Number.POSITIVE_INFINITY;
      const rightMetric = right.metricNm ?? Number.POSITIVE_INFINITY;
      return leftMetric - rightMetric;
    });

  if (activeConstraints.length === 0) {
    return {
      overall: "clear",
      summary: "No live legality checks are active on this leg.",
      detail: "This leg does not have a structured rounding or boundary constraint in the course data.",
      activeConstraints,
    };
  }

  const violated = activeConstraints.find((assessment) => assessment.status === "violated");
  if (violated) {
    return {
      overall: "violated",
      summary: "A live race-instruction limit is currently breached.",
      detail: violated.detail,
      activeConstraints,
    };
  }

  const atRisk = activeConstraints.find((assessment) => assessment.status === "at_risk");
  if (atRisk) {
    return {
      overall: "warning",
      summary: "The legal lane is getting tight on this leg.",
      detail: atRisk.detail,
      activeConstraints,
    };
  }

  const unknown = activeConstraints.find((assessment) => assessment.status === "unknown");
  if (unknown) {
    return {
      overall: "unknown",
      summary: "Live legality is not fully verified yet.",
      detail: unknown.detail,
      activeConstraints,
    };
  }

  const advisory = activeConstraints.find((assessment) => assessment.status === "advisory");
  if (advisory) {
    return {
      overall: "clear",
      summary: "The active leg is legal, with a few instructions still visual-only.",
      detail: advisory.detail,
      activeConstraints,
    };
  }

  return {
    overall: "clear",
    summary: "Boat is inside the legal lane for the active instructions.",
    detail: activeConstraints[0]?.detail ?? "All active legality checks are green.",
    activeConstraints,
  };
}

export function getConstraintAssessmentLabel(status: RaceConstraintAssessmentStatus) {
  switch (status) {
    case "legal":
      return "Legal";
    case "at_risk":
      return "At Risk";
    case "violated":
      return "Violated";
    case "advisory":
      return "Advisory";
    default:
      return "Unknown";
  }
}

export function getLegalityOverallLabel(overall: RaceLegalityOverall) {
  switch (overall) {
    case "clear":
      return "Legal";
    case "warning":
      return "At Risk";
    case "violated":
      return "Violated";
    default:
      return "Unverified";
  }
}
