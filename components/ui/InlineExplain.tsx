"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export function InlineExplain(props: {
  label: string;
  title?: string;
  children: ReactNode;
  align?: "left" | "right";
  widthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={props.label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--divider)] bg-black/20 text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
      >
        <CircleHelp size={14} />
      </button>

      <div
        className={[
          "absolute top-full z-30 mt-2 rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel)]/98 p-3 text-left shadow-2xl transition",
          props.widthClassName ?? "w-72",
          props.align === "right" ? "right-0" : "left-0",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0",
        ].join(" ")}
      >
        {props.title ? (
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
            {props.title}
          </div>
        ) : null}
        <div className={props.title ? "mt-2 text-sm leading-6 text-[color:var(--text-soft)]" : "text-sm leading-6 text-[color:var(--text-soft)]"}>
          {props.children}
        </div>
      </div>
    </span>
  );
}
