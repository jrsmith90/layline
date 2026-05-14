"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import CourseChart from "@/components/race/CourseChart";
import { formatCourseLabel, getCourseData } from "@/data/race/getCourseData";
import {
  buildRaceSessionReview,
  deleteRaceSession,
  downloadTextFile,
  exportRaceSessionJson,
  getMostRecentRaceSession,
  getRaceSessions,
  recoverTodayRaceSession,
  subscribeRaceSessionStore,
  syncRaceSessionsFromRepository,
  updateRaceDecision,
  type RaceDecisionRecord,
} from "@/lib/raceSessionStore";

function formatDateTime(iso?: string) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString();
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(decimals)
    : "--";
}

function decisionTone(decision: RaceDecisionRecord) {
  if (decision.outcome === "worse" || decision.userAction === "ignored") {
    return "border-red-400/40 bg-red-400/10";
  }
  if (decision.outcome === "better") return "border-emerald-400/35 bg-emerald-400/10";
  if (decision.outcome === "same") return "border-white/10 bg-white/5";
  return "border-amber-300/35 bg-amber-300/10";
}

function gradeLabel(grade: string) {
  if (grade === "sharp") return "Sharp";
  if (grade === "solid") return "Solid";
  if (grade === "mixed") return "Mixed";
  if (grade === "needs_work") return "Needs work";
  return "Needs ratings";
}

