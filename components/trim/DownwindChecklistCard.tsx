import type { DownwindChecklistConfig } from "@/types/trim";

export function DownwindChecklistCard({
  config,
}: {
  config: DownwindChecklistConfig;
}) {
  return (
    <section className="layline-panel space-y-5 p-4">
      <div>
        <div className="layline-kicker">Master Checklist</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight">{config.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
          {config.description}
        </p>
      </div>

      <div className="grid gap-3">
        {config.sequence.map((phase, phaseIndex) => (
          <div
            key={phase.phase}
            className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/45 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--favorable)] text-xs font-extrabold text-white">
                {phaseIndex + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[color:var(--text)]">
                  {phase.phase}
                </h3>
                <div className="mt-3 space-y-2">
                  {phase.steps.map((step) => (
                    <p
                      key={`${phase.phase}-${step.label}`}
                      className="text-sm leading-6 text-[color:var(--text-soft)]"
                    >
                      {step.detail}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel-soft)]/35 p-4">
          <div className="layline-kicker">Call Sequence</div>
          <ol className="mt-3 space-y-2">
            {config.calls.map((call, index) => (
              <li key={call} className="flex gap-3 text-sm">
                <span className="w-5 shrink-0 font-bold text-[color:var(--warning)]">
                  {index + 1}
                </span>
                <span className="text-[color:var(--text-soft)]">{call}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel-soft)]/35 p-4">
          <div className="layline-kicker">Common Mistakes</div>
          <ul className="mt-3 space-y-2">
            {config.commonMistakes.map((mistake) => (
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
