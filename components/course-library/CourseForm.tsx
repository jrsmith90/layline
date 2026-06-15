"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type {
  CourseLibraryEntry,
  CourseManualStatus,
  CourseWaypoint,
  RoundingDirection,
  WaypointType,
} from "@/types/courseLibrary";
import {
  createCourseLibraryEntry,
  saveCourseLibraryEntry,
} from "@/lib/courseLibraryStore";

const RACE_TYPES = [
  "Buoy Racing",
  "Beer Can / Buoy",
  "Beer Can / Twilight",
  "Distance Race",
  "Point-to-Point Offshore",
  "Offshore Overnight",
  "One Design Series",
  "PHRF",
  "IRC",
  "Other",
];

const WAYPOINT_TYPES: { value: WaypointType; label: string }[] = [
  { value: "start", label: "Start" },
  { value: "mark", label: "Mark" },
  { value: "government_mark", label: "Government Mark" },
  { value: "turn", label: "Turn" },
  { value: "finish", label: "Finish" },
];

const ROUNDING_DIRECTIONS: { value: RoundingDirection; label: string }[] = [
  { value: "port", label: "Port" },
  { value: "starboard", label: "Starboard" },
  { value: "none", label: "None" },
];

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyWaypoint(): CourseWaypoint {
  return {
    id: generateId(),
    name: "",
    lat: null,
    lon: null,
    type: "mark",
    rounding: "port",
    notes: "",
  };
}

type FormState = {
  courseName: string;
  eventName: string;
  hostClub: string;
  raceDate: string;
  raceType: string;
  description: string;
  startLocation: string;
  finishLocation: string;
  distanceNm: string;
  notes: string;
  waypoints: CourseWaypoint[];
};

function entryToFormState(entry: CourseLibraryEntry): FormState {
  return {
    courseName: entry.courseName,
    eventName: entry.eventName,
    hostClub: entry.hostClub,
    raceDate: entry.raceDate,
    raceType: entry.raceType,
    description: entry.description,
    startLocation: entry.startLocation,
    finishLocation: entry.finishLocation,
    distanceNm: entry.distanceNm != null ? String(entry.distanceNm) : "",
    notes: entry.notes,
    waypoints: entry.waypoints.map((w) => ({ ...w })),
  };
}

type Props = {
  existing?: CourseLibraryEntry;
  defaultManualStatus?: CourseManualStatus;
};

