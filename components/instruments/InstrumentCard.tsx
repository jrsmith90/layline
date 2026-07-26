import type { InstrumentMetricKey } from "@/lib/boat-data/types";
import type { Freshness } from "@/lib/boat-data/staleness";

export type InstrumentMetricMeta = {
  label: string;
  unit: string;
  decimals: number;
  signed?: boolean;
};

export const INSTRUMENT_METRIC_META: Record<InstrumentMetricKey, InstrumentMetricMeta> = {
  speedThroughWaterKt: { label: "Boat Speed", unit: "kt", decimals: 1 },
  sogKt: { label: "SOG", unit: "kt", decimals: 1 },
  headingTrueDeg: { label: "Heading", unit: "°", decimals: 0 },
  cogTrueDeg: { label: "COG", unit: "°", decimals: 0 },
  awaDeg: { label: "AWA", unit: "°", decimals: 0, signed: true },
  awsKt: { label: "AWS", unit: "kt", decimals: 1 },
  twaDeg: { label: "TWA", unit: "°", decimals: 0, signed: true },
  twsKt: { label: "TWS", unit: "kt", decimals: 1 },
  depthBelowKeelM: { label: "Depth", unit: "m", decimals: 1 },
  vmgKt: { label: "VMG", unit: "kt", decimals: 2 },
  targetPercentage: { label: "Target %", unit: "%", decimals: 0 },
  liftHeaderDeg: { label: "Lift/Header", unit: "°", decimals: 0, signed: true },
};

const FRESHNESS_BORDER: Record<Freshness, string> = {
  fresh: "border-[color:var(--favorable)]/60",
  aging: "border-[color:var(--warning)]/60",
  stale: "border-[color:var(--unfavorable)]/60",
  unknown: "border-[color:var(--divider)]",
};

const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "Live",
  aging: "Aging",
  stale: "Stale",
  unknown: "No data",
};

function formatValue(value: number | null, decimals: number, signed?: boolean): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = value.toFixed(decimals);
  return signed && value > 0 ? `+${rounded}` : rounded;
}

export function InstrumentCard({
  metricKey,
  value,
  freshness,
  sourceLabel,
}: {
  metricKey: InstrumentMetricKey;
  value: number | null;
  freshness: Freshness;
  sourceLabel?: string;
}) {
  const meta = INSTRUMENT_METRIC_META[metricKey];

  return (
    <div
      className={[
        "flex flex-col justify-between rounded-2xl border-2 bg-[color:var(--panel)] p-4",
        FRESHNESS_BORDER[freshness],
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
          {meta.label}
        </span>
        <span
          className={[
            "text-[10px] font-bold uppercase tracking-wide",
            freshness === "fresh"
              ? "text-[color:var(--favorable)]"
              : freshness === "aging"
                ? "text-[color:var(--warning)]"
                : "text-[color:var(--muted)]",
          ].join(" ")}
        >
          {FRESHNESS_LABEL[freshness]}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-4xl font-black tabular-nums leading-none text-[color:var(--text)]">
          {formatValue(value, meta.decimals, meta.signed)}
        </span>
        <span className="text-base font-semibold text-[color:var(--muted)]">{meta.unit}</span>
      </div>
      {sourceLabel ? (
        <div className="mt-2 truncate text-[11px] text-[color:var(--muted)]">{sourceLabel}</div>
      ) : null}
    </div>
  );
}
