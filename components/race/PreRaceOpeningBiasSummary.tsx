"use client";

import LiveRouteUpdateCard from "@/components/race/LiveRouteUpdateCard";
import {
  formatOpeningBiasAction,
  formatOpeningBiasConfidence,
  formatOpeningBiasLabel,
} from "@/lib/race/openingBias";
import type { TacticalBoardDraft } from "@/lib/race/tacticalBoard/store";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}

function DetailList(props: { title: string; items: string[]; tone?: "default" | "warning" | "reference" }) {
  if (props.items.length === 0) {
    return null;
  }

  const titleClass =
    props.tone === "warning"
      ? "text-amber-200"
      : props.tone === "reference"
        ? "text-cyan-200"
        : "text-white";
  const dotClass =
    props.tone === "warning"
      ? "bg-amber-300"
      : props.tone === "reference"
        ? "bg-cyan-300"
        : "bg-white/50";

  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/10 p-4">
      <div className={`text-sm font-black ${titleClass}`}>{props.title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--text-soft)]">
        {props.items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PreRaceOpeningBiasSummary({ draft }: { draft: TacticalBoardDraft }) {
  const plan = draft.routeBias.originalPlan;
  const latestUpdate = draft.routeBias.latestUpdate;

  if (!plan || !draft.routeBias.originalAnswers) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--divider)] bg-black/10 p-5 text-sm leading-6 text-[color:var(--text-soft)]">
        No opening-bias plan is saved yet. Use the Step 4 input block at the top of the page, then
        come back here for the read-only opening call and its reasoning.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Saved Pick" value={formatOpeningBiasLabel(plan.decision)} />
        <Metric label="Confidence" value={formatOpeningBiasConfidence(plan.confidence)} />
        <Metric
          label="Shore Score"
          value={String(plan.shoreScore)}
        />
        <Metric
          label="Bay Score"
          value={String(plan.bayScore)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DetailList title="Why This Side" items={plan.reasons} />
        <DetailList title="Warnings" items={plan.warnings} tone="warning" />
        <DetailList title="Reference Basis" items={plan.referenceBasis} tone="reference" />
      </div>

      <LiveRouteUpdateCard
        update={latestUpdate}
        title={
          latestUpdate?.action
            ? `Latest check · ${formatOpeningBiasAction(latestUpdate.action)}`
            : "Latest opening-bias check"
        }
      />
    </section>
  );
}
