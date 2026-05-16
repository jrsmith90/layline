"use client"

import { useEffect, useMemo, useState } from "react"
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider"
import CurrentReferenceCard from "@/components/weather/CurrentReferenceCard"
import WindSourcePicker from "@/components/weather/WindSourcePicker"
import { DEFAULT_WIND_REFERENCE_ID } from "@/lib/weather/config/currentLocations"
import { readJsonResponse } from "@/lib/readJsonResponse"

type WindSourceId =
  | "thomas_point_wind"
  | "annapolis_buoy_wind"
  | "naval_academy_wind"
  | "nearby_radial_wind"

type WeatherPayload = {
  stationName?: string
  observedAt?: string
  windAvgKt?: number
  windGustKt?: number
  windDirectionDeg?: number
  historyTrend?: {
    trend: "building" | "easing" | "steady" | "unknown"
    avgWindKt?: number
    maxGustKt?: number
    prevailingDirectionDeg?: number
    speedDeltaKt?: number
  }
  cbibsAnnapolis?: {
    platformName: string
    observedAt?: string
    windAvgKt?: number
    windGustKt?: number
    windDirectionDeg?: number
    waveHeightFt?: number
    wavePeriodSec?: number
    waterTempF?: number
  }
  thomasPoint?: {
    stationName: string
    observedAt?: string
    windAvgKt?: number
    windGustKt?: number
    windDirectionDeg?: number
    trend?: {
      trend: "building" | "easing" | "steady" | "unknown"
      avgWindKt?: number
      maxGustKt?: number
      prevailingDirectionDeg?: number
      speedDeltaKt?: number
    }
  }
  error?: string
}

type NearbyPayload = {
  reportCount: number
  avgWindKt?: number
  maxGustKt?: number
  trends: Array<{
    id: string
    type: string
    trend: "building" | "easing" | "steady" | "unknown"
    avgWindKt?: number
    speedDeltaKt?: number
  }>
  reports: Array<{
    id: string
    type: string
    observedAt: string
    distanceNm: number
    windAvgKt?: number
    windGustKt?: number
    windDirectionDeg?: number
  }>
  error?: string
}

function formatKt(value?: number) {
  return typeof value === "number" ? `${value.toFixed(1)} kt` : "--"
}

function formatDeg(value?: number) {
  return typeof value === "number" ? `${Math.round(value)} deg` : "--"
}

function formatTime(value?: string) {
  if (!value) return "time unknown"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString()
}

function trendText(trend?: string) {
  if (!trend || trend === "unknown") return "Trend unclear"
  return trend.charAt(0).toUpperCase() + trend.slice(1)
}

function angleDiffDeg(a?: number, b?: number) {
  if (typeof a !== "number" || typeof b !== "number") return undefined
  return Math.abs(((a - b + 540) % 360) - 180)
}

function isNeEneSetup(windDirectionDeg?: number) {
  return (
    typeof windDirectionDeg === "number" &&
    Number.isFinite(windDirectionDeg) &&
    windDirectionDeg >= 15 &&
    windDirectionDeg <= 100
  )
}

