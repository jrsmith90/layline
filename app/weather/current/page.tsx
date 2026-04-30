

import CurrentSetupCard from "@/components/weather/CurrentSetupCard"
import CurrentSourcePicker from "@/components/weather/CurrentSourcePicker"
import TideSourcePicker from "@/components/weather/TideSourcePicker"
import { TroubleshootLiveContextPanel } from "@/components/troubleshoot/TroubleshootLiveContextPanel"
import WindSourcePanel from "@/components/weather/WindSourcePanel"
import {
  DEFAULT_CURRENT_REFERENCE_ID,
  DEFAULT_TIDE_REFERENCE_ID,
} from "@/lib/weather/config/currentLocations"
import type { CurrentReading, TideReading } from "@/types/current"

const currentReading: CurrentReading = {
  sourceId: DEFAULT_CURRENT_REFERENCE_ID,
  stationId: "cb1102",
  direction: "ebb",
  speedKt: 1.2,
  strength: "moderate",
  nextSlackTime: "2:18 PM",
  notes: "Mock starter data until NOAA is connected.",
}

const tideReading: TideReading = {
  sourceId: DEFAULT_TIDE_REFERENCE_ID,
  stationId: "8575512",
  stage: "falling",
  heightFt: 1.4,
  nextLowTime: "3:02 PM",
  notes: "Mock starter tide data for local timing context.",
}

export default function WeatherCurrentPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            Weather / Course Conditions
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Course conditions setup
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
            Choose wind, current, and tide references for the part of the course you are sailing, then build a simple read of pressure, water, and route bias.
          </p>
        </div>

        <section className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 lg:grid-cols-3">
          <CurrentSourcePicker value={DEFAULT_CURRENT_REFERENCE_ID} />
          <TideSourcePicker value={DEFAULT_TIDE_REFERENCE_ID} />
          <div>
            <p className="mb-2 block text-sm font-medium text-slate-200">
              Wind source
            </p>
            <p className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              Select below
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Choose top, bottom, river, or nearby GPS-based wind in the wind setup panel.
            </p>
          </div>
        </section>

        <CurrentSetupCard
          className="mt-6"
          currentSourceId={DEFAULT_CURRENT_REFERENCE_ID}
          tideSourceId={DEFAULT_TIDE_REFERENCE_ID}
          currentReading={currentReading}
          tideReading={tideReading}
          windDirectionDeg={210}
        />

        <WindSourcePanel />

        <div className="mt-6">
          <TroubleshootLiveContextPanel />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold text-white">How to use it</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white">1. Pick course-area references</h3>
              <p className="mt-2 text-sm text-slate-400">
                Use Thomas Point for open Bay/top-of-course wind, Annapolis buoy for the Severn mouth/bottom, and KNAK for river racing.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white">2. Compare wind and water</h3>
              <p className="mt-2 text-sm text-slate-400">
                Look for wind splits, gust spread, wave state, flatter water, and whether current makes one side friendlier.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white">3. Feed the race plan</h3>
              <p className="mt-2 text-sm text-slate-400">
                Use the live read to seed pre-race route bias, troubleshoot trim, and decide whether the edge is small, medium, or route-shaping.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
