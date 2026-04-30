import type { DownwindChecklistConfig } from "@/types/trim";

export function CrewLayoutCard({ config }: { config: DownwindChecklistConfig }) {
  return (
    <section className="layline-panel space-y-5 p-4">
      <div>
        <div className="layline-kicker">{config.crewCount} Crew Layout</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight">
          Duties and Weight
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
          Forward weight is working weight during the set. Once the spinnaker is
          made, bring the team back to stable downwind positions.
        </p>
      </div>

      <div className="grid gap-3">
        {config.roles.map((role) => (
          <article
            key={role.role}
            className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--bg-deep)]/45 p-4"
          >
            <h3 className="text-base font-extrabold text-[color:var(--text)]">
              {role.role}
            </h3>

            <div className="mt-3 grid gap-4 md:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                  Jobs
                </div>
                <ul className="mt-2 space-y-2">
                  {role.jobs.map((job) => (
                    <li key={job} className="flex gap-3 text-sm leading-6">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--favorable)]" />
                      <span className="text-[color:var(--text-soft)]">{job}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    During Set
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                    {role.duringSetPosition}
                  </p>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                    After Made
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                    {role.afterSetPosition}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-[color:var(--divider)] bg-[color:var(--panel-soft)]/35 p-4">
        <div className="layline-kicker">Weight Distribution</div>
        <div className="mt-3 grid gap-3">
          {config.weightDistribution.map((note) => (
            <div key={note.condition}>
              <h3 className="text-sm font-bold text-[color:var(--warning)]">
                {note.condition}
              </h3>
              <p className="mt-1 text-sm leading-6 text-[color:var(--text-soft)]">
                {note.guidance}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
