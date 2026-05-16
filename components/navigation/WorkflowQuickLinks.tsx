"use client";

import Link from "next/link";

type WorkflowQuickLink = {
  href: string;
  label: string;
  detail?: string;
};

export function WorkflowQuickLinks(props: {
  title: string;
  items: WorkflowQuickLink[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="layline-kicker">{props.title}</div>
        <div className="text-xs text-[color:var(--muted)]">Quick path</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {props.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="layline-panel group flex min-h-20 items-start justify-between gap-3 p-3 transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <div className="text-sm font-black text-[color:var(--text)]">{item.label}</div>
              {item.detail ? (
                <div className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                  {item.detail}
                </div>
              ) : null}
            </div>
            <span className="mt-0.5 text-sm font-black text-[color:var(--muted)] transition group-hover:text-[color:var(--text)]">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
