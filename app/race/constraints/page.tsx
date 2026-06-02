"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { RoutingConstraintsList } from "@/components/race/RoutingConstraintsList";
import {
  clearRaceConstraintOverride,
  getRaceConstraintOverrideVersion,
  getStoredRaceConstraintOverride,
  subscribeRaceConstraintOverrides,
  upsertRaceConstraintOverride,
} from "@/data/race/customConstraints";
import {
  getActiveRaceEvent,
  getCustomCourseMarkCatalogForEvent,
  type RaceCourseConstraintRecord,
} from "@/data/race/eventDatabase";
import {
  getConstraintActionCopy,
  getConstraintHeadline,
  getConstraintScopeCopy,
  getConstraintSecondaryDetail,
} from "@/lib/race/instructionConstraints";
import { getMarkShortLabel } from "@/lib/race/markLabels";

type ConstraintType = RaceCourseConstraintRecord["type"];
type AppliesTo = RaceCourseConstraintRecord["appliesTo"];

type EditorState = {
  id: string | null;
  type: ConstraintType;
  appliesTo: AppliesTo;
  markKey: string;
  markLabel: string;
  markName: string;
  boundaryLabel: string;
  boundaryMarksText: string;
  boundaryMarkKeysText: string;
  referenceMarkKey: string;
  legNumbersText: string;
  detail: string;
};

const activeEvent = getActiveRaceEvent();
const eventMarkCatalog = getCustomCourseMarkCatalogForEvent(activeEvent);
const markOptions = Object.entries(eventMarkCatalog).sort((left, right) => {
  const labelCompare = getMarkShortLabel(left[0], left[1]).localeCompare(
    getMarkShortLabel(right[0], right[1]),
  );

  return labelCompare || left[0].localeCompare(right[0]);
});

