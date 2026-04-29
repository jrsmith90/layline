

import CurrentReferenceCard from "@/components/weather/CurrentReferenceCard"
import {
  buildCurrentSummary,
  buildTideSummary,
} from "@/lib/weather/logic/currentHelpers"
import { buildWaterSetupAssessment } from "@/lib/weather/logic/waterSetup"
import type {
  CurrentReading,
  TideReading,
  WaterAdvantageSide,
} from "@/types/current"

type CurrentSetupCardProps = {
  currentSourceId?: string
  tideSourceId?: string
  currentReading?: CurrentReading
  tideReading?: TideReading
  preferredSide?: WaterAdvantageSide
  windDirectionDeg?: number
  className?: string
}

function formatSideLabel(side: WaterAdvantageSide | "unknown") {
  switch (side) {
    case "left":
      return "Left looks better"
    case "right":
      return "Right looks better"
    case "even":
      return "Looks about even"
    default:
      return "Still unclear"
  }
}

function formatEdgeStrength(edgeStrength: "small" | "medium" | "strong" | "unknown") {
  switch (edgeStrength) {
    case "small":
      return "Small edge"
    case "medium":
      return "Medium edge"
    case "strong":
      return "Strong edge"
    default:
      return "Edge unclear"
  }
}

export default function CurrentSetupCard({
  currentSourceId,
  tideSourceId,
  currentReading,
  tideReading,
  preferredSide,
  windDirectionDeg,
  className,
}: CurrentSetupCardProps) {
  const assessment = buildWaterSetupAssessment({
    preferredSide,
    currentReading,
    tideReading,
    windDirectionDeg,
  })

  return (
    <section
      className={[
        "rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            Current setup
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Water and current read
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Use this section to frame which side has better water, how meaningful the edge looks, and why.
          </p>
        </div>

        <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          Confidence {Math.round(assessment.confidence * 100)}%
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CurrentReferenceCard
          sourceId={currentSourceId}
          title="Current reference"
        />

        <CurrentReferenceCard sourceId={tideSourceId} title="Tide reference" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold text-white">Current summary</h3>
          <p className="mt-2 text-sm text-slate-300">
            {buildCurrentSummary(currentReading)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold text-white">Tide summary</h3>
          <p className="mt-2 text-sm text-slate-300">
            {buildTideSummary(tideReading)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Better water side
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatSideLabel(assessment.betterWaterSide)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Think flatter water, less slamming, and a friendlier current setup.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Edge strength
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatEdgeStrength(assessment.edgeStrength)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Use this to judge whether the water setup should slightly shape the leg or strongly influence the route.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-white">Why this matters</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {assessment.reasoning.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}