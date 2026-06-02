"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import CourseChart from "@/components/race/CourseChart";
import { ANNAPOLIS_STANDARD_MARKS_SOURCE } from "@/data/race/annapolisMarkDataset";
import { buildCourseSummaryFromRecord } from "@/data/race/getCourseData";
import {
  createCustomCourseId,
  deleteCustomCourseRecord,
  getCustomCoursesForEvent,
  getCustomCourseRecord,
  upsertCustomCourseRecord,
} from "@/data/race/customCourses";
import {
  getActiveRaceEvent,
  getCustomCourseMarkCatalogForEvent,
  type RaceCourseMarkRounding,
} from "@/data/race/eventDatabase";
import {
  buildCustomCourseRecord,
  buildLegDetailsFromSequence,
} from "@/lib/race/customCourseHelpers";
import {
  formatMarkChoice,
  formatMarkSequence,
  getMarkShortLabel,
} from "@/lib/race/markLabels";
import { useCourseCatalogVersion } from "@/lib/race/useCourseCatalogVersion";

type EditorState = {
  label: string;
  sequence: string[];
  roundingSides: Array<"" | RaceCourseMarkRounding>;
  textSummaryText: string;
  notes: string;
};

type CleanedSequenceEditorState = {
  sequence: string[];
  markRoundings: Array<RaceCourseMarkRounding | null>;
};

type SequenceRole = "start" | "finish" | "start_finish" | null;

const activeEvent = getActiveRaceEvent();
const customCourseMarks = getCustomCourseMarkCatalogForEvent(activeEvent);
const availableMarkIds = Object.keys(customCourseMarks).sort((a, b) => {
  const labelCompare = getMarkShortLabel(a, customCourseMarks[a]).localeCompare(
    getMarkShortLabel(b, customCourseMarks[b]),
  );

  return labelCompare || a.localeCompare(b);
});

function createEmptyEditorState(): EditorState {
  return {
    label: "",
    sequence: [activeEvent.courseGeometry.startFinishMark, ""],
    roundingSides: ["", ""],
    textSummaryText: "",
    notes: "",
  };
}

function normalizeEditorRoundings(
  sequence: string[],
  markRoundings?: Array<RaceCourseMarkRounding | null>,
) {
  return sequence.map((_, index) => {
    const side = markRoundings?.[index];
    return side === "port" || side === "starboard" ? side : "";
  });
}

function cleanEditorSequence(editor: Pick<EditorState, "sequence" | "roundingSides">) {
  return editor.sequence.reduce<CleanedSequenceEditorState>(
    (accumulator, item, index) => {
      const markKey = item.trim();
      if (!markKey) {
        return accumulator;
      }

      accumulator.sequence.push(markKey);
      accumulator.markRoundings.push(editor.roundingSides[index] || null);
      return accumulator;
    },
    {
      sequence: [],
      markRoundings: [],
    },
  );
}

function getSequenceRoles(sequence: string[]) {
  const roles: SequenceRole[] = sequence.map(() => null);
  const populatedIndexes = sequence.flatMap((markKey, index) =>
    markKey.trim().length > 0 ? [index] : [],
  );
  const firstIndex = populatedIndexes[0];
  const lastIndex = populatedIndexes[populatedIndexes.length - 1];

  if (firstIndex == null || lastIndex == null) {
    return roles;
  }

  if (firstIndex === lastIndex) {
    roles[firstIndex] = "start_finish";
    return roles;
  }

  roles[firstIndex] = "start";
  roles[lastIndex] = "finish";
  return roles;
}

function getSequenceRoleCopy(role: SequenceRole) {
  switch (role) {
    case "start":
      return "Start";
    case "finish":
      return "Finish";
    case "start_finish":
      return "Start / Finish";
    default:
      return "";
  }
}

function toEditorState(courseId: string): EditorState {
  const saved = getCustomCourseRecord(courseId);
  if (!saved) {
    return createEmptyEditorState();
  }

  return {
    label: saved.course.label ?? "",
    sequence: (() => {
      const nextSequence =
        saved.course.sequence ??
        saved.course.previewSequence ??
        [activeEvent.courseGeometry.startFinishMark, ""];

      return nextSequence;
    })(),
    roundingSides: normalizeEditorRoundings(
      saved.course.sequence ??
        saved.course.previewSequence ??
        [activeEvent.courseGeometry.startFinishMark, ""],
      saved.course.markRoundings,
    ),
    textSummaryText: (saved.course.textSummary ?? []).join("\n"),
    notes: saved.course.notes ?? "",
  };
}

function cleanTextLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function CourseManagerPage() {
  useCourseCatalogVersion();
  const savedCustomCourses = getCustomCoursesForEvent(activeEvent.id);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(() => createEmptyEditorState());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewCourseRecord = useMemo(() => {
    const label = editor.label.trim();
    const { sequence, markRoundings } = cleanEditorSequence(editor);

    if (!label || sequence.length < 2) {
      return null;
    }

    return buildCustomCourseRecord({
      label,
      sequence,
      marks: customCourseMarks,
      markRoundings,
      notes: editor.notes,
      textSummary: cleanTextLines(editor.textSummaryText),
    });
  }, [editor]);

  const previewCourseSummary = useMemo(() => {
    if (!previewCourseRecord) {
      return null;
    }

    return buildCourseSummaryFromRecord({
      courseId: editingCourseId ?? previewCourseRecord.label,
      eventId: activeEvent.id,
      course: previewCourseRecord,
    });
  }, [editingCourseId, previewCourseRecord]);

  const previewLegDetails = useMemo(() => {
    if (!previewCourseRecord) {
      return [];
    }

    return buildLegDetailsFromSequence(
      previewCourseRecord.sequence ?? [],
      customCourseMarks,
    );
  }, [previewCourseRecord]);

  const previewLegCautions = useMemo(
    () =>
      Array.from(
        new Set(
          previewLegDetails
            .map((leg) => leg.caution)
            .filter((caution): caution is string => Boolean(caution)),
        ),
      ),
    [previewLegDetails],
  );

  const editorSequenceRoles = useMemo(() => getSequenceRoles(editor.sequence), [editor.sequence]);

  function resetEditor() {
    setEditingCourseId(null);
    setEditor(createEmptyEditorState());
  }

  function updateEditor<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSequenceItem(index: number, value: string) {
    setEditor((current) => ({
      ...current,
      sequence: current.sequence.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function updateRoundingSide(index: number, value: "" | RaceCourseMarkRounding) {
    setEditor((current) => ({
      ...current,
      roundingSides: current.roundingSides.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  }

  function addSequenceItem() {
    setEditor((current) => ({
      ...current,
      sequence: [...current.sequence, ""],
      roundingSides: [...current.roundingSides, ""],
    }));
  }

  function removeSequenceItem(index: number) {
    setEditor((current) => ({
      ...current,
      sequence:
        current.sequence.length <= 2
          ? current.sequence
          : current.sequence.filter((_, itemIndex) => itemIndex !== index),
      roundingSides:
        current.roundingSides.length <= 2
          ? current.roundingSides
          : current.roundingSides.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleEdit(courseId: string) {
    setEditingCourseId(courseId);
    setEditor(toEditorState(courseId));
    setMessage(null);
    setError(null);
  }

  function handleDelete(courseId: string) {
    const saved = getCustomCourseRecord(courseId);
    if (!saved) {
      return;
    }

    const confirmed = window.confirm(
      `Delete custom course "${saved.course.label ?? courseId}"? This only removes it from this browser.`,
    );
    if (!confirmed) {
      return;
    }

    deleteCustomCourseRecord(courseId);
    if (editingCourseId === courseId) {
      resetEditor();
    }
    setMessage(`Deleted ${saved.course.label ?? "custom course"}.`);
    setError(null);
  }

  function handleSave() {
    setMessage(null);
    setError(null);

    const label = editor.label.trim();
    const { sequence, markRoundings } = cleanEditorSequence(editor);

    if (!label) {
      setError("Course name is required.");
      return;
    }

    if (sequence.length < 2) {
      setError("Pick at least a start mark and one more mark.");
      return;
    }

    const hasUnknownMark = sequence.some((markKey) => !customCourseMarks[markKey]);
    if (hasUnknownMark) {
      setError("Every sequence entry must be a valid mark from the active event.");
      return;
    }

    const courseId = editingCourseId ?? createCustomCourseId();
    const nextRecord = upsertCustomCourseRecord({
      id: courseId,
      eventId: activeEvent.id,
      course: buildCustomCourseRecord({
        label,
        sequence,
        marks: customCourseMarks,
        markRoundings,
        notes: editor.notes,
        textSummary: cleanTextLines(editor.textSummaryText),
      }),
    });

    setEditingCourseId(nextRecord.id);
    setEditor(toEditorState(nextRecord.id));
    setMessage(`Saved ${nextRecord.course.label ?? "custom course"}.`);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Course Manager"
        title="Add and edit local courses"
        description={`Create custom courses for ${activeEvent.name}, adjust their names and route details, and use them anywhere the app asks for a course. These custom courses are saved in this browser.`}
        badges={["Custom Courses", "Local Storage", activeEvent.location]}
        actions={
          <Link
            href="/race/pre-race"
            className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
          >
            Back To Pre-Race
          </Link>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="layline-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="layline-kicker">Saved Courses</div>
              <h2 className="mt-1 text-2xl font-black">Custom course list</h2>
            </div>
            <button
              type="button"
              onClick={resetEditor}
              className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              New Course
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {savedCustomCourses.length === 0 ? (
              <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4 text-sm text-[color:var(--text-soft)]">
                No custom courses saved yet. Start with the editor to the right.
              </div>
            ) : (
              savedCustomCourses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-black text-[color:var(--text)]">
                        {course.course.label ?? course.id}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        {formatMarkSequence(
                          course.course.sequence ?? course.course.previewSequence ?? [],
                          customCourseMarks,
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        Updated {new Date(course.updatedAtISO).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(course.id)}
                        className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(course.id)}
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 border-t border-[color:var(--divider)] pt-4">
            <div className="layline-kicker">Available Marks</div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
              Annapolis government mark positions in this catalog are sourced from{" "}
              {ANNAPOLIS_STANDARD_MARKS_SOURCE.publisher}&apos;s 2026{" "}
              {ANNAPOLIS_STANDARD_MARKS_SOURCE.title} sheet. When a direct leg appears in that
              distance table, the builder uses the published number before falling back to a
              geometric estimate.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {availableMarkIds.map((markKey) => {
                const mark = customCourseMarks[markKey];
                return (
                  <div
                    key={markKey}
                    className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-sm text-[color:var(--text-soft)]"
                  >
                    {formatMarkChoice(markKey, mark, customCourseMarks)}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="layline-panel p-5">
            <div className="layline-kicker">Editor</div>
            <h2 className="mt-1 text-2xl font-black">
              {editingCourseId ? "Edit custom course" : "Create custom course"}
            </h2>
            <p className="layline-learn-only mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
              Build the course from the active event marks. Leg bearings and distances are
              calculated automatically from the selected mark sequence, with published Annapolis
              sheet distances preferred when available.
            </p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <div className="mb-1 text-sm font-medium">Course name</div>
                <input
                  type="text"
                  value={editor.label}
                  onChange={(event) => updateEditor("label", event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                  placeholder="Tuesday South River Reach"
                />
              </label>

              <div>
                <div className="mb-2 text-sm font-medium">Mark sequence</div>
                <p className="mb-3 text-xs leading-5 text-[color:var(--muted)]">
                  Optional rounding side applies to turning marks. Leave it blank when the mark
                  does not need a port or starboard instruction.
                </p>
                <div className="space-y-2">
                  {editor.sequence.map((markKey, index) => (
                    <div key={`${index}-${markKey}`} className="flex gap-2">
                      <div className="flex w-28 shrink-0 items-center">
                        {editorSequenceRoles[index] ? (
                          <span className="inline-flex rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-sky-100">
                            {getSequenceRoleCopy(editorSequenceRoles[index])}
                          </span>
                        ) : (
                          <span className="text-xs text-[color:var(--muted)]">Turn mark</span>
                        )}
                      </div>
                      <select
                        value={markKey}
                        onChange={(event) => updateSequenceItem(index, event.target.value)}
                        className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                      >
                        <option value="">Choose mark</option>
                        {availableMarkIds.map((candidate) => (
                          <option key={candidate} value={candidate} className="bg-slate-900">
                            {formatMarkChoice(candidate, customCourseMarks[candidate], customCourseMarks)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editor.roundingSides[index] ?? ""}
                        onChange={(event) =>
                          updateRoundingSide(
                            index,
                            event.target.value === "port" || event.target.value === "starboard"
                              ? event.target.value
                              : "",
                          )
                        }
                        className="w-32 rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                      >
                        <option value="">Empty</option>
                        <option value="port" className="bg-slate-900">
                          Port
                        </option>
                        <option value="starboard" className="bg-slate-900">
                          Starboard
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSequenceItem(index)}
                        disabled={editor.sequence.length <= 2}
                        className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSequenceItem}
                  className="mt-3 rounded-xl border border-[color:var(--divider)] bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
                >
                  Add Mark
                </button>
              </div>

              <label className="block">
                <div className="mb-1 text-sm font-medium">Course text lines</div>
                <textarea
                  value={editor.textSummaryText}
                  onChange={(event) => updateEditor("textSummaryText", event.target.value)}
                  className="min-h-28 w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                  placeholder={"Leave blank to auto-generate.\nOne line per instruction."}
                />
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-medium">Notes</div>
                <textarea
                  value={editor.notes}
                  onChange={(event) => updateEditor("notes", event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-2"
                  placeholder="Optional extra notes, rounding reminders, or RC-specific details."
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
              >
                {editingCourseId ? "Save Changes" : "Save Course"}
              </button>
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
              >
                Reset
              </button>
            </div>

            {message ? (
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </section>

          {previewCourseSummary ? (
            <>
              <CourseChart
                courseData={previewCourseSummary}
                title={previewCourseSummary.course.label ?? "Custom course preview"}
                subtitle={formatMarkSequence(
                  previewCourseSummary.course.sequence ?? [],
                  customCourseMarks,
                )}
              />

              <section className="layline-panel p-5">
                <div className="layline-kicker">Calculated Legs</div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[color:var(--muted)]">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">Leg</th>
                        <th className="pb-2 pr-4 font-medium">From</th>
                        <th className="pb-2 pr-4 font-medium">To</th>
                        <th className="pb-2 pr-4 font-medium">Rounding</th>
                        <th className="pb-2 pr-4 font-medium">Bearing</th>
                        <th className="pb-2 pr-4 font-medium">Distance</th>
                        <th className="pb-2 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewLegDetails.map((leg) => (
                        <tr key={leg.legNumber} className="border-t border-[color:var(--divider)]">
                          <td className="py-2 pr-4">{leg.legNumber}</td>
                          <td className="py-2 pr-4">
                            {getMarkShortLabel(leg.fromMark, customCourseMarks[leg.fromMark])}
                          </td>
                          <td className="py-2 pr-4">
                            {getMarkShortLabel(leg.toMark, customCourseMarks[leg.toMark])}
                          </td>
                          <td className="py-2 pr-4">
                            {leg.legNumber === 1 ? "Start" : ""}
                            {leg.legNumber === previewLegDetails.length ? (
                              leg.legNumber === 1 ? " / Finish" : "Finish"
                            ) : null}
                          </td>
                          <td className="py-2 pr-4">
                            {previewCourseRecord?.markRoundings?.[leg.legNumber] === "port"
                              ? "Port"
                              : previewCourseRecord?.markRoundings?.[leg.legNumber] === "starboard"
                                ? "Starboard"
                                : "--"}
                          </td>
                          <td className="py-2 pr-4">{leg.bearingDeg.toFixed(1)} deg</td>
                          <td className="py-2 pr-4">{leg.distanceNmCalculated.toFixed(2)} nm</td>
                          <td className="py-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                                leg.distanceSource === "published_table"
                                  ? "bg-emerald-500/15 text-emerald-100"
                                  : "bg-amber-500/15 text-amber-100"
                              }`}
                            >
                              {leg.distanceSource === "published_table"
                                ? "Sheet Table"
                                : "Geo Fallback"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewLegCautions.length > 0 ? (
                  <div className="mt-4 space-y-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                    {previewLegCautions.map((caution) => (
                      <p key={caution}>{caution}</p>
                    ))}
                  </div>
                ) : null}
              </section>
            </>
          ) : (
            <section className="layline-panel p-5 text-sm text-[color:var(--text-soft)]">
              Add a course name and at least two marks to see the preview.
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
