"use client";

import Link from "next/link";
import { useDisplayMode } from "@/components/display/DisplayModeProvider";

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
  const { effectiveMode } = useDisplayMode();
  const isDesktopLayout = effectiveMode === "desktop";
  const gridClass =
    props.items.length >= 4
      ? isDesktopLayout
        ? "md:grid-cols-2"
        : "md:grid-cols-2 xl:grid-cols-4"
      : "md:grid-cols-3";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="layline-kicker">{props.title}</div>
        <div className="text-xs text-[color:var(--muted)]">Primary flow</div>
      </div>

      <div className={["grid gap-2", gridClass].join(" ")}>
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
                <div className="layline-learn-only mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                  {item.detail}
                </div>
              ) : null}
            </>
          );

          const className = [
            "layline-action transition active:scale-[0.99]",
            isDesktopLayout
              ? "min-h-[9.5rem] flex-col items-start justify-start rounded-[2rem] px-5 py-4 text-left"
              : "",
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
