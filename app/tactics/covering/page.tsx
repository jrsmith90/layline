import Link from "next/link";
import { CoveringSectionCard } from "@/components/tactics/CoveringSectionCard";
import { coveringGuides, coveringPrinciples } from "@/lib/tactics/covering";

export default function CoveringPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 pb-8 pt-3">
      <header className="space-y-2">
        <Link
          href="/tactics"
          className="text-sm font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
        >
          Back to Tactics
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Covering</h1>
          <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
            Defend your position upwind and downwind without sailing slow or
            giving away the favored side.
          </p>
        </div>
      </header>

      <section className="layline-panel space-y-4 p-4">
        <div>
          <div className="layline-kicker">Core Idea</div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            Stay Between The Threat And The Next Advantage
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
            Covering is not just sitting on another boat. It is choosing a
            position that prevents a pass while still sailing toward better
            pressure, better shifts, cleaner water, or the next mark.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {coveringPrinciples.map((principle, index) => (
            <div
              key={principle}
              className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/45 p-3"
            >
              <div className="text-sm font-extrabold text-[color:var(--warning)]">
                {index + 1}
              </div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                {principle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {coveringGuides.map((guide) => (
        <CoveringSectionCard key={guide.mode} guide={guide} />
      ))}
    </main>
  );
}
