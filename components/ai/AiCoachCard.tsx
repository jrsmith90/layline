"use client";

import type { AiCoachBrief } from "@/lib/ai/coach";

function toneClasses(tone: AiCoachBrief["tone"]) {
  switch (tone) {
    case "focus":
      return "border-cyan-400/30 bg-cyan-400/10";
    case "warning":
      return "border-amber-300/35 bg-amber-300/10";
    case "positive":
      return "border-emerald-400/35 bg-emerald-400/10";
    default:
      return "border-[color:var(--divider)] bg-black/20";
  }
}

function readinessLabel(readiness: AiCoachBrief["readiness"]) {
  switch (readiness) {
    case "ready":
      return "Ready";
    case "watch":
      return "Watch";
    default:
      return "Needs setup";
  }
}

export function AiCoachCard({
  brief,
  compact = false,
}: {
  brief: AiCoachBrief;
  compact?: boolean;
}) {
  return (
    <section className={["rounded-2xl border p-4", toneClasses(brief.tone)].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">{brief.eyebrow}</div>
          <h2 className={compact ? "mt-1 text-lg font-black" : "mt-1 text-2xl font-black"}>
            {brief.title}
          </h2>
        </div>
        <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text)]">
          {readinessLabel(brief.readiness)}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[color:var(--text)]">{brief.summary}</p>

      {brief.bullets.length > 0 && (
        <div className="mt-3 space-y-2">
          {brief.bullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-[color:var(--text-soft)]"
            >
              {bullet}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs leading-5 text-[color:var(--muted)]">{brief.footer}</div>
    </section>
  );
}
