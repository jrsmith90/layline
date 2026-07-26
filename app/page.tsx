"use client";

import Link from "next/link";
import {
  Activity,
  Anchor,
  ArrowRight,
  BookOpen,
  Clipboard,
  Flag,
  Layers,
  Library,
  Navigation,
  SlidersHorizontal,
  Star,
  Wind,
} from "lucide-react";
import { useEffect, useSyncExternalStore, useState } from "react";
import {
  DisplayModeControl,
  useDisplayMode,
} from "@/components/display/DisplayModeProvider";
import { useAppMode } from "@/components/display/AppModeProvider";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { getCourseData, getDefaultCourseId } from "@/data/race/getCourseData";
import { getLogs } from "@/lib/logStore";

const DEFAULT_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

const secondaryLinks = [
  { href: "/race/tactical-board", label: "Tactical Board", icon: Layers },
  { href: "/race/tracker", label: "Course Tracker", icon: Navigation },
  { href: "/race/review", label: "Review", icon: BookOpen },
  { href: "/race/map", label: "Race Map", icon: Anchor },
  { href: "/course-library", label: "Course Library", icon: Library },
  { href: "/trim", label: "Trim", icon: SlidersHorizontal },
];

function degToCompass(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function WindWidget({ windDeg, gustDeg }: { windDeg: number | null; gustDeg: number | null }) {
  const hasData = windDeg !== null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel)] p-5">
      <div className="layline-kicker">Wind</div>
      {hasData ? (
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--divider)] bg-[color:var(--panel-soft)]"
            aria-hidden="true"
          >
            <Wind
              size={20}
              strokeWidth={2}
              className="text-[color:var(--favorable)] transition-transform duration-500"
              style={{ transform: `rotate(${windDeg}deg)` }}
            />
          </div>
          <div>
            <div className="text-2xl font-black text-[color:var(--text)]">
              {degToCompass(windDeg)}
            </div>
            <div className="text-sm text-[color:var(--muted)]">{Math.round(windDeg)}°</div>
          </div>
          {gustDeg !== null && gustDeg !== windDeg && (
            <div className="ml-auto text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Gust dir</div>
              <div className="text-sm font-bold text-[color:var(--text)]">{degToCompass(gustDeg)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-[color:var(--muted)]">Set wind in Pre-Race setup</div>
      )}
    </div>
  );
}

type TideSnap = { heightFt: number; stage: string } | null;

