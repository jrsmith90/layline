import type { CoveringGuide } from "@/lib/tactics/covering";

export function CoveringSectionCard({ guide }: { guide: CoveringGuide }) {
  return (
    <section className="layline-panel space-y-5 p-4">
      <div>
        <div className="layline-kicker">{guide.mode} run</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight">{guide.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
          {guide.principle}
        </p>
        <div className="mt-3 rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel-soft)]/35 p-3 text-sm font-semibold leading-6 text-[color:var(--text)]">
          {guide.quickRule}
        </div>
      </div>

      <div className="grid gap-3">
        {guide.scenarios.map((scenario) => (
          <article
            key={scenario.title}
            className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/45 p-4"
          >
            <h3 className="text-base font-extrabold text-[color:var(--text)]">
              {scenario.title}
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                  Situation
                </div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                  {scenario.situation}
                </p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                  Move
                </div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                  {scenario.move}
                </p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                  Watch Out
                </div>
                <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                  {scenario.watchOut}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel-soft)]/35 p-4">
          <div className="layline-kicker">Useful Calls</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.calls.map((call) => (
              <span
                key={call}
                className="rounded-full border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/55 px-3 py-1.5 text-xs font-bold text-[color:var(--text-soft)]"
              >
                {call}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel-soft)]/35 p-4">
          <div className="layline-kicker">Common Mistakes</div>
          <ul className="mt-3 space-y-2">
            {guide.mistakes.map((mistake) => (
              <li key={mistake} className="flex gap-3 text-sm leading-6">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--unfavorable)]" />
                <span className="text-[color:var(--text-soft)]">{mistake}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
