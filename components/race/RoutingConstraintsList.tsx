import type { RaceCourseConstraintRecord } from "@/data/race/eventDatabase";
import {
  getConstraintAssessmentLabel,
  type RaceConstraintAssessment,
} from "@/lib/race/legality";
import {
  getConstraintActionCopy,
  getConstraintHeadline,
  getConstraintScopeCopy,
  getConstraintSecondaryDetail,
} from "@/lib/race/instructionConstraints";

type RoutingConstraintsListProps = {
  constraints: RaceCourseConstraintRecord[];
  compact?: boolean;
  assessments?: RaceConstraintAssessment[];
};

function assessmentTone(status: RaceConstraintAssessment["status"]) {
  switch (status) {
    case "legal":
      return "border-emerald-400/35 bg-emerald-400/10 text-emerald-50";
    case "at_risk":
      return "border-amber-300/35 bg-amber-300/10 text-amber-50";
    case "violated":
      return "border-red-400/35 bg-red-400/10 text-red-100";
    case "advisory":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-50";
    default:
      return "border-white/15 bg-white/5 text-white/80";
  }
}

export function RoutingConstraintsList({
  constraints,
  compact = false,
  assessments = [],
}: RoutingConstraintsListProps) {
  if (constraints.length === 0) {
    return null;
  }

  const assessmentById = new Map(
    assessments.map((assessment) => [assessment.constraintId, assessment] as const),
  );

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {constraints.map((constraint) => {
        const assessment = assessmentById.get(constraint.id);

        return (
          <div
            key={constraint.id}
            className={
              compact
                ? "rounded-lg border border-white/10 bg-black/20 p-3"
                : "rounded-xl border border-[color:var(--divider)] bg-black/20 p-4"
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
                {getConstraintActionCopy(constraint)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                {getConstraintScopeCopy(constraint)}
              </span>
              {assessment ? (
                <span
                  className={[
                    "rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]",
                    assessmentTone(assessment.status),
                  ].join(" ")}
                >
                  {getConstraintAssessmentLabel(assessment.status)}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-sm font-semibold text-[color:var(--text)]">
              {getConstraintHeadline(constraint)}
            </div>
            {getConstraintSecondaryDetail(constraint) ? (
              <div className="mt-1 text-xs leading-5 text-[color:var(--text-soft)]">
                {getConstraintSecondaryDetail(constraint)}
              </div>
            ) : null}
            {assessment ? (
              <div className="mt-2 text-xs leading-5 text-[color:var(--text-soft)]">
                {assessment.detail}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
