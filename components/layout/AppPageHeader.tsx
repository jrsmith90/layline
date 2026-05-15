"use client";

import type { ReactNode } from "react";

type AppPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  actions?: ReactNode;
};

export function AppPageHeader(props: AppPageHeaderProps) {
  return (
    <section className="layline-panel overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="layline-kicker">{props.eyebrow}</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[color:var(--text)] sm:text-[2.15rem]">
            {props.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-soft)] sm:text-[0.95rem]">
            {props.description}
          </p>
        </div>

        {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
      </div>

      {props.badges?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {props.badges.map((badge) => (
            <span key={badge} className="layline-chip text-[color:var(--text)]">
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
