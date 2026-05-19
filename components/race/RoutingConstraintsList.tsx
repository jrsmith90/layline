import type { RaceCourseConstraintRecord } from "@/data/race/eventDatabase";
import {
  getConstraintActionCopy,
  getConstraintHeadline,
  getConstraintScopeCopy,
  getConstraintSecondaryDetail,
} from "@/lib/race/instructionConstraints";

type RoutingConstraintsListProps = {
  constraints: RaceCourseConstraintRecord[];
  compact?: boolean;
};

export function RoutingConstraintsList({
  constraints,
  compact = false,
}: RoutingConstraintsListProps) {
  if (constraints.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {constraints.map((constraint) => (
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
          </div>
          <div className="mt-2 text-sm font-semibold text-[color:var(--text)]">
            {getConstraintHeadline(constraint)}
          </div>
          {getConstraintSecondaryDetail(constraint) ? (
            <div className="mt-1 text-xs leading-5 text-[color:var(--text-soft)]">
              {getConstraintSecondaryDetail(constraint)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
