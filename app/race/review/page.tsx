"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import CourseChart from "@/components/race/CourseChart";
import { formatCourseLabel, getCourseData } from "@/data/race/getCourseData";
import type { RaceStateSnapshot } from "@/lib/race/state/types";
import {
  buildRaceSessionReview,
  deleteRaceSession,
  downloadTextFile,
  exportRaceSessionJson,
  getMostRecentRaceSession,
  getRaceSessions,
  recoverRaceSessionsFromRepository,
  recoverTodayRaceSession,
  subscribeRaceSessionStore,
  updateRaceDecision,
  type RaceDecisionRecord,
  type RaceSessionRepositoryRecoveryResult,
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

function formatSnapshotCall(call: RaceStateSnapshot["primaryCall"]) {
  return call.replace(/_/g, " ").toUpperCase();
}

function formatSnapshotLeg(snapshot: RaceStateSnapshot) {
  if (snapshot.course.activeLeg) {
    return `${snapshot.course.activeLeg.fromMark} to ${snapshot.course.activeLeg.toMark}`;
  }

  if (snapshot.course.fromMark && snapshot.course.toMark) {
    return `${snapshot.course.fromMark.name} to ${snapshot.course.toMark.name}`;
  }

  return `Leg ${snapshot.course.safeLegIndex + 1}`;
}

function confidenceTone(level: RaceStateSnapshot["confidence"]["overall"]) {
  if (level === "high") {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-50";
  }

  if (level === "medium") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-50";
  }

  if (level === "low") {
    return "border-amber-300/35 bg-amber-300/10 text-amber-50";
  }

  return "border-red-400/35 bg-red-400/10 text-red-100";
}

function formatDecisionSourceMode(mode?: string) {
  if (!mode) return "--";
  return mode.replace(/_/g, " ");
}

function formatCourseSectionRelevance(value?: string) {
  if (!value) return "--";

  if (value === "local_to_boat") return "Local to boat";
  if (value === "top_of_course") return "Top of course";
  if (value === "bottom_of_course") return "Bottom of course";
  if (value === "river_corridor") return "River corridor";
  if (value === "manual_override") return "Manual override";
  return value.replace(/_/g, " ");
}

function buildRecoveryNotice(
  recovery: RaceSessionRepositoryRecoveryResult,
): { message: string; tone: "info" | "warning" } | null {
  if (recovery.error && recovery.source === "empty") {
    return {
      message: "Shared session recovery failed, and no local race sessions were available.",
      tone: "warning",
    };
  }

  if (recovery.error && recovery.source === "local") {
    return {
      message: "Shared session recovery failed. Review is using this browser's saved race data.",
      tone: "warning",
    };
  }

  if (recovery.source === "shared") {
    return {
      message: "Loaded race sessions from shared storage.",
      tone: "info",
    };
  }

  if (recovery.source === "merged") {
    return {
      message: "Loaded shared race sessions and merged local browser fallback data.",
      tone: "info",
    };
  }

  if (recovery.source === "local") {
    return {
      message: "Shared storage had no race sessions, so review resumed from this browser.",
      tone: "warning",
    };
  }

  return null;
}

