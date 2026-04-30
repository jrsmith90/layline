"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

export function AppNavigationButtons() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  if (isHome) return null;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-[color:var(--divider)] bg-[color:var(--bg)]/88 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="layline-pill flex min-h-11 items-center gap-2 px-4 text-sm font-bold text-[color:var(--text)] transition active:scale-[0.98]"
          aria-label="Go back"
        >
          <ArrowLeft size={17} strokeWidth={2.4} />
          <span>Back</span>
        </button>

        <Link
          href="/"
          className="layline-pill flex min-h-11 items-center gap-2 px-4 text-sm font-bold text-[color:var(--text)] transition active:scale-[0.98]"
          aria-label="Return home"
        >
          <Home size={17} strokeWidth={2.4} />
          <span>Home</span>
        </Link>
      </div>
    </nav>
  );
}
