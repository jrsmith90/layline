import { ReactNode } from "react";

export function Chip({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: ReactNode;
  accent?: "blue" | "teal" | "amber" | "neutral";
}) {
  const border =
    accent === "blue"
      ? "border-[color:var(--blue)]/50"
      : accent === "teal"
      ? "border-[color:var(--teal)]/50"
      : accent === "amber"
      ? "border-[color:var(--amber)]/50"
      : "border-[color:var(--divider)]";

  return (
    <div className={["rounded-2xl border bg-black/30 px-4 py-3", border].join(" ")}>
      <div className="text-[11px] uppercase tracking-widest text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-[color:var(--text)]">
        {value}
      </div>
    </div>
  );
}