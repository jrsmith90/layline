import Link from "next/link";
import { ReactNode } from "react";

type Tone = "primary" | "neutral" | "amber" | "danger";

const toneClass: Record<Tone, string> = {
  primary: "bg-[color:var(--blue)] text-black shadow",
  neutral:
    "bg-white/10 text-[color:var(--text)] border border-[color:var(--divider)]",
  amber: "bg-[color:var(--amber)] text-black shadow",
  danger: "bg-[color:var(--red)] text-white shadow",
};

export function Btn({
  children,
  tone = "neutral",
  onClick,
  full = true,
  className = "",
  disabled,
}: {
  children: ReactNode;
  tone?: Tone;
  onClick?: () => void;
  full?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-2xl px-4 py-3 font-semibold active:scale-[0.99] transition",
        full ? "w-full" : "",
        toneClass[tone],
        disabled ? "opacity-40" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function BtnLink({
  href,
  children,
  tone = "neutral",
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-2xl px-4 py-3 font-semibold active:scale-[0.99] transition text-center",
        toneClass[tone],
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}