"use client";

import { useState, useSyncExternalStore } from "react";
import { Settings2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { useBoatDataSnapshot, useNowMs } from "@/lib/boat-data/store";
import { getReadingFreshness } from "@/lib/boat-data/staleness";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import {
  DEFAULT_INSTRUMENT_DASHBOARD_CONFIG,
  DEFAULT_INSTRUMENT_METRICS,
  type InstrumentDashboardConfig,
  type InstrumentLayout,
  type InstrumentMetricKey,
} from "@/lib/boat-data/types";
import { InstrumentCard, INSTRUMENT_METRIC_META } from "./InstrumentCard";

const LAYOUT_SLOT_COUNT: Record<InstrumentLayout, number | null> = {
  "2-card": 2,
  "4-card": 4,
  "6-card": 6,
  custom: null,
};

const LAYOUT_GRID_CLASS: Record<InstrumentLayout, string> = {
  "2-card": "grid-cols-1 sm:grid-cols-2",
  "4-card": "grid-cols-2",
  "6-card": "grid-cols-2 sm:grid-cols-3",
  custom: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

let cachedRaw: string | null | undefined;
let cachedConfig: InstrumentDashboardConfig = DEFAULT_INSTRUMENT_DASHBOARD_CONFIG;
const DASHBOARD_CONFIG_EVENT = "layline:instrument-dashboard-config-changed";

function readDashboardConfig(): InstrumentDashboardConfig {
  if (typeof localStorage === "undefined") return DEFAULT_INSTRUMENT_DASHBOARD_CONFIG;

  const raw = localStorage.getItem(STORAGE_KEYS.instrumentDashboardLayout);
  if (raw === cachedRaw) return cachedConfig;
  cachedRaw = raw;

  if (!raw) {
    cachedConfig = DEFAULT_INSTRUMENT_DASHBOARD_CONFIG;
    return cachedConfig;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedConfig = {
      layout: parsed.layout ?? DEFAULT_INSTRUMENT_DASHBOARD_CONFIG.layout,
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : DEFAULT_INSTRUMENT_DASHBOARD_CONFIG.metrics,
    };
  } catch {
    cachedConfig = DEFAULT_INSTRUMENT_DASHBOARD_CONFIG;
  }
  return cachedConfig;
}

function saveDashboardConfig(config: InstrumentDashboardConfig) {
  if (typeof window === "undefined") return;
  cachedRaw = JSON.stringify(config);
  cachedConfig = config;
  localStorage.setItem(STORAGE_KEYS.instrumentDashboardLayout, cachedRaw);
  window.dispatchEvent(new CustomEvent(DASHBOARD_CONFIG_EVENT));
}

function subscribeDashboardConfig(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DASHBOARD_CONFIG_EVENT, listener);
  return () => window.removeEventListener(DASHBOARD_CONFIG_EVENT, listener);
}

function useDashboardConfig() {
  return useSyncExternalStore(
    subscribeDashboardConfig,
    readDashboardConfig,
    () => DEFAULT_INSTRUMENT_DASHBOARD_CONFIG,
  );
}

const ALL_METRIC_KEYS = Object.keys(INSTRUMENT_METRIC_META) as InstrumentMetricKey[];

export function InstrumentGrid() {
  const config = useDashboardConfig();
  const snapshot = useBoatDataSnapshot();
  const nowMs = useNowMs(1000);
  const [editing, setEditing] = useState(false);

  const slotCount = LAYOUT_SLOT_COUNT[config.layout];
  const visibleMetrics =
    slotCount == null ? config.metrics : config.metrics.slice(0, slotCount);

  function setLayout(layout: InstrumentLayout) {
    const count = LAYOUT_SLOT_COUNT[layout];
    const metrics =
      count == null
        ? config.metrics.length > 0
          ? config.metrics
          : DEFAULT_INSTRUMENT_METRICS
        : Array.from({ length: count }, (_, i) => config.metrics[i] ?? DEFAULT_INSTRUMENT_METRICS[i]);
    saveDashboardConfig({ layout, metrics });
  }

  function setSlotMetric(slotIndex: number, metricKey: InstrumentMetricKey) {
    const metrics = [...config.metrics];
    metrics[slotIndex] = metricKey;
    saveDashboardConfig({ ...config, metrics });
  }

  function toggleCustomMetric(metricKey: InstrumentMetricKey) {
    const has = config.metrics.includes(metricKey);
    const metrics = has
      ? config.metrics.filter((key) => key !== metricKey)
      : [...config.metrics, metricKey];
    saveDashboardConfig({ ...config, metrics });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["2-card", "4-card", "6-card", "custom"] as InstrumentLayout[]).map((layout) => (
            <button
              key={layout}
              type="button"
              onClick={() => setLayout(layout)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                config.layout === layout
                  ? "border-[color:var(--favorable)] text-[color:var(--favorable)]"
                  : "border-[color:var(--divider)] text-[color:var(--muted)]",
              ].join(" ")}
            >
              {layout === "custom" ? "Custom" : layout.replace("-card", "")}
            </button>
          ))}
        </div>
        <Btn
          full={false}
          tone="neutral"
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Settings2 size={13} /> {editing ? "Done" : "Choose metrics"}
        </Btn>
      </div>

      {editing && config.layout !== "custom" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibleMetrics.map((metricKey, slotIndex) => (
            <label key={slotIndex} className="flex items-center gap-2 text-sm text-[color:var(--text)]">
              <span className="w-16 shrink-0 text-xs uppercase text-[color:var(--muted)]">
                Card {slotIndex + 1}
              </span>
              <select
                className="w-full rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] px-2 py-1.5 text-sm text-[color:var(--text)]"
                value={metricKey}
                onChange={(e) => setSlotMetric(slotIndex, e.target.value as InstrumentMetricKey)}
              >
                {ALL_METRIC_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {INSTRUMENT_METRIC_META[key].label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {editing && config.layout === "custom" ? (
        <div className="flex flex-wrap gap-2">
          {ALL_METRIC_KEYS.map((key) => {
            const selected = config.metrics.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCustomMetric(key)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selected
                    ? "border-[color:var(--favorable)] text-[color:var(--favorable)]"
                    : "border-[color:var(--divider)] text-[color:var(--muted)]",
                ].join(" ")}
              >
                {INSTRUMENT_METRIC_META[key].label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={["grid gap-3", LAYOUT_GRID_CLASS[config.layout]].join(" ")}>
        {visibleMetrics.map((metricKey, index) => {
          const reading = snapshot[metricKey];
          const freshness = getReadingFreshness(metricKey, reading, nowMs);
          return (
            <InstrumentCard
              key={`${metricKey}-${index}`}
              metricKey={metricKey}
              value={reading?.value ?? null}
              freshness={freshness}
              sourceLabel={reading?.source}
            />
          );
        })}
        {visibleMetrics.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-[color:var(--divider)] p-6 text-center text-sm text-[color:var(--muted)]">
            No metrics selected for this layout yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