export function CourseForm({ existing, defaultManualStatus = null }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    existing
      ? entryToFormState(existing)
      : {
          courseName: "",
          eventName: "",
          hostClub: "",
          raceDate: "",
          raceType: "Buoy Racing",
          description: "",
          startLocation: "",
          finishLocation: "",
          distanceNm: "",
          notes: "",
          waypoints: [],
        },
  );
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof Omit<FormState, "waypoints">>(
    key: K,
    value: FormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addWaypoint() {
    setForm((f) => ({ ...f, waypoints: [...f.waypoints, emptyWaypoint()] }));
  }

  function removeWaypoint(index: number) {
    setForm((f) => ({
      ...f,
      waypoints: f.waypoints.filter((_, i) => i !== index),
    }));
  }

  function updateWaypoint(index: number, patch: Partial<CourseWaypoint>) {
    setForm((f) => ({
      ...f,
      waypoints: f.waypoints.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    }));
  }

  function moveWaypoint(from: number, to: number) {
    setForm((f) => {
      const wps = [...f.waypoints];
      const [item] = wps.splice(from, 1);
      if (item) wps.splice(to, 0, item);
      return { ...f, waypoints: wps };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseName.trim() || !form.raceDate) return;
    setSaving(true);

    const fields = {
      courseName: form.courseName.trim(),
      eventName: form.eventName.trim() || form.courseName.trim(),
      hostClub: form.hostClub.trim(),
      raceDate: form.raceDate,
      raceType: form.raceType,
      description: form.description.trim(),
      startLocation: form.startLocation.trim(),
      finishLocation: form.finishLocation.trim(),
      distanceNm: form.distanceNm !== "" ? parseFloat(form.distanceNm) : null,
      notes: form.notes.trim(),
      waypoints: form.waypoints,
      manualStatus: existing?.manualStatus ?? defaultManualStatus,
    };

    if (existing) {
      saveCourseLibraryEntry({
        ...existing,
        ...fields,
        updatedAt: new Date().toISOString(),
      });
      router.push(`/course-library/${existing.id}`);
    } else {
      const entry = createCourseLibraryEntry(fields);
      router.push(`/course-library/${entry.id}`);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--favorable)] focus:outline-none transition-colors";
  const labelCls = "block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Course Info */}
      <div className="layline-panel bg-[color:var(--panel)] p-5">
        <div className="layline-kicker mb-4">Course Information</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Course Name *</label>
            <input
              className={inputCls}
              value={form.courseName}
              onChange={(e) => setField("courseName", e.target.value)}
              placeholder="Governor's Cup 2026"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Event Name</label>
            <input
              className={inputCls}
              value={form.eventName}
              onChange={(e) => setField("eventName", e.target.value)}
              placeholder="Governor's Cup Yacht Race (defaults to Course Name)"
            />
          </div>
          <div>
            <label className={labelCls}>Host Club</label>
            <input
              className={inputCls}
              value={form.hostClub}
              onChange={(e) => setField("hostClub", e.target.value)}
              placeholder="Annapolis Yacht Club"
            />
          </div>
          <div>
            <label className={labelCls}>Race Date *</label>
            <input
              type="date"
              className={inputCls}
              value={form.raceDate}
              onChange={(e) => setField("raceDate", e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Race Type</label>
            <select
              className={inputCls}
              value={form.raceType}
              onChange={(e) => setField("raceType", e.target.value)}
            >
              {RACE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Distance (NM)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              className={inputCls}
              value={form.distanceNm}
              onChange={(e) => setField("distanceNm", e.target.value)}
              placeholder="68.6"
            />
          </div>
          <div>
            <label className={labelCls}>Start Location</label>
            <input
              className={inputCls}
              value={form.startLocation}
              onChange={(e) => setField("startLocation", e.target.value)}
              placeholder="Annapolis R2"
            />
          </div>
          <div>
            <label className={labelCls}>Finish Location</label>
            <input
              className={inputCls}
              value={form.finishLocation}
              onChange={(e) => setField("finishLocation", e.target.value)}
              placeholder="Church Point"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Brief description of the race..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Warning signal times, SIs, special instructions..."
            />
          </div>
        </div>
      </div>

      {/* Waypoints */}
      <div className="layline-panel bg-[color:var(--panel)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="layline-kicker">Waypoints</div>
            <div className="mt-0.5 text-xs text-[color:var(--muted)]">
              Add marks in order. Drag to reorder.
            </div>
          </div>
          <button
            type="button"
            onClick={addWaypoint}
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] hover:border-[color:var(--favorable)] hover:text-[color:var(--favorable)] transition-colors"
          >
            <Plus size={12} strokeWidth={2.5} />
            Add Waypoint
          </button>
        </div>

        {form.waypoints.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--divider)] py-8 text-center text-sm text-[color:var(--muted)]">
            No waypoints yet. Click "Add Waypoint" to start.
          </div>
        ) : (
          <div className="space-y-3">
            {form.waypoints.map((wp, idx) => (
              <div
                key={wp.id}
                className="rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--panel-soft)] text-[10px] font-black text-[color:var(--muted)]">
                      {idx + 1}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveWaypoint(idx, idx - 1)}
                        className="text-[color:var(--muted)] hover:text-[color:var(--text)] disabled:opacity-30 transition-colors"
                        title="Move up"
                      >
                        <GripVertical size={13} strokeWidth={2.3} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWaypoint(idx)}
                    className="text-[color:var(--muted)] hover:text-[color:var(--unfavorable)] transition-colors"
                    aria-label="Remove waypoint"
                  >
                    <Trash2 size={13} strokeWidth={2.3} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="col-span-2 sm:col-span-3">
                    <input
                      className={inputCls}
                      value={wp.name}
                      onChange={(e) => updateWaypoint(idx, { name: e.target.value })}
                      placeholder={`Waypoint ${idx + 1} name`}
                    />
                  </div>
                  <div>
                    <select
                      className={inputCls}
                      value={wp.type}
                      onChange={(e) =>
                        updateWaypoint(idx, { type: e.target.value as WaypointType })
                      }
                    >
                      {WAYPOINT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      className={inputCls}
                      value={wp.rounding}
                      onChange={(e) =>
                        updateWaypoint(idx, {
                          rounding: e.target.value as RoundingDirection,
                        })
                      }
                    >
                      {ROUNDING_DIRECTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.0001"
                      className={inputCls}
                      value={wp.lat ?? ""}
                      onChange={(e) =>
                        updateWaypoint(idx, {
                          lat: e.target.value !== "" ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="Lat (38.9417)"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.0001"
                      className={inputCls}
                      value={wp.lon ?? ""}
                      onChange={(e) =>
                        updateWaypoint(idx, {
                          lon: e.target.value !== "" ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="Lon (-76.4247)"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <input
                      className={inputCls}
                      value={wp.notes}
                      onChange={(e) => updateWaypoint(idx, { notes: e.target.value })}
                      placeholder="Notes (optional)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="layline-pill px-4 py-2 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.courseName.trim() || !form.raceDate}
          className="rounded-full bg-[color:var(--favorable)] px-6 py-2 text-sm font-black text-[color:var(--bg-deep)] disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving…" : existing ? "Save Changes" : "Create Course"}
        </button>
      </div>
    </form>
  );
}
