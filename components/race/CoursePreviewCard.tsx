"use client";

import { useMemo, useSyncExternalStore } from "react";
import { formatCourseLabel, getAllCourseIds, getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import CourseChart from "@/components/race/CourseChart";
import { RoutingConstraintsList } from "@/components/race/RoutingConstraintsList";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardCourseId,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const courseIds = getAllCourseIds();
const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

export default function CoursePreviewCard() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseId = draft.courseId;
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);
  const displaySequence =
    courseData.course.sequence ??
    courseData.course.previewSequence ??
    [];
  const courseTextSummary = courseData.course.textSummary ?? [];

  return (
    <div className="space-y-3">
      <section className="layline-panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem] md:items-end">
          <div>
            <div className="layline-kicker">Pre-race course</div>
            <h2 className="mt-1 text-xl font-black">Course preview</h2>
            <p className="layline-learn-only mt-1 text-sm text-[color:var(--muted)]">
              Pick the announced course and check the mark order before leaving the dock.
            </p>
          </div>
          <label className="space-y-1">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Course
            </div>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={courseId}
              onChange={(event) => setTacticalBoardCourseId(event.target.value)}
            >
              {courseIds.map((id) => (
                <option key={id} value={id} className="bg-slate-900">
                  {formatCourseLabel(id)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <CourseChart
        courseData={courseData}
        title={formatCourseLabel(courseId)}
        subtitle={
          displaySequence.length > 0
            ? displaySequence.join(" -> ")
            : "Course sequence announced on VHF 73"
        }
      />

      {courseTextSummary.length > 0 ? (
        <section className="layline-panel p-4">
          <div className="layline-kicker">Course In Text</div>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[color:var(--text-soft)]">
            {courseTextSummary.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {courseData.course.notes ? (
        <section className="layline-panel p-4">
          <div className="layline-kicker">Course Definition</div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
            {courseData.course.notes}
          </p>
        </section>
      ) : null}

      {courseData.specialRoutingConstraints.length > 0 && (
        <section className="layline-panel p-4">
          <div className="layline-kicker">Instructions</div>
          <h2 className="mt-1 text-xl font-black">Hard course constraints</h2>
          <p className="layline-learn-only mt-1 text-sm text-[color:var(--muted)]">
            These instruction limits come from the course definition and race instructions,
            including rounding side and protected routing references.
          </p>
          <div className="mt-4">
            <RoutingConstraintsList constraints={courseData.specialRoutingConstraints} />
          </div>
        </section>
      )}
    </div>
  );
}
