import { ReactNode } from "react";

export function Panel({
  title,
  right,
  children,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--divider)] bg-[color:var(--panel)]/60 backdrop-blur px-5 py-4">
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title ? (
            <div className="text-xs font-semibold tracking-widest text-[color:var(--muted)] uppercase">
              {title}
            </div>
          ) : (
            <div />
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
