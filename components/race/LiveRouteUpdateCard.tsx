type RouteBiasConfidence = "low" | "medium" | "high";

type PlanValidityState =
  | "on_plan"
  | "plan_weakening"
  | "plan_invalidated"
  | "new_edge_detected";

type TacticalUpdateAction =
  | "hold_course"
  | "stay_flexible"
  | "prepare_to_change_side_bias"
  | "change_side_bias";

type LiveRouteUpdateResult = {
  validityState: PlanValidityState;
  action: TacticalUpdateAction;
  confidence: RouteBiasConfidence;
  reasons: string[];
  warnings: string[];
  scoreDelta: {
    shore: number;
    bay: number;
  };
};

type LiveRouteUpdateCardProps = {
  update: LiveRouteUpdateResult | null;
  title?: string;
};

function formatValidityState(value: PlanValidityState): string {
  switch (value) {
    case "on_plan":
      return "On plan";
    case "plan_weakening":
      return "Plan weakening";
    case "plan_invalidated":
      return "Plan invalidated";
    case "new_edge_detected":
      return "New edge detected";
    default:
      return value;
  }
}

function formatAction(value: TacticalUpdateAction): string {
  switch (value) {
    case "hold_course":
      return "Hold course";
    case "stay_flexible":
      return "Stay flexible";
    case "prepare_to_change_side_bias":
      return "Prepare to change side bias";
    case "change_side_bias":
      return "Change side bias";
    default:
      return value;
  }
}

function formatConfidence(value: RouteBiasConfidence): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "0";
}

export default function LiveRouteUpdateCard({
  update,
  title = "Live route update"
}: LiveRouteUpdateCardProps) {
  if (!update) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-5">
        <div className="text-lg font-semibold">{title}</div>
        <p className="mt-2 text-sm text-white/70">
          No live update yet. Compare the latest conditions against the original plan to see whether the route bias still holds.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/60">
            {formatValidityState(update.validityState)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-white/60">Confidence</div>
          <div className="font-medium">{formatConfidence(update.confidence)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">Recommended action</div>
        <div className="mt-1 text-lg font-semibold">{formatAction(update.action)}</div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="text-sm text-white/60">Shore delta</div>
          <div className="text-lg font-semibold">{formatDelta(update.scoreDelta.shore)}</div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="text-sm text-white/60">Bay delta</div>
          <div className="text-lg font-semibold">{formatDelta(update.scoreDelta.bay)}</div>
        </div>
      </div>

      {update.reasons.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium">Reasons</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75">
            {update.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {update.warnings.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-amber-300">Warnings</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
            {update.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