function TideWidget() {
  const [tide, setTide] = useState<TideSnap>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/weather/tide-current?date=${today}`)
      .then((r) => r.json())
      .then((data) => {
        const snap = data?.tide;
        if (snap) setTide({ heightFt: snap.heightFt ?? 0, stage: snap.stage ?? "—" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel)] p-5">
      <div className="layline-kicker">Tide</div>
      {loading ? (
        <div className="text-sm text-[color:var(--muted)]">Loading…</div>
      ) : tide ? (
        <div>
          <div className="text-2xl font-black text-[color:var(--text)]">
            {tide.heightFt.toFixed(1)} ft
          </div>
          <div className="mt-0.5 text-sm capitalize text-[color:var(--muted)]">{tide.stage}</div>
        </div>
      ) : (
        <div className="text-sm text-[color:var(--muted)]">Tide data unavailable</div>
      )}
    </div>
  );
}

function CourseWidget({
  courseId,
  raceStartDate,
  raceStartTime,
}: {
  courseId: string;
  raceStartDate: string;
  raceStartTime: string;
}) {
  const course = getCourseData(courseId);
  const label = course.course.label ?? `Course ${courseId}`;
  const legs = course.totalLegs;
  const event = course.eventName;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel)] p-5">
      <div className="layline-kicker">Course</div>
      <div>
        <div className="text-xl font-black text-[color:var(--text)]">{label}</div>
        <div className="mt-0.5 text-sm text-[color:var(--muted)]">{event}</div>
      </div>
      <div className="mt-auto flex items-center gap-4 text-sm">
        <span className="font-semibold text-[color:var(--text-soft)]">{legs} {legs === 1 ? "leg" : "legs"}</span>
        {raceStartDate && (
          <span className="text-[color:var(--muted)]">{raceStartDate} · {raceStartTime}</span>
        )}
      </div>
    </div>
  );
}

function LastSessionWidget() {
  const logs = getLogs();
  const last = logs[0] ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel)] p-5">
      <div className="layline-kicker">Last Session</div>
      {last ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {last.rating === "better" && <Star size={14} className="text-[color:var(--favorable)]" />}
            <span className="text-sm font-semibold capitalize text-[color:var(--text)]">
              {last.sailMode} · {last.symptom.replace(/_/g, " ")}
            </span>
          </div>
          {last.windSpeedKt != null && (
            <div className="text-sm text-[color:var(--muted)]">
              {Math.round(last.windSpeedKt)} kts
              {last.windDirTrueFromDeg != null && ` · ${degToCompass(last.windDirTrueFromDeg)}`}
            </div>
          )}
          <div className="text-xs text-[color:var(--muted)]">
            {new Date(last.createdAtISO).toLocaleDateString()}
          </div>
        </div>
      ) : (
        <div className="text-sm text-[color:var(--muted)]">No sessions recorded yet</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { effectiveMode } = useDisplayMode();
  const { isRaceMode, toggleMode } = useAppMode();

  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_DRAFT,
  );

  const isIpadLayout = effectiveMode === "ipad";
  const isDesktopLayout = effectiveMode === "desktop";

  const windDeg = draft.meanWindDirectionDeg ? parseFloat(draft.meanWindDirectionDeg) : null;
  const currentWindDeg = draft.currentWindDirectionDeg ? parseFloat(draft.currentWindDirectionDeg) : null;

  if (isDesktopLayout) {
    return (
      <main className="flex min-h-screen flex-col gap-6 px-10 py-10">
        {/* Header row */}
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="layline-kicker">Race Day Dashboard</div>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-[color:var(--text)]">
              Choose the next lane.
            </h1>
            <p className="mt-1.5 text-sm text-[color:var(--muted)]">
              {draft.courseId ? getCourseData(draft.courseId).eventLocation : "Annapolis"} · {isRaceMode ? "Race Mode" : "Learning Mode"}
            </p>
          </div>

          <button
            onClick={toggleMode}
            className="layline-pill relative flex w-40 shrink-0 items-center justify-between p-1 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98]"
            aria-label="Toggle race mode"
          >
            <span
              className={`absolute top-1 h-8 w-[4.65rem] rounded-full transition-all duration-200 ${
                isRaceMode
                  ? "left-[4.85rem] bg-[color:var(--unfavorable)]"
                  : "left-1 bg-[color:var(--favorable)]"
              }`}
            />
            <span className="relative z-10 flex h-8 w-[4.65rem] items-center justify-center text-white">Learn</span>
            <span className="relative z-10 flex h-8 w-[4.65rem] items-center justify-center text-white">Race</span>
          </button>
        </div>

        {/* Dashboard grid */}
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-4">
          <WindWidget windDeg={isNaN(windDeg ?? NaN) ? null : windDeg} gustDeg={isNaN(currentWindDeg ?? NaN) ? null : currentWindDeg} />
          <TideWidget />

          {/* Primary CTA */}
          <Link
            href="/race/pre-race"
            className="group flex flex-col justify-between rounded-xl bg-[color:var(--favorable)] p-5 transition hover:opacity-90 active:scale-[0.99]"
          >
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/70">Pre-Race</div>
            <div>
              <div className="text-xl font-black text-white">Build the opening picture</div>
              <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-white/80">
                Open Pre-Race <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </Link>

          <CourseWidget
            courseId={draft.courseId}
            raceStartDate={draft.raceStartDate}
            raceStartTime={draft.raceStartTime}
          />

          <LastSessionWidget />

          {/* Race Live CTA */}
          <Link
            href="/race/live"
            className="group flex flex-col justify-between rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel)] p-5 transition hover:border-[color:var(--favorable)] hover:bg-[color:var(--panel-soft)] active:scale-[0.99]"
          >
            <div className="layline-kicker">Race Live</div>
            <div>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[color:var(--favorable)]" />
                <span className="text-lg font-black text-[color:var(--text)]">Go Racing</span>
              </div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">Cockpit calls, tack history, AI coach</div>
            </div>
          </Link>
        </div>

        {/* Secondary link strip */}
        <div className="flex flex-wrap gap-2">
          {secondaryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-[color:var(--panel)] hover:text-[color:var(--text)] active:scale-[0.98]"
              >
                <Icon size={14} strokeWidth={2.3} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </main>
    );
  }

  return (
    <main
      className={[
        "mx-auto space-y-5 px-4 pb-10 pt-4",
        isIpadLayout ? "max-w-5xl" : "max-w-md",
      ].join(" ")}
    >
      {/* Header */}
      <div className="px-1">
        <div className="layline-kicker">Race Day Dashboard</div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[color:var(--text)]">
          Choose the next lane.
        </h1>
      </div>

      {/* Nav tiles */}
      <section className="flex flex-wrap gap-1">
        {[
          { href: "/race/pre-race", label: "Pre-Race", icon: Clipboard },
          { href: "/race/live", label: "Race Live", icon: Activity },
          { href: "/race/tactical-board", label: "Tactical Board", icon: Layers },
          { href: "/race/tracker", label: "Course Tracker", icon: Navigation },
          { href: "/race/review", label: "Review", icon: BookOpen },
          { href: "/start", label: "Start", icon: Flag },
          { href: "/race/map", label: "Race Map", icon: Anchor },
          { href: "/course-library", label: "Course Library", icon: Library },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[color:var(--muted)] transition-colors hover:bg-[color:var(--panel)] hover:text-[color:var(--text)] active:scale-[0.98]"
            >
              <Icon size={14} strokeWidth={2.3} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </section>

      {/* Mode + display controls */}
      <section className={["flex gap-6", isIpadLayout ? "flex-row items-start" : "flex-col"].join(" ")}>
        <div>
          <div className="layline-kicker mb-3">Mode</div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[color:var(--text)]">
              {isRaceMode ? "Race Mode" : "Learning Mode"}
            </span>
            <button
              onClick={toggleMode}
              className="layline-pill relative flex w-40 items-center justify-between p-1 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98]"
              aria-label="Toggle race mode"
            >
              <span
                className={`absolute top-1 h-8 w-[4.65rem] rounded-full transition-all duration-200 ${
                  isRaceMode
                    ? "left-[4.85rem] bg-[color:var(--unfavorable)]"
                    : "left-1 bg-[color:var(--favorable)]"
                }`}
              />
              <span className="relative z-10 flex h-8 w-[4.65rem] items-center justify-center text-white">Learn</span>
              <span className="relative z-10 flex h-8 w-[4.65rem] items-center justify-center text-white">Race</span>
            </button>
          </div>
        </div>

        <div className={isIpadLayout ? "flex-1" : ""}>
          <DisplayModeControl />
        </div>
      </section>
    </main>
  );
}
