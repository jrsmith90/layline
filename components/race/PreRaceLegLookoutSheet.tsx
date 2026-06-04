"use client";

import { useMemo } from "react";
import type { CourseSummary } from "@/data/race/getCourseData";
import { buildPreRaceLegLookouts } from "@/lib/race/preRaceLegLookouts";
import type { TacticalBoardDraft } from "@/lib/race/tacticalBoard/store";

type PreRaceLegLookoutSheetProps = {
  courseData: CourseSummary;
  draft: TacticalBoardDraft;
  tone?: "app" | "print";
};

function formatDegrees(value: number) {
  return `${Math.round(value)} deg`;
}

function formatDistance(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)} nm` : "--";
}

export function PreRaceLegLookoutSheet({
  courseData,
  draft,
  tone = "app",
}: PreRaceLegLookoutSheetProps) {
  const lookouts = useMemo(
    () => buildPreRaceLegLookouts({ courseData, draft }),
    [courseData, draft],
  );

  const cardClass =
    tone === "print"
      ? "rounded-2xl border border-slate-200 bg-slate-50 p-4"
      : "rounded-2xl border border-[color:var(--divider)] bg-black/20 p-4";
  const kickerClass =
    tone === "print"
      ? "text-[11px] font-black uppercase tracking-[0.16em] text-slate-500"
      : "text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]";
  const titleClass =
    tone === "print"
      ? "text-base font-black text-slate-950"
      : "text-base font-black text-[color:var(--text)]";
  const metaClass =
    tone === "print" ? "text-sm text-slate-600" : "text-sm text-[color:var(--text-soft)]";
  const bulletClass =
    tone === "print" ? "text-sm leading-6 text-slate-700" : "text-sm leading-6 text-[color:var(--text-soft)]";
  const introClass =
    tone === "print"
      ? "mb-4 text-sm leading-6 text-slate-600"
      : "mb-4 text-sm leading-6 text-[color:var(--text-soft)]";
  const sectionLabelClass =
    tone === "print"
      ? "text-[11px] font-black uppercase tracking-[0.16em] text-slate-500"
      : "text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]";

  if (lookouts.length === 0) {
    return (
      <div className={cardClass}>
        <div className={metaClass}>No leg geometry is loaded for this course yet.</div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <p className={introClass}>
        Use these as the crew’s tactical cue cards: target headings, the current call to favor,
        what would change the call, and the reference lens behind it.
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        {lookouts.map((lookout) => (
          <div key={`${lookout.legNumber}-${lookout.fromLabel}-${lookout.toLabel}`} className={cardClass}>
            <div className={kickerClass}>Leg {lookout.legNumber}</div>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className={titleClass}>
                  {lookout.fromLabel} to {lookout.toLabel}
                </div>
                <div className={`mt-1 ${metaClass}`}>
                  {lookout.modeLabel} · {formatDegrees(lookout.bearingDeg)} · {formatDistance(lookout.distanceNm)}
                </div>
              </div>
            </div>

            {lookout.headingSummary ? (
              <div className="mt-3">
                <div className={sectionLabelClass}>Target Headings</div>
                <div className={`mt-1 ${bulletClass}`}>{lookout.headingSummary}</div>
              </div>
            ) : null}

            <div className="mt-3">
              <div className={sectionLabelClass}>Primary Call</div>
              <div className={`mt-1 ${bulletClass}`}>{lookout.primaryCall}</div>
            </div>

            {lookout.triggerPoints.length > 0 ? (
              <div className="mt-3">
                <div className={sectionLabelClass}>What Changes The Call</div>
                <ul className="mt-2 space-y-2">
                  {lookout.triggerPoints.map((item) => (
                    <li key={item} className={`flex gap-3 ${bulletClass}`}>
                      <span className={tone === "print" ? "mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" : "mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70"} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lookout.referenceInsight.length > 0 ? (
              <div className="mt-3">
                <div className={sectionLabelClass}>Reference Lens</div>
                <ul className="mt-2 space-y-2">
                  {lookout.referenceInsight.map((item) => (
                    <li key={item} className={`flex gap-3 ${bulletClass}`}>
                      <span className={tone === "print" ? "mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" : "mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-200/80"} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
