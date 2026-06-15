"use client";

import Link from "next/link";
import { Archive, Copy, Flag, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CourseLibraryEntry, CourseStatus } from "@/types/courseLibrary";

type Props = {
  entry: CourseLibraryEntry;
  status: CourseStatus;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
};

const STATUS_STYLES: Record<CourseStatus, { bg: string; text: string; label: string }> = {
  upcoming: {
    bg: "bg-[color-mix(in_srgb,var(--blue)_15%,transparent)]",
    text: "text-[color:var(--blue)]",
    label: "Upcoming",
  },
  active: {
    bg: "bg-[color-mix(in_srgb,var(--favorable)_15%,transparent)]",
    text: "text-[color:var(--favorable)]",
    label: "Active",
  },
  completed: {
    bg: "bg-[color-mix(in_srgb,var(--muted)_15%,transparent)]",
    text: "text-[color:var(--muted)]",
    label: "Completed",
  },
  archived: {
    bg: "bg-[color-mix(in_srgb,var(--muted)_10%,transparent)]",
    text: "text-[color:var(--muted)]",
    label: "Archived",
  },
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CourseCard({
  entry,
  status,
  onActivate,
  onDeactivate,
  onArchive,
  onUnarchive,
  onDelete,
  onDuplicate,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const style = STATUS_STYLES[status];
  const bestResult =
    entry.results.length > 0
      ? entry.results.reduce(
          (best, r) =>
            r.finishPosition != null &&
            (best.finishPosition == null || r.finishPosition < best.finishPosition)
              ? r
              : best,
          entry.results[0]!,
        )
      : null;

  return (
    <div
      className={[
        "layline-panel relative overflow-hidden bg-[color:var(--panel)] transition-shadow",
        status === "active"
          ? "border-[color:var(--favorable)] shadow-[0_0_0_1px_var(--favorable)]"
          : "",
      ].join(" ")}
    >
      {status === "active" && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--favorable)]" />
      )}

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/course-library/${entry.id}`}
              className="block text-sm font-black text-[color:var(--text)] hover:text-[color:var(--favorable)] transition-colors leading-tight"
            >
              {entry.courseName}
            </Link>
            {entry.eventName !== entry.courseName && (
              <div className="mt-0.5 text-xs text-[color:var(--muted)] truncate">
                {entry.eventName}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={[
                "layline-kicker rounded-full px-2 py-0.5 text-[10px]",
                style.bg,
                style.text,
              ].join(" ")}
            >
              {style.label}
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="layline-pill flex h-7 w-7 items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal size={13} strokeWidth={2.5} />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-20 min-w-[160px] layline-panel bg-[color:var(--panel-soft)] shadow-lg overflow-hidden">
                    {status !== "active" && onActivate && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--text)] hover:bg-[color:var(--panel)] transition-colors"
                        onClick={() => {
                          onActivate();
                          setMenuOpen(false);
                        }}
                      >
                        <Flag size={12} strokeWidth={2.3} />
                        Set as Active
                      </button>
                    )}
                    {status === "active" && onDeactivate && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--text)] hover:bg-[color:var(--panel)] transition-colors"
                        onClick={() => {
                          onDeactivate();
                          setMenuOpen(false);
                        }}
                      >
                        <Flag size={12} strokeWidth={2.3} />
                        Deactivate
                      </button>
                    )}
                    {onDuplicate && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--text)] hover:bg-[color:var(--panel)] transition-colors"
                        onClick={() => {
                          onDuplicate();
                          setMenuOpen(false);
                        }}
                      >
                        <Copy size={12} strokeWidth={2.3} />
                        Duplicate
                      </button>
                    )}
                    {status !== "archived" && onArchive && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--muted)] hover:bg-[color:var(--panel)] transition-colors"
                        onClick={() => {
                          onArchive();
                          setMenuOpen(false);
                        }}
                      >
                        <Archive size={12} strokeWidth={2.3} />
                        Archive
                      </button>
                    )}
                    {status === "archived" && onUnarchive && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--text)] hover:bg-[color:var(--panel)] transition-colors"
                        onClick={() => {
                          onUnarchive();
                          setMenuOpen(false);
                        }}
                      >
                        <Archive size={12} strokeWidth={2.3} />
                        Unarchive
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--unfavorable)] hover:bg-[color:var(--panel)] transition-colors"
                        onClick={() => {
                          if (confirm(`Delete "${entry.courseName}"?`)) {
                            onDelete();
                          }
                          setMenuOpen(false);
                        }}
                      >
                        <Trash2 size={12} strokeWidth={2.3} />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
          <span>{formatDate(entry.raceDate)}</span>
          {entry.distanceNm != null && <span>{entry.distanceNm} NM</span>}
          {entry.raceType && <span>{entry.raceType}</span>}
          {entry.hostClub && <span>{entry.hostClub}</span>}
        </div>

        {bestResult && bestResult.finishPosition != null && (
          <div className="mt-2 flex items-center gap-1.5">
            <Star
              size={11}
              strokeWidth={2.3}
              className={
                bestResult.finishPosition <= 3
                  ? "text-[color:var(--warning)]"
                  : "text-[color:var(--muted)]"
              }
            />
            <span className="text-xs text-[color:var(--text-soft)]">
              {bestResult.finishPosition}
              {bestResult.fleetSize ? `/${bestResult.fleetSize}` : ""}
              {bestResult.elapsedTime ? ` · ${bestResult.elapsedTime}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