function buildCoastalWindCue(weather: WeatherPayload | null) {
  if (!weather) {
    return {
      label: "Coastal setup",
      detail: "Loading top and bottom course sensors.",
      tone: "neutral" as const,
    }
  }

  const windDirectionDeg =
    weather.cbibsAnnapolis?.windDirectionDeg ??
    weather.thomasPoint?.windDirectionDeg ??
    weather.windDirectionDeg
  const trend =
    weather.historyTrend?.trend ??
    weather.thomasPoint?.trend?.trend
  const speedDeltaKt =
    weather.historyTrend?.speedDeltaKt ??
    weather.thomasPoint?.trend?.speedDeltaKt
  const windSpreadKt =
    typeof weather.cbibsAnnapolis?.windAvgKt === "number" &&
    typeof weather.thomasPoint?.windAvgKt === "number"
      ? Math.abs(weather.cbibsAnnapolis.windAvgKt - weather.thomasPoint.windAvgKt)
      : undefined
  const directionSpreadDeg = angleDiffDeg(
    weather.cbibsAnnapolis?.windDirectionDeg,
    weather.thomasPoint?.windDirectionDeg,
  )
  const splitText =
    windSpreadKt == null
      ? "sensor split pending"
      : `${windSpreadKt.toFixed(1)} kt top-bottom split`

  if (isNeEneSetup(windDirectionDeg) && (trend === "building" || (speedDeltaKt ?? 0) >= 3)) {
    return {
      label: "NE/ENE acceleration watch",
      detail: `Building NE/ENE flow can clock onshore and jump quickly. Treat ${splitText} as a course-section check before locking trim or start mode.`,
      tone: "warning" as const,
    }
  }

  if (
    isNeEneSetup(windDirectionDeg) &&
    ((windSpreadKt ?? 0) >= 4 || (directionSpreadDeg ?? 0) >= 15)
  ) {
    return {
      label: "NE/ENE sensor split",
      detail: `Top and bottom sensors disagree in NE/ENE flow. Expect deeper/open water and river/shallow water to feel different on course.`,
      tone: "warning" as const,
    }
  }

  if (isNeEneSetup(windDirectionDeg)) {
    return {
      label: "NE/ENE coastal setup",
      detail: "NE/ENE flow can bend and accelerate locally. Keep comparing Annapolis buoy, Thomas Point, and what you see on the water.",
      tone: "neutral" as const,
    }
  }

  return {
    label: "Coastal setup",
    detail: "No NE/ENE acceleration signal in the current feed. Keep using gust spread, trend, and top-bottom sensor differences.",
    tone: "neutral" as const,
  }
}

