"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  formatCourseLabel,
  getCourseData,
  getDefaultCourseId,
} from "@/data/race/getCourseData";
import { wrap360 } from "@/lib/race/courseTracker";
import { getMarkShortLabel } from "@/lib/race/markLabels";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function formatHeading(value: number) {
  return `${Math.round(wrap360(value))} deg`;
}

function formatDistance(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(2)} nm`;
}

function readTackAngle(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 42;
  return Math.min(60, Math.max(30, parsed));
}

export function PreRaceLegHeadingChart() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseData = useMemo(() => getCourseData(draft.courseId), [draft.courseId]);
  const tackAngleDeg = readTackAngle(draft.tackAngleDeg);
  const rows = useMemo(
    () =>
      courseData.course.legs.map((leg) => ({
        legNumber: leg.legNumber,
        fromLabel: getMarkShortLabel(leg.fromMark, courseData.marks[leg.fromMark]),
        toLabel: getMarkShortLabel(leg.toMark, courseData.marks[leg.toMark]),
        bearingDeg: leg.bearingDeg,
        portHeadingDeg: wrap360(leg.bearingDeg + tackAngleDeg),
        starboardHeadingDeg: wrap360(leg.bearingDeg - tackAngleDeg),
        distanceNm: leg.distanceNmCalculated,
      })),
    [courseData.course.legs, courseData.marks, tackAngleDeg],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4 text-sm text-[color:var(--text-soft)]">
        No leg geometry is loaded for this course yet.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Selected Course
          </div>
          <div className="mt-2 text-sm font-black text-[color:var(--text)]">
            {formatCourseLabel(draft.courseId)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Tack Angle
          </div>
          <div className="mt-2 text-sm font-black text-[color:var(--text)]">
            {Math.round(tackAngleDeg)} deg
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Total Legs
          </div>
          <div className="mt-2 text-sm font-black text-[color:var(--text)]">{rows.length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-4 text-sm leading-6 text-[color:var(--text-soft)]">
        This chart offsets each published mark-to-mark bearing by your saved tack angle to show a
        quick port and starboard target heading for every leg. Update the tack angle in the
        tactical board inputs if you want this reference to move.
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[color:var(--divider)] bg-black/20">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[color:var(--divider)] bg-black/20">
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Leg
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                From
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                To
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Bearing
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Port Tack
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Starboard Tack
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Distance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.legNumber}-${row.fromLabel}-${row.toLabel}`}
                className={index === rows.length - 1 ? "" : "border-b border-[color:var(--divider)]"}
              >
                <td className="px-4 py-3 text-sm font-black text-[color:var(--text)]">
                  {row.legNumber}
                </td>
                <td className="px-4 py-3 text-sm text-[color:var(--text)]">{row.fromLabel}</td>
                <td className="px-4 py-3 text-sm text-[color:var(--text)]">{row.toLabel}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[color:var(--text)]">
                  {formatHeading(row.bearingDeg)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-100">
                  {formatHeading(row.portHeadingDeg)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-cyan-100">
                  {formatHeading(row.starboardHeadingDeg)}
                </td>
                <td className="px-4 py-3 text-sm text-[color:var(--text-soft)]">
                  {formatDistance(row.distanceNm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
