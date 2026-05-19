import type { OpeningLegType } from "@/data/race/getRouteBiasInputs";
import type { RaceCourseConstraintRecord } from "@/data/race/eventDatabase";
import type { CourseSummary } from "@/data/race/getCourseData";

export function isMarkConstraint(
  constraint: RaceCourseConstraintRecord,
): constraint is Extract<
  RaceCourseConstraintRecord,
  {
    type: "pass_on_channel_side" | "leave_to_port" | "leave_to_starboard";
  }
> {
  return constraint.type === "pass_on_channel_side" ||
    constraint.type === "leave_to_port" ||
    constraint.type === "leave_to_starboard";
}

export function isBoundaryConstraint(
  constraint: RaceCourseConstraintRecord,
): constraint is Extract<
  RaceCourseConstraintRecord,
  {
    type: "stay_inside_marks" | "stay_outside_marks";
  }
> {
  return constraint.type === "stay_inside_marks" ||
    constraint.type === "stay_outside_marks";
}

export function getConstraintActionCopy(constraint: RaceCourseConstraintRecord) {
  switch (constraint.type) {
    case "leave_to_port":
      return "Round to port";
    case "leave_to_starboard":
      return "Round to starboard";
    case "pass_on_channel_side":
      return "Pass on channel side";
    case "stay_inside_marks":
      return "Stay inside boundary";
    case "stay_outside_marks":
      return "Stay outside boundary";
    default:
      return "Routing rule";
  }
}

export function getConstraintScopeCopy(constraint: RaceCourseConstraintRecord) {
  switch (constraint.appliesTo) {
    case "all_keelboat_classes":
      return "All keelboat classes";
    case "selected_course":
      return "Selected course";
    default:
      return "Race instruction";
  }
}

export function getConstraintHeadline(constraint: RaceCourseConstraintRecord) {
  if (isMarkConstraint(constraint)) {
    return `${constraint.markLabel} · ${constraint.markName}`;
  }

  return `${constraint.boundaryLabel} · ${constraint.boundaryMarks.join(" -> ")}`;
}

export function getConstraintBadge(constraint: RaceCourseConstraintRecord) {
  switch (constraint.type) {
    case "leave_to_port":
      return "P";
    case "leave_to_starboard":
      return "S";
    case "pass_on_channel_side":
      return "CS";
    case "stay_inside_marks":
      return "IN";
    case "stay_outside_marks":
      return "OUT";
    default:
      return "RI";
  }
}

export function getConstraintSecondaryDetail(constraint: RaceCourseConstraintRecord) {
  const legDetail =
    constraint.legNumbers && constraint.legNumbers.length > 0
      ? `Leg ${constraint.legNumbers.join(", ")}`
      : null;

  if (constraint.detail && legDetail) {
    return `${legDetail}. ${constraint.detail}`;
  }

  return constraint.detail ?? legDetail;
}

export function getConstraintsForMark(course: CourseSummary, markId: string) {
  return course.specialRoutingConstraints.filter(
    (constraint) => isMarkConstraint(constraint) && constraint.markKey === markId,
  );
}

export function getConstraintsForLeg(course: CourseSummary, legIndex: number) {
  const legNumber = legIndex + 1;

  return course.specialRoutingConstraints.filter((constraint) =>
    constraint.legNumbers?.includes(legNumber),
  );
}

function formatMarkList(constraints: ReturnType<typeof getConstraintsForMark>) {
  if (constraints.length === 0) return "";

  return constraints
    .map((constraint) =>
      isMarkConstraint(constraint) ? constraint.markLabel : "",
    )
    .filter((label) => label.length > 0)
    .join(", ");
}

export function summarizeConstraintImpact(
  course: CourseSummary,
  openingLegType: OpeningLegType,
) {
  const openingLegConstraints = getConstraintsForLeg(course, 0);
  const channelSideConstraints = course.specialRoutingConstraints.filter(
    (constraint) => constraint.type === "pass_on_channel_side",
  );
  const boundaryConstraints = course.specialRoutingConstraints.filter(isBoundaryConstraint);
  const warnings: string[] = [];
  const reasons: string[] = [];
  let confidencePenalty = 0;

  if (course.specialRoutingConstraints.length > 0) {
    reasons.push(
      "Race instructions narrow the legal lanes, so the opening call has to stay legal as well as fast.",
    );
  }

  if (openingLegConstraints.length > 0) {
    warnings.push(
      `Leg 1 finishes with ${openingLegConstraints
        .map((constraint) => `${getConstraintActionCopy(constraint).toLowerCase()} at ${getConstraintHeadline(constraint)}`)
        .join("; ")}.`,
    );
    confidencePenalty = 1;
  }

  if (channelSideConstraints.length > 0) {
    warnings.push(
      `Channel-side limits remain in force at ${formatMarkList(channelSideConstraints)}.`,
    );
    confidencePenalty = 1;
  }

  if (boundaryConstraints.length > 0) {
    warnings.push(
      `Course boundary limits apply: ${boundaryConstraints
        .map((constraint) => constraint.boundaryLabel)
        .join(", ")}.`,
    );
    confidencePenalty = 1;
  }

  if (
    openingLegType !== "mostly_upwind" &&
    openingLegType !== "close_reach" &&
    openingLegConstraints.length > 0
  ) {
    warnings.push(
      "A freer opening leg plus a defined rounding side can make the side call less decisive than the legal approach lane.",
    );
    confidencePenalty = 1;
  }

  return {
    reasons,
    warnings,
    confidencePenalty,
    openingLegConstraints,
    channelSideConstraints,
    boundaryConstraints,
  };
}
