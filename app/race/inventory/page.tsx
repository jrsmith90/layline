"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { Panel } from "@/components/ui/Panel";
import {
  DEFAULT_SAIL_INVENTORY_DEFAULTS,
  type SailInventoryDefaults,
} from "@/data/logic/sailSelectionLogic";
import {
  getStoredSailInventoryState,
  resetSailInventoryDefaults,
  saveSailInventoryDefaults,
  subscribeSailInventory,
} from "@/data/race/sailInventory";
import {
  formatSailInventoryKey,
  orderChoicesWithPreferred,
  SAIL_INVENTORY_CATEGORY_META,
  SAIL_INVENTORY_CATEGORY_ORDER,
  type SailInventoryDefaultKey,
} from "@/lib/race/sailInventoryCatalog";

const DEFAULT_INVENTORY_STATE = {
  defaults: DEFAULT_SAIL_INVENTORY_DEFAULTS,
  updatedAtISO: "",
};

function areDefaultsEqual(left: SailInventoryDefaults, right: SailInventoryDefaults) {
  return SAIL_INVENTORY_CATEGORY_ORDER.every((key) => left[key] === right[key]);
}

export default function SailInventoryPage() {
  const { effectiveMode } = useDisplayMode();
  const isDesktopLayout = effectiveMode === "desktop";
  const inventoryState = useSyncExternalStore(
    subscribeSailInventory,
    getStoredSailInventoryState,
    () => DEFAULT_INVENTORY_STATE,
  );
  const lastUpdatedLabel = useMemo(() => {
    if (!inventoryState.updatedAtISO) {
      return "Not saved yet";
    }

    const parsed = new Date(inventoryState.updatedAtISO);
    if (Number.isNaN(parsed.getTime())) {
      return "Saved locally";
    }

    return parsed.toLocaleString();
  }, [inventoryState.updatedAtISO]);

  return (
    <main
      className={[
        "mx-auto w-full space-y-5 px-4 pb-8 pt-4",
        isDesktopLayout ? "max-w-[96rem]" : "max-w-5xl",
      ].join(" ")}
    >
      <AppPageHeader
        eyebrow="Sail Inventory"
        title="Set the defaults your race setup should reach for first."
        description="Pick the baseline sail in each category so Step 2 starts from your real inventory instead of a fixed hard-coded order. You can still override the final choice on the sail-selection screen."
        badges={["Main", "Upwind Headsails", "Spinnakers", "Local Defaults"]}
        actions={
          <Link
            href="/race/pre-race/sail-selection"
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
          >
            Back To Sail Selection
          </Link>
        }
      />

      <Panel title="Inventory Status" right={<div className="text-xs opacity-60">Last saved {lastUpdatedLabel}</div>}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {SAIL_INVENTORY_CATEGORY_ORDER.map((key) => {
            const meta = SAIL_INVENTORY_CATEGORY_META[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  {meta.title}
                </div>
                <div className="mt-2 text-sm font-black text-[color:var(--text)]">
                  {meta.formatChoice(inventoryState.defaults[key])}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <InventoryEditor
        key={inventoryState.updatedAtISO || "sail-inventory-defaults"}
        savedDefaults={inventoryState.defaults}
      />
    </main>
  );
}

function InventoryEditor(props: { savedDefaults: SailInventoryDefaults }) {
  const [draftDefaults, setDraftDefaults] = useState<SailInventoryDefaults>(props.savedDefaults);
  const isDirty = useMemo(
    () => !areDefaultsEqual(draftDefaults, props.savedDefaults),
    [draftDefaults, props.savedDefaults],
  );

  function updateDraft<Key extends SailInventoryDefaultKey>(
    key: Key,
    value: SailInventoryDefaults[Key],
  ) {
    setDraftDefaults((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave() {
    saveSailInventoryDefaults(draftDefaults);
  }

  function handleRevert() {
    setDraftDefaults(props.savedDefaults);
  }

  function handleRestoreStandardDefaults() {
    setDraftDefaults(DEFAULT_SAIL_INVENTORY_DEFAULTS);
  }

  function handleResetSavedDefaults() {
    const nextState = resetSailInventoryDefaults();
    setDraftDefaults(nextState.defaults);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        {SAIL_INVENTORY_CATEGORY_ORDER.map((key) => {
          const meta = SAIL_INVENTORY_CATEGORY_META[key];
          const orderedOptions = orderChoicesWithPreferred(meta.options, String(props.savedDefaults[key]));

          return (
            <Panel key={key} title={meta.title}>
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[color:var(--text-soft)]">{meta.detail}</p>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Default Selection
                  </span>
                  <select
                    className="mt-2 w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3 text-sm"
                    value={draftDefaults[key]}
                    onChange={(event) =>
                      updateDraft(key, event.target.value as SailInventoryDefaults[typeof key])
                    }
                  >
                    {orderedOptions.map((choice) => (
                      <option key={choice} value={choice} className="bg-slate-900">
                        {meta.formatChoice(choice)}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Available In This Category
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meta.options.map((choice) => {
                      const isSelected = draftDefaults[key] === choice;
                      return (
                        <span
                          key={choice}
                          className={[
                            "rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide",
                            isSelected
                              ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100"
                              : "border-[color:var(--divider)] bg-black/20 text-[color:var(--text-soft)]",
                          ].join(" ")}
                        >
                          {meta.formatChoice(choice)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="space-y-5">
        <Panel title="Current Draft">
          <div className="space-y-3">
            {SAIL_INVENTORY_CATEGORY_ORDER.map((key) => {
              const meta = SAIL_INVENTORY_CATEGORY_META[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {formatSailInventoryKey(key)}
                  </div>
                  <div className="mt-2 text-sm font-black text-[color:var(--text)]">
                    {meta.formatChoice(draftDefaults[key])}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="How This Applies">
          <div className="space-y-3 text-sm leading-6 text-[color:var(--text-soft)]">
            <p>
              Step 2 uses these defaults whenever the coach lands in that sail class. If the
              recommendation says 150 genoa, it now reaches for your chosen 150 first.
            </p>
            <p>
              The sail-selection screen still lets you override the final package for that race,
              so this page sets the baseline, not a hard lock.
            </p>
            <p>
              Everything here saves in this browser only, just like your custom courses and race
              constraint overrides.
            </p>
          </div>
        </Panel>

        <Panel title="Actions">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black uppercase tracking-wide text-black disabled:opacity-40"
            >
              Save Inventory Defaults
            </button>
            <button
              type="button"
              onClick={handleRevert}
              disabled={!isDirty}
              className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide disabled:opacity-40"
            >
              Revert Unsaved Changes
            </button>
            <button
              type="button"
              onClick={handleRestoreStandardDefaults}
              className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
            >
              Load Standard Defaults
            </button>
            <button
              type="button"
              onClick={handleResetSavedDefaults}
              className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-amber-50"
            >
              Reset Saved Defaults
            </button>
          </div>
        </Panel>
      </div>
    </section>
  );
}
