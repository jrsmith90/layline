"use client"

import { useEffect, useMemo, useState } from "react"
import { usePhoneGps } from "@/components/gps/PhoneGpsProvider"
import CurrentReferenceCard from "@/components/weather/CurrentReferenceCard"
import WindSourcePicker from "@/components/weather/WindSourcePicker"
import { DEFAULT_WIND_REFERENCE_ID } from "@/lib/weather/config/currentLocations"

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
        const data = (await response.json()) as WeatherPayload

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
      setNearby(null)
      setNearbyError(null)
      setNearbyLoading(false)
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
        const data = (await response.json()) as NearbyPayload

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
        detail: "Open Bay / top-of-course reference.",
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
            ? "Severn-mouth / bottom-of-course reference."
            : `Severn-mouth reference. Waves ${weather.cbibsAnnapolis.waveHeightFt.toFixed(2)} ft at ${weather.cbibsAnnapolis.wavePeriodSec?.toFixed(1) ?? "--"} sec.`,
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
            Pick the wind reference that matches the course area. Use Thomas Point for the Bay/top, Annapolis buoy for the Severn mouth/bottom, and nearby observations when Phone GPS is on.
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
    </section>
  )
}
