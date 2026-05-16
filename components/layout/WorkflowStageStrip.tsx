"use client";

import Link from "next/link";

export type WorkflowStageTone = "neutral" | "focus" | "warning" | "positive";

export type WorkflowStage = {
  label: string;
  detail?: string;
  status: string;
  href?: string;
  tone?: WorkflowStageTone;
};

function toneClasses(tone: WorkflowStageTone) {
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

export function WorkflowStageStrip(props: {
  title: string;
  items: WorkflowStage[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="layline-kicker">{props.title}</div>
        <div className="text-xs text-[color:var(--muted)]">Primary flow</div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {props.items.map((item, index) => {
          const content = (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Step {index + 1}
                </div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--text)]">
                  {item.status}
                </div>
              </div>
              <div className="mt-3 text-base font-black text-[color:var(--text)]">
                {item.label}
              </div>
              {item.detail ? (
                <div className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                  {item.detail}
                </div>
              ) : null}
            </>
          );

          const className = [
            "rounded-2xl border p-4 transition active:scale-[0.99]",
            toneClasses(item.tone ?? "neutral"),
          ].join(" ");

          return item.href ? (
            <Link key={`${item.label}-${index}`} href={item.href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={`${item.label}-${index}`} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