export default function WindSourcePanel() {
  const gps = usePhoneGps()
  const [sourceId, setSourceId] = useState<WindSourceId>(
    DEFAULT_WIND_REFERENCE_ID as WindSourceId,
  )
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const [nearby, setNearby] = useState<NearbyPayload | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nearbyLoading, setNearbyLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      try {
        setLoading(true)
        setWeatherError(null)
        const response = await fetch("/api/weather/noaa-wind", {
          cache: "no-store",
        })
        const data = await readJsonResponse<WeatherPayload>(response)

        if (cancelled) return

        if (!response.ok || data.error) {
          setWeatherError(data.error ?? "Wind feed unavailable.")
          setWeather(null)
          return
        }

        setWeather(data)
      } catch (error) {
        if (!cancelled) {
          setWeatherError(error instanceof Error ? error.message : "Wind feed unavailable.")
          setWeather(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadWeather()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (sourceId !== "nearby_radial_wind" || gps.lat == null || gps.lon == null) {
      queueMicrotask(() => {
        setNearby(null)
        setNearbyError(null)
        setNearbyLoading(false)
      })
      return
    }

    let cancelled = false

    async function loadNearby() {
      try {
        setNearbyLoading(true)
        setNearbyError(null)
        const params = new URLSearchParams({
          lat: String(gps.lat),
          lon: String(gps.lon),
          radiusNm: "5",
          hours: "6",
        })
        const response = await fetch(`/api/weather/ship-reports?${params.toString()}`, {
          cache: "no-store",
        })
        const data = await readJsonResponse<NearbyPayload>(response)

        if (cancelled) return

        if (!response.ok || data.error) {
          setNearbyError(data.error ?? "Nearby observations unavailable.")
          setNearby(null)
          return
        }

        setNearby(data)
      } catch (error) {
        if (!cancelled) {
          setNearbyError(
            error instanceof Error ? error.message : "Nearby observations unavailable.",
          )
          setNearby(null)
        }
      } finally {
        if (!cancelled) setNearbyLoading(false)
      }
    }

    loadNearby()

    return () => {
      cancelled = true
    }
  }, [gps.lat, gps.lon, sourceId])

  const selectedRead = useMemo(() => {
    if (sourceId === "thomas_point_wind") {
      return {
        name: weather?.thomasPoint?.stationName ?? "Thomas Point / TPLM2",
        observedAt: weather?.thomasPoint?.observedAt,
        windAvgKt: weather?.thomasPoint?.windAvgKt,
        windGustKt: weather?.thomasPoint?.windGustKt,
        windDirectionDeg: weather?.thomasPoint?.windDirectionDeg,
        trend: weather?.thomasPoint?.trend?.trend,
        detail: "Open Bay / bottom-of-course reference.",
      }
    }

    if (sourceId === "annapolis_buoy_wind") {
      return {
        name: weather?.cbibsAnnapolis?.platformName ?? "Annapolis CBIBS Buoy",
        observedAt: weather?.cbibsAnnapolis?.observedAt,
        windAvgKt: weather?.cbibsAnnapolis?.windAvgKt,
        windGustKt: weather?.cbibsAnnapolis?.windGustKt,
        windDirectionDeg: weather?.cbibsAnnapolis?.windDirectionDeg,
        trend: undefined,
        detail:
          weather?.cbibsAnnapolis?.waveHeightFt == null
            ? "Annapolis buoy / top-of-course reference."
            : `Top-of-course Annapolis buoy reference. Waves ${weather.cbibsAnnapolis.waveHeightFt.toFixed(2)} ft at ${weather.cbibsAnnapolis.wavePeriodSec?.toFixed(1) ?? "--"} sec.`,
      }
    }

    if (sourceId === "nearby_radial_wind") {
      const first = nearby?.reports[0]
      const trend = nearby?.trends[0]

      return {
        name: "Nearby NDBC radial observations",
        observedAt: first?.observedAt,
        windAvgKt: nearby?.avgWindKt ?? first?.windAvgKt,
        windGustKt: nearby?.maxGustKt ?? first?.windGustKt,
        windDirectionDeg: first?.windDirectionDeg,
        trend: trend?.trend,
        detail:
          gps.lat == null || gps.lon == null
            ? "Turn on Phone GPS to query nearby observations."
            : `${nearby?.reportCount ?? 0} observations within 5 nm over the last 6 hours.`,
      }
    }

    return {
      name: weather?.stationName ?? "Naval Academy / KNAK",
      observedAt: weather?.observedAt,
      windAvgKt: weather?.windAvgKt,
      windGustKt: weather?.windGustKt,
      windDirectionDeg: weather?.windDirectionDeg,
      trend: weather?.historyTrend?.trend,
      detail: "River / Naval Academy reference.",
    }
  }, [gps.lat, gps.lon, nearby, sourceId, weather])
  const coastalWindCue = useMemo(() => buildCoastalWindCue(weather), [weather])

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            Wind setup
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Weather buoy and station read
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Pick the wind reference that matches the course area. Use Thomas Point for the bottom, Annapolis buoy for the top, and nearby observations when Phone GPS is on.
          </p>
        </div>

        <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          {loading || nearbyLoading ? "Loading" : "Live read"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <WindSourcePicker
          value={sourceId}
          onChange={(value) => setSourceId(value as WindSourceId)}
        />

        <CurrentReferenceCard sourceId={sourceId} title="Wind reference" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Wind
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatKt(selectedRead.windAvgKt)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Gust
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatKt(selectedRead.windGustKt)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Direction
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatDeg(selectedRead.windDirectionDeg)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Trend
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {trendText(selectedRead.trend)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-white">{selectedRead.name}</h3>
        <p className="mt-2 text-sm text-slate-300">{selectedRead.detail}</p>
        <p className="mt-2 text-xs text-slate-500">
          Observed {formatTime(selectedRead.observedAt)}
        </p>
        {weatherError ? (
          <p className="mt-3 text-sm text-amber-300">{weatherError}</p>
        ) : null}
        {nearbyError && sourceId === "nearby_radial_wind" ? (
          <p className="mt-3 text-sm text-amber-300">{nearbyError}</p>
        ) : null}
      </div>

      <div
        className={`mt-4 rounded-xl border p-4 ${
          coastalWindCue.tone === "warning"
            ? "border-amber-300/35 bg-amber-300/10"
            : "border-slate-800 bg-slate-900/60"
        }`}
      >
        <h3 className="text-sm font-semibold text-white">{coastalWindCue.label}</h3>
        <p className="mt-2 text-sm text-slate-300">{coastalWindCue.detail}</p>
      </div>
    </section>
  )
}
