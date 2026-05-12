"use client";

import { useMemo, useState } from "react";
import { formatCourseLabel, getAllCourseIds, getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import CourseChart from "@/components/race/CourseChart";

const courseIds = getAllCourseIds();

export default function CoursePreviewCard() {
  const [courseId, setCourseId] = useState<string>(getDefaultCourseId);
  const courseData = useMemo(() => getCourseData(courseId), [courseId]);

  return (
    <div className="space-y-3">
      <section className="layline-panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem] md:items-end">
          <div>
            <div className="layline-kicker">Pre-race course</div>
            <h2 className="mt-1 text-xl font-black">Course preview</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
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
              onChange={(event) => setCourseId(event.target.value)}
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
          courseData.course.sequence
            ? courseData.course.sequence.join(" -> ")
            : "Course sequence unavailable"
        }
      />
    </div>
  );
}
