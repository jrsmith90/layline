"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { CourseCard } from "@/components/course-library/CourseCard";
import type { CourseLibraryEntry, CourseLibraryStats, CourseStatus } from "@/types/courseLibrary";
import { computeStats, deriveCourseStatus } from "@/types/courseLibrary";
import {
  archiveCourse,
  deactivateCourse,
  deleteCourseLibraryEntry,
  duplicateCourseLibraryEntry,
  exportCourseLibraryCsv,
  exportCourseLibraryJson,
  getCourseLibraryEntries,
  importCourseLibraryJson,
  initializeCourseLibrary,
  setActiveCourse,
  subscribeCourseLibraryStore,
  unarchiveCourse,
} from "@/lib/courseLibraryStore";
import { COURSE_LIBRARY_SEED_DATA } from "@/lib/courseLibrarySeedData";
import { useRouter } from "next/navigation";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getUniqueYears(entries: CourseLibraryEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.raceDate.slice(0, 4)))).sort(
    (a, b) => b.localeCompare(a),
  );
}

function getUniqueEvents(entries: CourseLibraryEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.eventName).filter(Boolean))).sort();
}

function StatChip({ label, value }: { label: string; value: string | number | null }) {
  if (value == null) return null;
  return (
    <div className="layline-panel shrink-0 bg-[color:var(--panel)] px-4 py-2.5 text-center">
      <div className="text-lg font-black text-[color:var(--text)]">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--muted)]">
        {label}
      </div>
    </div>
  );
}

function StatsStrip({ stats }: { stats: CourseLibraryStats }) {
  const chips: Array<{ label: string; value: string | number | null }> = [
    { label: "Races", value: stats.totalRaces },
    { label: "Wins", value: stats.wins },
    { label: "Top 3", value: stats.topThree },
    { label: "Avg Finish", value: stats.avgFinish },
    { label: "Best Finish", value: stats.bestFinish },
    {
      label: "Total Miles",
      value: stats.totalMilesRaced > 0 ? `${stats.totalMilesRaced} NM` : null,
    },
    {
      label: "Longest Race",
      value: stats.longestRace != null ? `${stats.longestRace} NM` : null,
    },
    { label: "Gov Cup", value: stats.governorsCupStarts || null },
    { label: "Nationals", value: stats.nationalsStarts || null },
    { label: "Beer Can", value: stats.beerCanStarts || null },
    { label: "Distance", value: stats.distanceRaces || null },
    { label: "Buoy", value: stats.buoyRaces || null },
  ].filter((c) => c.value != null);

  if (chips.length === 0) return null;

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {chips.map((c) => (
        <StatChip key={c.label} label={c.label} value={c.value} />
      ))}
    </div>
  );
}

function SectionHead({
  label,
  count,
  empty,
}: {
  label: string;
  count: number;
  empty?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5 border-b border-[color:var(--divider)] pb-2">
      <span className="layline-kicker">{label}</span>
      {count > 0 && (
        <span className="rounded-full bg-[color:var(--panel-soft)] px-2 py-0.5 text-[10px] font-black text-[color:var(--muted)]">
          {count}
        </span>
      )}
      {empty && (
        <span className="text-xs text-[color:var(--muted)]">None</span>
      )}
    </div>
  );
}

