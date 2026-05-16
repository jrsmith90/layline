"use client";

import type { ReactNode } from "react";

export function WorkflowDisclosure(props: {
  id?: string;
  title: string;
  detail?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={props.id}
      open={props.defaultOpen}
      className="layline-panel overflow-hidden scroll-mt-24"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="layline-kicker">{props.badge ?? "Section"}</div>
          <div className="mt-1 text-xl font-black text-[color:var(--text)]">{props.title}</div>
          {props.detail ? (
            <div className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
              {props.detail}
            </div>
          ) : null}
        </div>
        <div className="rounded-full border border-[color:var(--divider)] bg-black/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
          Toggle
        </div>
      </summary>
      <div className="border-t border-[color:var(--divider)] p-4">{props.children}</div>
    </details>
  );
}
