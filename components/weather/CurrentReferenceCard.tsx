

import { getCurrentReferenceById } from "@/lib/weather/config/currentLocations"

type CurrentReferenceCardProps = {
  sourceId?: string
  title?: string
  className?: string
}

export default function CurrentReferenceCard({
  sourceId,
  title = "Reference details",
  className,
}: CurrentReferenceCardProps) {
  const reference = sourceId ? getCurrentReferenceById(sourceId) : undefined

  if (!reference) {
    return (
      <div
        className={[
          "rounded-xl border border-slate-800 bg-slate-900/60 p-4",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">
          Pick a current or tide source to see what it is best used for.
        </p>
      </div>
    )
  }

  return (
    <div
      className={[
        "rounded-xl border border-slate-800 bg-slate-900/60 p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-base font-medium text-sky-300">
            {reference.label}
          </p>
        </div>

        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
          {reference.type}
        </span>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Station ID</dt>
          <dd className="text-white">{reference.stationId}</dd>
        </div>

        <div>
          <dt className="text-slate-500">Best use</dt>
          <dd className="text-slate-200">{reference.shortUse}</dd>
        </div>

        {reference.notes ? (
          <div>
            <dt className="text-slate-500">Notes</dt>
            <dd className="text-slate-300">{reference.notes}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}