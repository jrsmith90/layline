"use client";

import Link from "next/link";
import {
  formatHeadsailChoice,
  formatMainChoice,
  formatSpinChoice,
} from "@/lib/race/sailInventoryCatalog";
import type { TacticalBoardConfirmedSailSelection } from "@/lib/race/tacticalBoard/store";

function formatTitleCase(value: string | null | undefined) {
  if (!value) return "--";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatSignedRisk(value: string | null | undefined) {
  if (!value || value === "unknown") return "--";
  return formatTitleCase(value);
}

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

export function PreRaceSailPackageSummary({
  selection,
}: {
  selection: TacticalBoardConfirmedSailSelection | null;
}) {
  if (!selection) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-dashed border-[color:var(--divider)] bg-black/10 p-5 text-sm leading-6 text-[color:var(--text-soft)]">
          No confirmed sail package is saved yet. Open Step 2 to lock the sails, reef call, and
          coach summary before the crew arrives.
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/race/pre-race/sail-selection"
            className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
          >
            Open Sail Selection
          </Link>
          <Link
            href="/race/inventory"
            className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
          >
            Manage Inventory
          </Link>
        </div>
      </section>
    );
  }

  return (
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Final Call" value={selection.finalCall} />
        <Metric label="Main" value={formatMainChoice(selection.mainChoice)} />
        <Metric
          label="Headsail"
          value={
            selection.headsailChoice
              ? formatHeadsailChoice(selection.headsailChoice)
              : "None selected"
          }
        />
        <Metric
          label="Spinnaker"
          value={
            selection.spinnakerChoice
              ? formatSpinChoice(selection.spinnakerChoice)
              : "None staged"
          }
        />
        <Metric label="Reef" value={selection.reefCall} />
        <Metric label="Confidence" value={selection.confidence} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Coach Summary
            </div>
            <div className="mt-3 whitespace-pre-line text-sm leading-6 text-[color:var(--text-soft)]">
              {selection.coachSummary ?? "No coach summary saved yet."}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--divider)] bg-black/10 p-4 text-sm leading-6 text-[color:var(--text-soft)]">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Forecast And Current Read
            </div>
            <div className="mt-3 space-y-3">
              <div>{selection.forecastSummary ?? "No forecast summary saved yet."}</div>
              <div>{selection.currentEffectSummary ?? "No current summary saved yet."}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Forecast Wind" value={`${selection.forecastWindKt.toFixed(1)} kt`} />
            <Metric label="Sea State" value={formatTitleCase(selection.seaState)} />
            <Metric label="Leg Type" value={formatTitleCase(selection.legType)} />
            <Metric label="Risk Mode" value={formatTitleCase(selection.riskMode)} />
            <Metric label="Crew Count" value={String(selection.crewCount)} />
            <Metric
              label="Current Effect"
              value={formatSignedRisk(selection.currentEffectLevel)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/race/pre-race/sail-selection"
              className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
            >
              Edit Sail Package
            </Link>
            <Link
              href="/race/inventory"
              className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
            >
              Manage Inventory
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