export default function CourseLibraryPage() {
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | CourseStatus>("all");
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const entries = useSyncExternalStore(
    subscribeCourseLibraryStore,
    getCourseLibraryEntries,
    () => [],
  );

  useEffect(() => {
    if (!initialized) {
      initializeCourseLibrary(COURSE_LIBRARY_SEED_DATA);
      setInitialized(true);
    }
  }, [initialized]);

  const today = getToday();

  const withStatus = entries.map((e) => ({
    entry: e,
    status: deriveCourseStatus(e, today),
  }));

  const stats = computeStats(entries, today);
  const years = getUniqueYears(entries);
  const events = getUniqueEvents(entries);

  function matches(e: CourseLibraryEntry): boolean {
    if (filterYear !== "all" && !e.raceDate.startsWith(filterYear)) return false;
    if (filterEvent !== "all" && e.eventName !== filterEvent) return false;
    if (
      search.trim() &&
      ![e.courseName, e.eventName, e.hostClub, e.notes, e.description]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
      return false;
    return true;
  }

  const filtered = withStatus.filter(
    ({ entry, status }) =>
      matches(entry) &&
      (filterStatus === "all" || status === filterStatus),
  );

  const active = filtered.filter(({ status }) => status === "active");
  const upcoming = filtered
    .filter(({ status }) => status === "upcoming")
    .sort((a, b) => a.entry.raceDate.localeCompare(b.entry.raceDate));
  const completed = filtered
    .filter(({ status }) => status === "completed")
    .sort((a, b) => b.entry.raceDate.localeCompare(a.entry.raceDate));
  const archived = filtered
    .filter(({ status }) => status === "archived")
    .sort((a, b) => b.entry.raceDate.localeCompare(a.entry.raceDate));

  function handleDuplicate(entry: CourseLibraryEntry) {
    const newEntry = duplicateCourseLibraryEntry(entry.id, {
      courseName: `${entry.courseName} (Copy)`,
    });
    if (newEntry) {
      router.push(`/course-library/${newEntry.id}/edit`);
    }
  }

  function handleExportJson() {
    const json = exportCourseLibraryJson();
    downloadFile(json, `layline-courses-${today}.json`, "application/json");
  }

  function handleExportCsv() {
    const csv = exportCourseLibraryCsv();
    downloadFile(csv, `layline-courses-${today}.csv`, "text/csv");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = importCourseLibraryJson(text);
      if (result.error) {
        setImportMsg(`Import failed: ${result.error}`);
      } else {
        setImportMsg(`Imported ${result.imported} course${result.imported !== 1 ? "s" : ""}`);
      }
      setTimeout(() => setImportMsg(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const cardProps = (entry: CourseLibraryEntry, status: CourseStatus) => ({
    entry,
    status,
    onActivate: () => setActiveCourse(entry.id),
    onDeactivate: () => deactivateCourse(entry.id),
    onArchive: () => archiveCourse(entry.id),
    onUnarchive: () => unarchiveCourse(entry.id),
    onDelete: () => {
      if (confirm(`Delete "${entry.courseName}"?`)) deleteCourseLibraryEntry(entry.id);
    },
    onDuplicate: () => handleDuplicate(entry),
  });

  const selectCls =
    "rounded-full border border-[color:var(--divider)] bg-[color:var(--panel-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] focus:outline-none focus:border-[color:var(--favorable)]";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="layline-kicker mb-1">Course Library</div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">Race History &amp; Planner</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Create, manage, and analyze all your sailing races
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            title="Export JSON"
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
          >
            <Download size={12} strokeWidth={2.3} />
            JSON
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            title="Export CSV"
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
          >
            <Download size={12} strokeWidth={2.3} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            title="Import JSON"
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
          >
            <Upload size={12} strokeWidth={2.3} />
            Import
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Link
            href="/course-library/new"
            className="flex items-center gap-1.5 rounded-full bg-[color:var(--favorable)] px-4 py-1.5 text-xs font-black text-[color:var(--bg-deep)] transition-opacity hover:opacity-90"
          >
            <Plus size={13} strokeWidth={2.5} />
            New Course
          </Link>
        </div>
      </div>

      {importMsg && (
        <div className="mb-4 rounded-lg border border-[color:var(--favorable)] bg-[color-mix(in_srgb,var(--favorable)_10%,transparent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--favorable)]">
          {importMsg}
        </div>
      )}

      {/* Stats */}
      {entries.length > 0 && <StatsStrip stats={stats} />}

      {/* Search + Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={13}
            strokeWidth={2.3}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-full border border-[color:var(--divider)] bg-[color:var(--panel-soft)] py-1.5 pl-8 pr-3 text-xs font-semibold text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--favorable)] focus:outline-none"
          />
        </div>
        <select
          className={selectCls}
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
        >
          <option value="all">All Events</option>
          {events.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | CourseStatus)}
        >
          <option value="all">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Active Course */}
      {active.length > 0 && (
        <div className="mb-8">
          <SectionHead label="Active Course" count={active.length} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map(({ entry, status }) => (
              <CourseCard key={entry.id} {...cardProps(entry, status)} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {(filterStatus === "all" || filterStatus === "upcoming") && (
        <div className="mb-8">
          <SectionHead label="Upcoming" count={upcoming.length} empty={upcoming.length === 0} />
          {upcoming.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(({ entry, status }) => (
                <CourseCard key={entry.id} {...cardProps(entry, status)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {(filterStatus === "all" || filterStatus === "completed") && (
        <div className="mb-8">
          <SectionHead
            label="Completed"
            count={completed.length}
            empty={completed.length === 0}
          />
          {completed.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map(({ entry, status }) => (
                <CourseCard key={entry.id} {...cardProps(entry, status)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archived */}
      {(filterStatus === "all" || filterStatus === "archived") && archived.length > 0 && (
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="mb-3 flex w-full items-center gap-2 border-b border-[color:var(--divider)] pb-2 text-left"
          >
            {showArchived ? (
              <ChevronDown size={13} strokeWidth={2.3} className="text-[color:var(--muted)]" />
            ) : (
              <ChevronRight size={13} strokeWidth={2.3} className="text-[color:var(--muted)]" />
            )}
            <span className="layline-kicker">Archived</span>
            <span className="rounded-full bg-[color:var(--panel-soft)] px-2 py-0.5 text-[10px] font-black text-[color:var(--muted)]">
              {archived.length}
            </span>
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map(({ entry, status }) => (
                <CourseCard key={entry.id} {...cardProps(entry, status)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="py-16 text-center">
          <div className="mb-4 text-4xl">⛵</div>
          <div className="text-lg font-black text-[color:var(--text)]">No courses yet</div>
          <p className="mb-6 mt-2 text-sm text-[color:var(--muted)]">
            Create your first race course to get started.
          </p>
          <Link
            href="/course-library/new"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--favorable)] px-5 py-2 text-sm font-black text-[color:var(--bg-deep)]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Create First Course
          </Link>
        </div>
      )}

      {/* No-results state */}
      {entries.length > 0 &&
        active.length === 0 &&
        upcoming.length === 0 &&
        completed.length === 0 &&
        archived.length === 0 && (
          <div className="py-12 text-center text-sm text-[color:var(--muted)]">
            No courses match your search or filters.
          </div>
        )}
    </div>
  );
}
