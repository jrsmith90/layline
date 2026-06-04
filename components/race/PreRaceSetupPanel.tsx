"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { PlannedRaceStartFields } from "@/components/race/PlannedRaceStartFields";
import {
  formatCourseLabel,
  getDefaultCourseId,
} from "@/data/race/getCourseData";
import { getMarkShortLabel } from "@/lib/race/markLabels";
import { useCourseIds, useResolvedCourseData } from "@/lib/race/useCourseCatalogVersion";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  setTacticalBoardCourseId,
  setTacticalBoardDraftField,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";

const DEFAULT_TACTICAL_BOARD_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

function SetupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-[color:var(--text)]">{value}</div>
    </div>
  );
}

function formatDistance(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)} nm` : "--";
}

export function PreRaceSetupPanel() {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_TACTICAL_BOARD_DRAFT,
  );
  const courseIds = useCourseIds();
  const courseData = useResolvedCourseData(draft.courseId);
  const firstMarkLabel = useMemo(
    () =>
      courseData.firstMark
        ? getMarkShortLabel(courseData.firstMark, courseData.marks[courseData.firstMark])
        : "Unknown",
    [courseData.firstMark, courseData.marks],
  );

  return (
    <section className="layline-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="layline-kicker">Selections</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--text)]">
            Set the top-line brief once
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-soft)]">
            Pick the course and planned start here, then use the sections below as the ordered
            crew brief instead of repeating the same setup choices in multiple places.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/race/pre-race/sail-selection"
            className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
          >
            Open Sail Selection
          </Link>
          <Link
            href="/race/courses"
            className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
          >
            Manage Courses
          </Link>
          <Link
            href="/race/constraints"
            className="inline-flex rounded-xl border border-[color:var(--divider)] bg-black/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-[color:var(--text)]"
          >
            Manage Constraints
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[color:var(--text)]">
              Selected course
            </span>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={draft.courseId}
              onChange={(event) => setTacticalBoardCourseId(event.target.value)}
            >
              {courseIds.map((id) => (
                <option key={id} value={id} className="bg-slate-900">
                  {formatCourseLabel(id)}
                </option>
              ))}
            </select>
          </label>

          <PlannedRaceStartFields
            raceDate={draft.raceStartDate}
            raceTime={draft.raceStartTime}
            onRaceDateChange={(value) => setTacticalBoardDraftField("raceStartDate", value)}
            onRaceTimeChange={(value) => setTacticalBoardDraftField("raceStartTime", value)}
            helperText="This same target drives the forecast and current window for the course strategy and the crew export."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SetupMetric label="Selected Course" value={formatCourseLabel(draft.courseId)} />
          <SetupMetric label="First Mark" value={firstMarkLabel} />
          <SetupMetric
            label="First Leg Bearing"
            value={
              courseData.firstLeg?.bearingDeg != null
                ? `${Math.round(courseData.firstLeg.bearingDeg)} deg`
                : "--"
            }
          />
          <SetupMetric
            label="Total Distance"
            value={formatDistance(courseData.totalDistanceNmSI ?? courseData.totalDistanceNmCalculated)}
          />
          <SetupMetric
            label="Hard Constraints"
            value={
              courseData.specialRoutingConstraints.length > 0
                ? `${courseData.specialRoutingConstraints.length} in play`
                : "None attached"
            }
          />
          <SetupMetric
            label="Step 2 Status"
            value={
              draft.confirmedSailSelection?.courseId === draft.courseId
                ? "Sail package confirmed"
                : "Waiting for sail call"
            }
          />
        </div>
      </div>
    </section>
  );
}