export default function RaceReviewPage() {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const sessions = getRaceSessions();
  const mostRecent = getMostRecentRaceSession();
  const [selectedId, setSelectedId] = useState(mostRecent?.id ?? "");
  const [recoveryNotice, setRecoveryNotice] = useState<{
    message: string;
    tone: "info" | "warning";
  } | null>(null);
  const effectiveSelectedId = selectedId || mostRecent?.id || "";
  const session =
    sessions.find((candidate) => candidate.id === effectiveSelectedId) ?? mostRecent;
  const review = session ? buildRaceSessionReview(session) : null;
  const reviewCourseData = session?.courseId ? getCourseData(session.courseId) : null;
  const latestRaceStateSnapshot = session?.raceStateSnapshots.at(-1) ?? null;

  useEffect(() => subscribeRaceSessionStore(() => refresh()), []);

  useEffect(() => {
    let cancelled = false;

    void recoverRaceSessionsFromRepository().then((recovery) => {
      if (cancelled) return;

      setSelectedId((current) =>
        current &&
        recovery.snapshot.sessions.some((candidate) => candidate.id === current)
          ? current
          : recovery.snapshot.activeSessionId ?? recovery.snapshot.sessions[0]?.id ?? "",
      );
      setRecoveryNotice(buildRecoveryNotice(recovery));
      refresh();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function recoverToday() {
    const recovered = await recoverTodayRaceSession();
    setSelectedId(recovered.session.id);
    setRecoveryNotice(buildRecoveryNotice(recovered.recovery));
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

        {recoveryNotice && (
          <div
            className={[
              "mt-3 rounded-xl border p-3 text-sm",
              recoveryNotice.tone === "warning"
                ? "border-amber-300/35 bg-amber-300/10 text-amber-50"
                : "border-cyan-400/30 bg-cyan-400/10 text-cyan-50",
            ].join(" ")}
          >
            {recoveryNotice.message}
          </div>
        )}
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

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-8">
              <Metric label="Minutes" value={formatNumber(review.durationMin, 0)} />
              <Metric label="GPS" value={String(review.gpsPointCount)} />
              <Metric label="Weather" value={String(review.weatherSampleCount)} />
              <Metric label="Choices" value={String(review.decisionCount)} />
              <Metric label="State" value={String(session.raceStateSnapshots.length)} />
              <Metric label="Tacks" value={String(session.tackCalibrations.length)} />
              <Metric label="Avg SOG" value={`${formatNumber(review.averageSogKt)} kt`} />
              <Metric label="Max SOG" value={`${formatNumber(review.maxSogKt)} kt`} />
            </div>
          </section>

          <section className="layline-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Saved App State</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Latest fused snapshot recorded during the race, loaded directly from the stored session.
                </p>
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                {session.raceStateSnapshots.length} saved snapshot
                {session.raceStateSnapshots.length === 1 ? "" : "s"}
              </div>
            </div>

            {!latestRaceStateSnapshot ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[color:var(--muted)]">
                No fused race-state snapshots were saved for this session.
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      Captured
                    </div>
                    <div className="mt-1 text-lg font-black">
                      {formatDateTime(latestRaceStateSnapshot.capturedAtISO)}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      App state generated {formatDateTime(latestRaceStateSnapshot.stateGeneratedAt)}
                    </div>
                  </div>
                  <div
                    className={[
                      "rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide",
                      confidenceTone(latestRaceStateSnapshot.confidence.overall),
                    ].join(" ")}
                  >
                    {latestRaceStateSnapshot.confidence.overall} confidence
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric
                    label="Call"
                    value={formatSnapshotCall(latestRaceStateSnapshot.primaryCall)}
                  />
                  <Metric
                    label="Leg"
                    value={formatSnapshotLeg(latestRaceStateSnapshot)}
                  />
                  <Metric
                    label="Wind Source"
                    value={latestRaceStateSnapshot.wind.sourceLabel}
                  />
                  <Metric
                    label="Mode"
                    value={
                      latestRaceStateSnapshot.approachingMark
                        ? "Mark approach"
                        : "Leg tracking"
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric
                    label="GPS Freshness"
                    value={latestRaceStateSnapshot.sources.gps.freshness}
                  />
                  <Metric
                    label="Wind Freshness"
                    value={latestRaceStateSnapshot.sources.wind.freshness}
                  />
                  <Metric
                    label="Dist To Mark"
                    value={
                      latestRaceStateSnapshot.progress?.distanceToMarkNm == null
                        ? "--"
                        : `${formatNumber(
                            latestRaceStateSnapshot.progress.distanceToMarkNm,
                            2,
                          )} nm`
                    }
                  />
                  <Metric
                    label="VMG"
                    value={
                      latestRaceStateSnapshot.progress?.vmgToMarkKt == null
                        ? "--"
                        : `${formatNumber(
                            latestRaceStateSnapshot.progress.vmgToMarkKt,
                            1,
                          )} kt`
                    }
                  />
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Source detail
                  </div>
                  <div className="mt-2 text-sm leading-6">
                    GPS was {latestRaceStateSnapshot.sources.gps.status} with{" "}
                    {latestRaceStateSnapshot.sources.gps.permission} permission. Wind came from{" "}
                    {latestRaceStateSnapshot.wind.sourceLabel} in{" "}
                    {latestRaceStateSnapshot.wind.sourceMode} mode.
                  </div>
                </div>

                {latestRaceStateSnapshot.confidence.signals.length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {latestRaceStateSnapshot.confidence.signals
                      .slice(0, 4)
                      .map((signal) => (
                        <div
                          key={signal.key}
                          className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6"
                        >
                          {signal.message}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
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
  const weatherSource = decision.sourceMeta?.weather;

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

      {weatherSource && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Stored Source Context
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label="Source" value={weatherSource.sourceLabel} />
            <Metric label="Freshness" value={weatherSource.freshness} />
            <Metric label="Confidence" value={weatherSource.confidence} />
            <Metric
              label="Section"
              value={formatCourseSectionRelevance(weatherSource.courseSectionRelevance)}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
            {weatherSource.sourceDetail}
            {weatherSource.sourceObservedAt
              ? ` · observed ${formatDateTime(weatherSource.sourceObservedAt)}`
              : ""}
            {` · ${formatDecisionSourceMode(weatherSource.sourceMode)} mode`}
            {` · status ${weatherSource.status}`}
            {decision.sourceMeta
              ? ` · overall app confidence ${decision.sourceMeta.overallConfidence}`
              : ""}
          </p>
        </div>
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