function createConstraintId() {
  return `constraint-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyEditorState(): EditorState {
  return {
    id: null,
    type: "pass_on_channel_side",
    appliesTo: "all_keelboat_classes",
    markKey: "",
    markLabel: "",
    markName: "",
    boundaryLabel: "",
    boundaryMarksText: "",
    boundaryMarkKeysText: "",
    referenceMarkKey: "",
    legNumbersText: "",
    detail: "",
  };
}

function isBoundaryType(type: ConstraintType) {
  return type === "stay_inside_marks" || type === "stay_outside_marks";
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseLegNumbers(value: string) {
  const parsed = splitCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.max(1, Math.round(item)));

  return parsed.length > 0 ? parsed : undefined;
}

function toEditorState(constraint: RaceCourseConstraintRecord): EditorState {
  if (
    constraint.type === "pass_on_channel_side" ||
    constraint.type === "leave_to_port" ||
    constraint.type === "leave_to_starboard"
  ) {
    return {
      id: constraint.id,
      type: constraint.type,
      appliesTo: constraint.appliesTo,
      markKey: constraint.markKey ?? "",
      markLabel: constraint.markLabel,
      markName: constraint.markName,
      boundaryLabel: "",
      boundaryMarksText: "",
      boundaryMarkKeysText: "",
      referenceMarkKey: "",
      legNumbersText: constraint.legNumbers?.join(", ") ?? "",
      detail: constraint.detail ?? "",
    };
  }

  if (constraint.type === "stay_inside_marks" || constraint.type === "stay_outside_marks") {
    return {
      id: constraint.id,
      type: constraint.type,
      appliesTo: constraint.appliesTo,
      markKey: "",
      markLabel: "",
      markName: "",
      boundaryLabel: constraint.boundaryLabel,
      boundaryMarksText: constraint.boundaryMarks.join(", "),
      boundaryMarkKeysText: constraint.boundaryMarkKeys?.join(", ") ?? "",
      referenceMarkKey: constraint.referenceMarkKey ?? "",
      legNumbersText: constraint.legNumbers?.join(", ") ?? "",
      detail: constraint.detail ?? "",
    };
  }

  return {
    ...createEmptyEditorState(),
    id: constraint.id,
  };
}

function buildConstraintFromEditor(editor: EditorState) {
  const id = editor.id ?? createConstraintId();
  const legNumbers = parseLegNumbers(editor.legNumbersText);
  const detail = editor.detail.trim() || undefined;

  if (!isBoundaryType(editor.type)) {
    const markLabel = editor.markLabel.trim();
    const markName = editor.markName.trim();

    if (!markLabel || !markName) {
      return {
        constraint: null,
        error: "Mark label and mark name are required for mark-based constraints.",
      };
    }

    return {
      constraint: {
        id,
        type: editor.type,
        appliesTo: editor.appliesTo,
        markKey: editor.markKey.trim() || undefined,
        markLabel,
        markName,
        detail,
        legNumbers,
      } satisfies RaceCourseConstraintRecord,
      error: null,
    };
  }

  const boundaryLabel = editor.boundaryLabel.trim();
  const boundaryMarks = splitCsv(editor.boundaryMarksText);
  const boundaryMarkKeys = splitCsv(editor.boundaryMarkKeysText);

  if (!boundaryLabel || boundaryMarks.length === 0) {
    return {
      constraint: null,
      error: "Boundary constraints need a boundary label and at least one boundary mark.",
    };
  }

  return {
    constraint: {
      id,
      type: editor.type,
      appliesTo: editor.appliesTo,
      boundaryLabel,
      boundaryMarks,
      boundaryMarkKeys: boundaryMarkKeys.length > 0 ? boundaryMarkKeys : undefined,
      referenceMarkKey: editor.referenceMarkKey.trim() || undefined,
      detail,
      legNumbers,
    } satisfies RaceCourseConstraintRecord,
    error: null,
  };
}

function constraintOverrideSnapshot() {
  return getStoredRaceConstraintOverride(activeEvent.id);
}

function subscribeConstraintOverrideSnapshot(listener: () => void) {
  return subscribeRaceConstraintOverrides(listener);
}

function ConstraintMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {props.label}
      </div>
      <div className="mt-2 text-sm font-black text-[color:var(--text)]">{props.value}</div>
    </div>
  );
}

export default function RaceConstraintManagerPage() {
  useSyncExternalStore(
    subscribeConstraintOverrideSnapshot,
    getRaceConstraintOverrideVersion,
    () => 0,
  );

  const override = constraintOverrideSnapshot();
  const effectiveConstraints =
    override?.constraints ?? activeEvent.courseGeometry.specialRoutingConstraints;
  const [editor, setEditor] = useState<EditorState>(() => createEmptyEditorState());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const overrideSummary = useMemo(() => {
    if (!override) {
      return "Using event defaults";
    }

    return `Using race override saved ${new Date(override.updatedAtISO).toLocaleString()}`;
  }, [override]);

  function resetEditor() {
    setEditor(createEmptyEditorState());
  }

  function handleEdit(constraint: RaceCourseConstraintRecord) {
    setEditor(toEditorState(constraint));
    setMessage(null);
    setError(null);
  }

  function handleDelete(constraintId: string) {
    const next = effectiveConstraints.filter((constraint) => constraint.id !== constraintId);
    upsertRaceConstraintOverride(activeEvent.id, next);
    if (editor.id === constraintId) {
      resetEditor();
    }
    setMessage("Constraint removed for this race.");
    setError(null);
  }

  function handleSave() {
    const { constraint, error: buildError } = buildConstraintFromEditor(editor);
    if (!constraint) {
      setError(buildError);
      setMessage(null);
      return;
    }

    const next = editor.id
      ? effectiveConstraints.map((item) => (item.id === editor.id ? constraint : item))
      : [...effectiveConstraints, constraint];

    upsertRaceConstraintOverride(activeEvent.id, next);
    setMessage(editor.id ? "Constraint updated for this race." : "Constraint added for this race.");
    setError(null);
    resetEditor();
  }

  function handleResetDefaults() {
    clearRaceConstraintOverride(activeEvent.id);
    setMessage("Race constraint override cleared. Event defaults are active again.");
    setError(null);
    resetEditor();
  }

  function updateEditor<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    if (key === "markKey") {
      const mark = typeof value === "string" ? eventMarkCatalog[value] : null;
      setEditor((prev) => ({
        ...prev,
        markKey: typeof value === "string" ? value : "",
        markLabel:
          prev.markLabel.trim().length > 0 ? prev.markLabel : mark?.id ?? prev.markLabel,
        markName:
          prev.markName.trim().length > 0 ? prev.markName : mark?.name ?? prev.markName,
      }));
      return;
    }

    setEditor((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const editingExistingConstraint = editor.id != null;

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Race Setup"
        title="Manage race constraints."
        description="Update the active race's hard routing constraints without touching the archived event defaults. These overrides are race-specific, and course-derived roundings still stay automatic."
        badges={["Race Instructions", "Overrides", "Pre-Race"]}
        actions={
          <Link
            href="/race/pre-race"
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
          >
            Back To Pre-Race
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <ConstraintMetric label="Active race" value={activeEvent.name} />
        <ConstraintMetric label="Constraint source" value={overrideSummary} />
        <ConstraintMetric
          label="Editable constraints"
          value={`${effectiveConstraints.length} active`}
        />
        <ConstraintMetric
          label="Defaults"
          value={`${activeEvent.courseGeometry.specialRoutingConstraints.length} event defaults`}
        />
      </section>

      <section className="layline-panel p-4 text-sm leading-6 text-[color:var(--text-soft)]">
        These edits apply to the active race only and are stored in this browser. Use this for
        race-by-race SI changes like channel-side marks, leg-specific rounding instructions, or
        temporary boundaries. Course roundings generated from the selected course sequence still
        appear automatically and are not edited here.
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section className="layline-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="layline-kicker">Active Race</div>
                <h2 className="mt-1 text-xl font-black">Effective constraints</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetEditor}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-[color:var(--text)]"
                >
                  Add Constraint
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={!override}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Event Defaults
                </button>
              </div>
            </div>

            <div className="mt-4">
              <RoutingConstraintsList constraints={effectiveConstraints} />
            </div>
          </section>

          <section className="layline-panel p-4">
            <div className="layline-kicker">Edit Queue</div>
            <div className="mt-3 space-y-3">
              {effectiveConstraints.map((constraint) => (
                <div
                  key={constraint.id}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {getConstraintActionCopy(constraint)} · {getConstraintScopeCopy(constraint)}
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(constraint)}
                        className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-[color:var(--text)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(constraint.id)}
                        className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="layline-panel p-4">
          <div className="layline-kicker">Editor</div>
          <h2 className="mt-1 text-xl font-black">
            {editingExistingConstraint ? "Edit constraint" : "Add constraint"}
          </h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <div className="mb-1 text-sm font-medium">Constraint type</div>
              <select
                className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                value={editor.type}
                onChange={(event) => updateEditor("type", event.target.value as ConstraintType)}
              >
                <option value="pass_on_channel_side">Pass on channel side</option>
                <option value="leave_to_port">Leave to port</option>
                <option value="leave_to_starboard">Leave to starboard</option>
                <option value="stay_inside_marks">Stay inside boundary</option>
                <option value="stay_outside_marks">Stay outside boundary</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium">Applies to</div>
              <select
                className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                value={editor.appliesTo}
                onChange={(event) => updateEditor("appliesTo", event.target.value as AppliesTo)}
              >
                <option value="all_keelboat_classes">All keelboat classes</option>
                <option value="selected_course">Selected course</option>
              </select>
            </label>

            {!isBoundaryType(editor.type) ? (
              <>
                <label className="block">
                  <div className="mb-1 text-sm font-medium">Mark key</div>
                  <select
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.markKey}
                    onChange={(event) => updateEditor("markKey", event.target.value)}
                  >
                    <option value="">Manual / not in event marks</option>
                    {markOptions.map(([markKey, mark]) => (
                      <option key={markKey} value={markKey} className="bg-slate-900">
                        {getMarkShortLabel(markKey, mark)} · {mark.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium">Mark label</div>
                  <input
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.markLabel}
                    onChange={(event) => updateEditor("markLabel", event.target.value)}
                    placeholder='Ex: "1AH" or Thomas Point Light'
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium">Mark name</div>
                  <input
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.markName}
                    onChange={(event) => updateEditor("markName", event.target.value)}
                    placeholder="Official or race-specific mark name"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <div className="mb-1 text-sm font-medium">Boundary label</div>
                  <input
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.boundaryLabel}
                    onChange={(event) => updateEditor("boundaryLabel", event.target.value)}
                    placeholder="Ex: East side boundary"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium">Boundary marks</div>
                  <input
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.boundaryMarksText}
                    onChange={(event) => updateEditor("boundaryMarksText", event.target.value)}
                    placeholder='Comma-separated labels, ex: R "2", G "9"'
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium">Boundary mark keys</div>
                  <input
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.boundaryMarkKeysText}
                    onChange={(event) => updateEditor("boundaryMarkKeysText", event.target.value)}
                    placeholder="Optional comma-separated app mark keys"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-sm font-medium">Reference mark key</div>
                  <select
                    className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                    value={editor.referenceMarkKey}
                    onChange={(event) => updateEditor("referenceMarkKey", event.target.value)}
                  >
                    <option value="">None</option>
                    {markOptions.map(([markKey, mark]) => (
                      <option key={markKey} value={markKey} className="bg-slate-900">
                        {getMarkShortLabel(markKey, mark)} · {mark.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="block">
              <div className="mb-1 text-sm font-medium">Leg numbers</div>
              <input
                className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                value={editor.legNumbersText}
                onChange={(event) => updateEditor("legNumbersText", event.target.value)}
                placeholder="Optional comma-separated legs, ex: 1, 3"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium">Detail</div>
              <textarea
                className="min-h-28 w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                value={editor.detail}
                onChange={(event) => updateEditor("detail", event.target.value)}
                placeholder="Optional SI note or interpretation"
              />
            </label>

            {message ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
              >
                {editingExistingConstraint ? "Save Constraint" : "Add Constraint"}
              </button>
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
              >
                Clear Editor
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
