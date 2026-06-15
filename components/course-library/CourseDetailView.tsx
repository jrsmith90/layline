"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Copy, Archive, Flag, Trash2, Plus, X, Check } from "lucide-react";
import type {
  CourseLibraryEntry,
  CourseStatus,
  RaceDebrief,
  RaceResult,
} from "@/types/courseLibrary";
import {
  addRaceResult,
  archiveCourse,
  deactivateCourse,
  deleteCourseLibraryEntry,
  deleteRaceResult,
  duplicateCourseLibraryEntry,
  getCourseLibraryEntries,
  saveDebrief,
  setActiveCourse,
  unarchiveCourse,
  updateRaceResult,
} from "@/lib/courseLibraryStore";

const CourseWaypointMap = dynamic(() => import("./CourseWaypointMap"), { ssr: false });

type Tab = "overview" | "waypoints" | "results" | "debrief" | "history";

type Props = {
  entry: CourseLibraryEntry;
  status: CourseStatus;
  today: string;
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const inputCls =
  "w-full rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--favorable)] focus:outline-none transition-colors";
const labelCls =
  "block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-1";

// ─── Results Panel ─────────────────────────────────────────────────────────

function emptyResult(): Omit<RaceResult, "id" | "recordedAt"> {
  return {
    finishPosition: null,
    fleetSize: null,
    elapsedTime: "",
    correctedTime: "",
    skipper: "",
    crewList: "",
    raceNotes: "",
    weatherNotes: "",
    windDirection: "",
    windSpeedKt: null,
    tideCurrentNotes: "",
  };
}

function ResultsPanel({
  entry,
  onChange,
}: {
  entry: CourseLibraryEntry;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyResult());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RaceResult | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addRaceResult(entry.id, form);
    setForm(emptyResult());
    setAdding(false);
    onChange();
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    updateRaceResult(entry.id, editForm);
    setEditingId(null);
    setEditForm(null);
    onChange();
  }

  function handleDelete(resultId: string) {
    if (!confirm("Delete this result?")) return;
    deleteRaceResult(entry.id, resultId);
    onChange();
  }

  const ResultForm = ({
    value,
    onChange: onFieldChange,
    onSubmit,
    onCancel,
    submitLabel,
  }: {
    value: Omit<RaceResult, "id" | "recordedAt">;
    onChange: (patch: Partial<Omit<RaceResult, "id" | "recordedAt">>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    submitLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Position</label>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={value.finishPosition ?? ""}
            onChange={(e) =>
              onFieldChange({
                finishPosition: e.target.value !== "" ? parseInt(e.target.value) : null,
              })
            }
            placeholder="4"
          />
        </div>
        <div>
          <label className={labelCls}>Fleet Size</label>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={value.fleetSize ?? ""}
            onChange={(e) =>
              onFieldChange({
                fleetSize: e.target.value !== "" ? parseInt(e.target.value) : null,
              })
            }
            placeholder="12"
          />
        </div>
        <div>
          <label className={labelCls}>Elapsed</label>
          <input
            className={inputCls}
            value={value.elapsedTime}
            onChange={(e) => onFieldChange({ elapsedTime: e.target.value })}
            placeholder="1:23:45"
          />
        </div>
        <div>
          <label className={labelCls}>Corrected</label>
          <input
            className={inputCls}
            value={value.correctedTime}
            onChange={(e) => onFieldChange({ correctedTime: e.target.value })}
            placeholder="1:18:02"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Skipper</label>
          <input
            className={inputCls}
            value={value.skipper}
            onChange={(e) => onFieldChange({ skipper: e.target.value })}
            placeholder="Name"
          />
        </div>
        <div>
          <label className={labelCls}>Crew</label>
          <input
            className={inputCls}
            value={value.crewList}
            onChange={(e) => onFieldChange({ crewList: e.target.value })}
            placeholder="Crew A, Crew B, Crew C"
          />
        </div>
        <div>
          <label className={labelCls}>Wind Direction</label>
          <input
            className={inputCls}
            value={value.windDirection}
            onChange={(e) => onFieldChange({ windDirection: e.target.value })}
            placeholder="SW"
          />
        </div>
        <div>
          <label className={labelCls}>Wind Speed (kt)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            className={inputCls}
            value={value.windSpeedKt ?? ""}
            onChange={(e) =>
              onFieldChange({
                windSpeedKt: e.target.value !== "" ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="12"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Race Notes</label>
        <textarea
          rows={2}
          className={inputCls}
          value={value.raceNotes}
          onChange={(e) => onFieldChange({ raceNotes: e.target.value })}
          placeholder="What happened out there..."
        />
      </div>
      <div>
        <label className={labelCls}>Weather Notes</label>
        <textarea
          rows={2}
          className={inputCls}
          value={value.weatherNotes}
          onChange={(e) => onFieldChange({ weatherNotes: e.target.value })}
          placeholder="Conditions, shifts, gusts..."
        />
      </div>
      <div>
        <label className={labelCls}>Tide / Current Notes</label>
        <textarea
          rows={1}
          className={inputCls}
          value={value.tideCurrentNotes}
          onChange={(e) => onFieldChange({ tideCurrentNotes: e.target.value })}
          placeholder="Ebb at 1.1 kt at Thomas Point SE..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="layline-pill px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full bg-[color:var(--favorable)] px-4 py-1.5 text-xs font-black text-[color:var(--bg-deep)]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      {entry.results.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed border-[color:var(--divider)] py-8 text-center text-sm text-[color:var(--muted)]">
          No results recorded yet.
        </div>
      )}

      {entry.results.map((r) =>
        editingId === r.id ? (
          <div key={r.id} className="layline-panel bg-[color:var(--panel)] p-4">
            <ResultForm
              value={editForm!}
              onChange={(patch) =>
                setEditForm((prev) => (prev ? { ...prev, ...patch } : prev))
              }
              onSubmit={handleEditSave}
              onCancel={() => {
                setEditingId(null);
                setEditForm(null);
              }}
              submitLabel="Save"
            />
          </div>
        ) : (
          <div key={r.id} className="layline-panel bg-[color:var(--panel)] p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                {r.finishPosition != null && (
                  <span className="text-2xl font-black text-[color:var(--text)]">
                    {r.finishPosition}
                    {r.fleetSize ? (
                      <span className="text-base font-semibold text-[color:var(--muted)]">
                        /{r.fleetSize}
                      </span>
                    ) : null}
                  </span>
                )}
                {r.elapsedTime && (
                  <span className="ml-3 text-sm text-[color:var(--text-soft)]">
                    {r.elapsedTime}
                    {r.correctedTime ? ` · ${r.correctedTime} corrected` : ""}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(r.id);
                    setEditForm({ ...r });
                  }}
                  className="layline-pill flex h-7 w-7 items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
                >
                  <Edit2 size={12} strokeWidth={2.3} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="layline-pill flex h-7 w-7 items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--unfavorable)] transition-colors"
                >
                  <Trash2 size={12} strokeWidth={2.3} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
              {r.skipper && <span>Skipper: {r.skipper}</span>}
              {r.windDirection && <span>Wind: {r.windDirection}{r.windSpeedKt ? ` ${r.windSpeedKt}kt` : ""}</span>}
            </div>
            {r.raceNotes && (
              <p className="mt-2 text-xs leading-relaxed text-[color:var(--text-soft)]">
                {r.raceNotes}
              </p>
            )}
          </div>
        ),
      )}

      {adding ? (
        <div className="layline-panel bg-[color:var(--panel)] p-4">
          <div className="layline-kicker mb-3">Add Result</div>
          <ResultForm
            value={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleAdd}
            onCancel={() => {
              setAdding(false);
              setForm(emptyResult());
            }}
            submitLabel="Add Result"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="layline-pill flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--favorable)] hover:text-[color:var(--favorable)] transition-colors"
        >
          <Plus size={14} strokeWidth={2.3} />
          Add Result
        </button>
      )}
    </div>
  );
}

// ─── Debrief Panel ─────────────────────────────────────────────────────────

const DEBRIEF_FIELDS: { key: keyof Omit<RaceDebrief, "updatedAt">; label: string }[] = [
  { key: "whatWentWell", label: "What Went Well" },
  { key: "whatWentWrong", label: "What Went Wrong" },
  { key: "tacticalLessons", label: "Tactical Lessons" },
  { key: "sailTrimLessons", label: "Sail Trim Lessons" },
  { key: "startingLessons", label: "Starting Lessons" },
  { key: "crewNotes", label: "Crew Notes" },
  { key: "equipmentIssues", label: "Equipment Issues" },
  { key: "futureImprovements", label: "Future Improvements" },
];

function DebriefPanel({
  entry,
  onChange,
}: {
  entry: CourseLibraryEntry;
  onChange: () => void;
}) {
  const blank: Omit<RaceDebrief, "updatedAt"> = {
    whatWentWell: "",
    whatWentWrong: "",
    tacticalLessons: "",
    sailTrimLessons: "",
    startingLessons: "",
    crewNotes: "",
    equipmentIssues: "",
    futureImprovements: "",
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Omit<RaceDebrief, "updatedAt">>(
    entry.debrief
      ? {
          whatWentWell: entry.debrief.whatWentWell,
          whatWentWrong: entry.debrief.whatWentWrong,
          tacticalLessons: entry.debrief.tacticalLessons,
          sailTrimLessons: entry.debrief.sailTrimLessons,
          startingLessons: entry.debrief.startingLessons,
          crewNotes: entry.debrief.crewNotes,
          equipmentIssues: entry.debrief.equipmentIssues,
          futureImprovements: entry.debrief.futureImprovements,
        }
      : blank,
  );

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveDebrief(entry.id, form);
    setEditing(false);
    onChange();
  }

  if (!editing && !entry.debrief) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-[color:var(--muted)] mb-4">
          No debrief recorded yet.
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="layline-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--favorable)] hover:text-[color:var(--favorable)] transition-colors"
        >
          <Plus size={14} strokeWidth={2.3} />
          Write Debrief
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        {DEBRIEF_FIELDS.map((f) => (
          <div key={f.key}>
            <label className={labelCls}>{f.label}</label>
            <textarea
              rows={3}
              className={inputCls}
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.label + "..."}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pb-8">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="layline-pill px-3 py-1.5 text-sm font-semibold text-[color:var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-[color:var(--favorable)] px-5 py-1.5 text-sm font-black text-[color:var(--bg-deep)]"
          >
            Save Debrief
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <Edit2 size={12} strokeWidth={2.3} />
          Edit Debrief
        </button>
      </div>
      {DEBRIEF_FIELDS.filter((f) => entry.debrief?.[f.key]).map((f) => (
        <div key={f.key} className="layline-panel bg-[color:var(--panel)] p-4">
          <div className="layline-kicker mb-1">{f.label}</div>
          <p className="text-sm leading-relaxed text-[color:var(--text-soft)]">
            {entry.debrief?.[f.key]}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CourseStatus, { text: string; label: string }> = {
  upcoming: { text: "text-[color:var(--blue)]", label: "Upcoming" },
  active: { text: "text-[color:var(--favorable)]", label: "Active Course" },
  completed: { text: "text-[color:var(--muted)]", label: "Completed" },
  archived: { text: "text-[color:var(--muted)]", label: "Archived" },
};

const ROUNDING_LABELS: Record<string, string> = {
  port: "Port",
  starboard: "Starboard",
  none: "—",
};

const WP_TYPE_LABELS: Record<string, string> = {
  start: "Start",
  finish: "Finish",
  mark: "Mark",
  government_mark: "Govt Mark",
  turn: "Turn",
};

export function CourseDetailView({ entry, status, today }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [, forceUpdate] = useState(0);

  const statusStyle = STATUS_STYLES[status];

  function onChange() {
    forceUpdate((n) => n + 1);
  }

  function handleActivate() {
    setActiveCourse(entry.id);
    onChange();
  }

  function handleDeactivate() {
    deactivateCourse(entry.id);
    onChange();
  }

  function handleArchive() {
    archiveCourse(entry.id);
    onChange();
  }

  function handleUnarchive() {
    unarchiveCourse(entry.id);
    onChange();
  }

  function handleDelete() {
    if (!confirm(`Permanently delete "${entry.courseName}"? This cannot be undone.`)) return;
    deleteCourseLibraryEntry(entry.id);
    router.push("/course-library");
  }

  function handleDuplicate() {
    const newEntry = duplicateCourseLibraryEntry(entry.id, {
      courseName: `${entry.courseName} (Copy)`,
    });
    if (newEntry) {
      router.push(`/course-library/${newEntry.id}/edit`);
    }
  }

  // History: entries with same event name, different date
  const history = getCourseLibraryEntries()
    .filter(
      (e) =>
        e.id !== entry.id &&
        e.eventName.toLowerCase() === entry.eventName.toLowerCase(),
    )
    .sort((a, b) => b.raceDate.localeCompare(a.raceDate));

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "waypoints", label: "Waypoints", count: entry.waypoints.length },
    { id: "results", label: "Results", count: entry.results.length || undefined },
    { id: "debrief", label: "Debrief" },
    { id: "history", label: "History", count: history.length || undefined },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={["layline-kicker", statusStyle.text].join(" ")}>
            {statusStyle.label}
          </span>
          {entry.raceType && (
            <span className="layline-kicker">{entry.raceType}</span>
          )}
        </div>
        <h1 className="text-2xl font-black text-[color:var(--text)] leading-tight">
          {entry.courseName}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--muted)]">
          <span>{formatDate(entry.raceDate)}</span>
          {entry.distanceNm != null && <span>{entry.distanceNm} NM</span>}
          {entry.hostClub && <span>{entry.hostClub}</span>}
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/course-library/${entry.id}/edit`}
          className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] hover:border-[color:var(--favorable)] hover:text-[color:var(--favorable)] transition-colors"
        >
          <Edit2 size={12} strokeWidth={2.3} />
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDuplicate}
          className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] hover:border-[color:var(--favorable)] hover:text-[color:var(--favorable)] transition-colors"
        >
          <Copy size={12} strokeWidth={2.3} />
          Duplicate
        </button>
        {status !== "active" && (
          <button
            type="button"
            onClick={handleActivate}
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--favorable)] border-[color:var(--favorable)] hover:bg-[color-mix(in_srgb,var(--favorable)_10%,transparent)] transition-colors"
          >
            <Flag size={12} strokeWidth={2.3} />
            Set Active
          </button>
        )}
        {status === "active" && (
          <button
            type="button"
            onClick={handleDeactivate}
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
          >
            <X size={12} strokeWidth={2.3} />
            Deactivate
          </button>
        )}
        {status !== "archived" ? (
          <button
            type="button"
            onClick={handleArchive}
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
          >
            <Archive size={12} strokeWidth={2.3} />
            Archive
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUnarchive}
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] transition-colors"
          >
            <Check size={12} strokeWidth={2.3} />
            Unarchive
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--unfavorable)] border-transparent hover:border-[color:var(--unfavorable)] transition-colors"
        >
          <Trash2 size={12} strokeWidth={2.3} />
          Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[color:var(--divider)] pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "shrink-0 px-3 py-2 text-xs font-semibold transition-colors",
              tab === t.id
                ? "border-b-2 border-[color:var(--favorable)] text-[color:var(--text)] -mb-px"
                : "text-[color:var(--muted)] hover:text-[color:var(--text-soft)]",
            ].join(" ")}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 rounded-full bg-[color:var(--panel-soft)] px-1.5 py-0.5 text-[10px] font-black text-[color:var(--muted)]">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-5">
          {entry.waypoints.some((w) => w.lat != null && w.lon != null) && (
            <CourseWaypointMap waypoints={entry.waypoints} height="320px" />
          )}

          <div className="layline-panel bg-[color:var(--panel)] p-5">
            <div className="layline-kicker mb-3">Course Details</div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                { label: "Event", value: entry.eventName },
                { label: "Host Club", value: entry.hostClub },
                { label: "Date", value: formatDate(entry.raceDate) },
                { label: "Distance", value: entry.distanceNm != null ? `${entry.distanceNm} NM` : "—" },
                { label: "Race Type", value: entry.raceType || "—" },
                { label: "Start", value: entry.startLocation || "—" },
                { label: "Finish", value: entry.finishLocation || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="layline-kicker text-[10px]">{label}</dt>
                  <dd className="mt-0.5 text-[color:var(--text-soft)]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {entry.description && (
            <div className="layline-panel bg-[color:var(--panel)] p-5">
              <div className="layline-kicker mb-2">Description</div>
              <p className="text-sm leading-relaxed text-[color:var(--text-soft)]">
                {entry.description}
              </p>
            </div>
          )}

          {entry.notes && (
            <div className="layline-panel bg-[color:var(--panel)] p-5">
              <div className="layline-kicker mb-2">Notes</div>
              <p className="text-sm leading-relaxed text-[color:var(--text-soft)]">
                {entry.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "waypoints" && (
        <div className="space-y-4">
          <CourseWaypointMap waypoints={entry.waypoints} height="280px" />
          {entry.waypoints.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[color:var(--divider)] py-8 text-center text-sm text-[color:var(--muted)]">
              No waypoints.{" "}
              <Link
                href={`/course-library/${entry.id}/edit`}
                className="text-[color:var(--favorable)] hover:underline"
              >
                Edit course
              </Link>{" "}
              to add them.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--divider)]">
                    {["#", "Name", "Type", "Rounding", "Lat", "Lon", "Notes"].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-wide text-[color:var(--muted)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entry.waypoints.map((wp, idx) => (
                    <tr
                      key={wp.id}
                      className="border-b border-[color:var(--divider)] last:border-0"
                    >
                      <td className="py-2 pr-4 text-[color:var(--muted)]">{idx + 1}</td>
                      <td className="py-2 pr-4 font-semibold text-[color:var(--text)]">
                        {wp.name || "—"}
                      </td>
                      <td className="py-2 pr-4 text-[color:var(--text-soft)]">
                        {WP_TYPE_LABELS[wp.type] ?? wp.type}
                      </td>
                      <td className="py-2 pr-4 text-[color:var(--text-soft)]">
                        {ROUNDING_LABELS[wp.rounding] ?? wp.rounding}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-[color:var(--muted)]">
                        {wp.lat?.toFixed(4) ?? "—"}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-[color:var(--muted)]">
                        {wp.lon?.toFixed(4) ?? "—"}
                      </td>
                      <td className="py-2 text-xs text-[color:var(--muted)] max-w-[160px] truncate">
                        {wp.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "results" && (
        <ResultsPanel entry={entry} onChange={onChange} />
      )}

      {tab === "debrief" && (
        <DebriefPanel entry={entry} onChange={onChange} />
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[color:var(--divider)] py-8 text-center text-sm text-[color:var(--muted)]">
              No other entries for "{entry.eventName}" found.
            </div>
          ) : (
            history.map((h) => {
              const res = h.results[0];
              return (
                <Link
                  key={h.id}
                  href={`/course-library/${h.id}`}
                  className="layline-panel block bg-[color:var(--panel)] p-4 hover:border-[color:var(--favorable)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-[color:var(--text)]">
                        {h.courseName}
                      </div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {formatDate(h.raceDate)}
                        {h.distanceNm != null ? ` · ${h.distanceNm} NM` : ""}
                      </div>
                    </div>
                    {res?.finishPosition != null && (
                      <div className="text-right">
                        <div className="text-lg font-black text-[color:var(--text)]">
                          {res.finishPosition}
                          {res.fleetSize ? (
                            <span className="text-sm font-semibold text-[color:var(--muted)]">
                              /{res.fleetSize}
                            </span>
                          ) : null}
                        </div>
                        {res.elapsedTime && (
                          <div className="text-xs text-[color:var(--muted)]">{res.elapsedTime}</div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
          <button
            type="button"
            onClick={handleDuplicate}
            className="layline-pill flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[color:var(--text)] hover:border-[color:var(--favorable)] hover:text-[color:var(--favorable)] transition-colors"
          >
            <Copy size={14} strokeWidth={2.3} />
            Create {new Date().getFullYear()} Entry from This Course
          </button>
        </div>
      )}
    </div>
  );
}