export default function RaceReviewPage() {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const sessions = getRaceSessions();
  const mostRecent = getMostRecentRaceSession();
  const [selectedId, setSelectedId] = useState(mostRecent?.id ?? "");
  const effectiveSelectedId = selectedId || mostRecent?.id || "";
  const session =
    sessions.find((candidate) => candidate.id === effectiveSelectedId) ?? mostRecent;
  const review = session ? buildRaceSessionReview(session) : null;
  const reviewCourseData = session?.courseId ? getCourseData(session.courseId) : null;

  useEffect(() => subscribeRaceSessionStore(() => refresh()), []);

  useEffect(() => {
    void syncRaceSessionsFromRepository().then(() => refresh());
  }, []);

  function recoverToday() {
    const recovered = recoverTodayRaceSession();
    setSelectedId(recovered.id);
    refresh();
  }

  function patchDecision(decisionId: string, patch: Partial<RaceDecisionRecord>) {
    if (!session) return;
    updateRaceDecision(session.id, decisionId, patch);
    refresh();
  }

  function removeSession(id: string) {
    deleteRaceSession(id);
    const next = getMostRecentRaceSession();
    setSelectedId(next?.id ?? "");
    refresh();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="layline-kicker">Post-race</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">After Action Report</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
            Quantify the day automatically, review the calls, and turn misses into the next practice plan.
          </p>
        </div>
        <Link
          href="/race/live"
          className="rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
        >
          Race cockpit
        </Link>
      </div>

      <section className="layline-panel p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="space-y-1">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Session
            </div>
            <select
              className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 p-3"
              value={session?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {sessions.length === 0 && <option value="">No sessions yet</option>}
              {sessions.map((candidate) => (
                <option key={candidate.id} value={candidate.id} className="bg-slate-900">
                  {candidate.name} · {formatDateTime(candidate.startedAtISO)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={recoverToday}
            className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 px-4 py-3 text-sm font-black uppercase tracking-wide text-teal-50"
          >
            <RotateCcw size={16} />
            Recover Today
          </button>

          {session && (
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `layline-race-${session.startedAtISO.slice(0, 10)}.json`,
                  exportRaceSessionJson(session),
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--divider)] bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-wide"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
      </section>

      {!session || !review ? (
        <section className="layline-panel p-5">
          <h2 className="text-xl font-black">No race session yet</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            On the phone you used today, tap Recover Today. For future races, start the Race
            Recorder in the live cockpit before the warning signal.
          </p>
        </section>
      ) : (
        <>
          <section className="layline-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{session.name}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {formatDateTime(session.startedAtISO)} to {formatDateTime(session.endedAtISO)}
                  {session.courseId ? ` · ${formatCourseLabel(session.courseId)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSession(session.id)}
                className="flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-7">
              <Metric label="Minutes" value={formatNumber(review.durationMin, 0)} />
              <Metric label="GPS" value={String(review.gpsPointCount)} />
              <Metric label="Weather" value={String(review.weatherSampleCount)} />
              <Metric label="Choices" value={String(review.decisionCount)} />
              <Metric label="Tacks" value={String(session.tackCalibrations.length)} />
              <Metric label="Avg SOG" value={`${formatNumber(review.averageSogKt)} kt`} />
              <Metric label="Max SOG" value={`${formatNumber(review.maxSogKt)} kt`} />
            </div>
          </section>

          {reviewCourseData && (
            <CourseChart
              courseData={reviewCourseData}
              track={session.gpsTrack}
              title="Course vs sailed track"
              subtitle="Use the GPS overlay to spot missed laylines, extra distance, and sections sailed away from the planned shape."
            />
          )}

          <section className="layline-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Decision Score</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Auto-rated against the goal: cross the finish line in the least time.
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--favorable)] bg-[color:var(--favorable)]/15 px-4 py-3 text-right">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Overall
                </div>
                <div className="mt-1 text-2xl font-black">
                  {review.decisionScorePct == null ? "--" : `${review.decisionScorePct}%`}
                </div>
                <div className="text-xs font-bold uppercase tracking-wide">
                  {gradeLabel(review.decisionGrade)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Good" value={String(review.goodDecisionCount)} />
              <Metric label="Neutral" value={String(review.neutralDecisionCount)} />
              <Metric label="Bad" value={String(review.badDecisionCount)} />
              <Metric label="Unrated" value={String(review.unratedDecisionCount)} />
            </div>
          </section>

          <section className="layline-panel p-4">
            <h2 className="text-xl font-black">Coaching Signals</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {review.coachingSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6"
                >
                  {signal}
                </div>
              ))}
            </div>
          </section>

          <section className="layline-panel p-4">
            <h2 className="text-xl font-black">Work On Next</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {review.workOnNext.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[color:var(--favorable)]/30 bg-[color:var(--favorable)]/10 p-4 text-sm leading-6"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="layline-panel p-4">
            <h2 className="text-xl font-black">Weather and Course Split</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric
                label="Top-bottom speed"
                value={`${formatNumber(review.topBottomWindSpreadKt)} kt`}
              />
              <Metric
                label="Top-bottom dir"
                value={`${formatNumber(review.topBottomDirectionSpreadDeg, 0)} deg`}
              />
              <Metric label="Building" value={review.buildingWeather ? "Yes" : "No"} />
              <Metric label="Trim logs" value={String(session.trimLogs.length)} />
            </div>
          </section>

          <section className="layline-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Decision Review</h2>
              <div className="text-xs text-[color:var(--muted)]">
                Auto-rated from recorded calls and GPS pace segments.
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {review.assessedDecisions.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                  No rated decisions yet. Recover GPS data or record the next race from the cockpit.
                </div>
              )}

              {review.assessedDecisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onPatch={(patch) => patchDecision(decision.id, patch)}
                />
              ))}
            </div>
          </section>

          <section className="layline-panel p-4">
            <h2 className="text-xl font-black">Trim Logs From Today</h2>
            <div className="mt-3 space-y-2">
              {session.trimLogs.length === 0 && (
                <p className="text-sm text-[color:var(--muted)]">
                  No trim logs attached. Use Recover Today on the race phone if you made trim calls.
                </p>
              )}
              {session.trimLogs.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-bold">
                    {formatDateTime(log.createdAtISO)} · {log.symptom} ·{" "}
                    {log.rating ?? log.status}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                    {log.recommendation.call}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-black leading-none">{value}</div>
    </div>
  );
}

function DecisionCard({
  decision,
  onPatch,
}: {
  decision: RaceDecisionRecord;
  onPatch: (patch: Partial<RaceDecisionRecord>) => void;
}) {
  const autoGenerated = decision.inputs?.autoGenerated === true;

  return (
    <div className={`rounded-xl border p-4 ${decisionTone(decision)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            {decision.kind} · {formatDateTime(decision.atISO)}
          </div>
          <h3 className="mt-1 text-base font-black">{decision.label}</h3>
        </div>
        <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
          {decision.userAction ?? "unmarked"} · {decision.outcome ?? "unrated"}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6">{decision.recommendation}</p>
      {decision.coachingNote && (
        <p className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-[color:var(--muted)]">
          {decision.coachingNote}
        </p>
      )}

      {autoGenerated ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-[color:var(--muted)]">
          Auto-generated from GPS. No manual rating needed.
        </div>
      ) : (
        <>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onPatch({ userAction: "followed" })}
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
        >
          Followed
        </button>
        <button
          type="button"
          onClick={() => onPatch({ userAction: "modified" })}
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
        >
          Modified
        </button>
        <button
          type="button"
          onClick={() => onPatch({ userAction: "ignored" })}
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
        >
          Ignored
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onPatch({ outcome: "better" })}
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-50"
        >
          Better
        </button>
        <button
          type="button"
          onClick={() => onPatch({ outcome: "same" })}
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-wide"
        >
          Same
        </button>
        <button
          type="button"
          onClick={() => onPatch({ outcome: "worse" })}
          className="rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-100"
        >
          Worse
        </button>
      </div>
        </>
      )}
    </div>
  );
}
