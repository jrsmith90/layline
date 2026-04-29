

import {
  CURRENT_REFERENCE_OPTIONS,
  DEFAULT_CURRENT_REFERENCE_ID,
  DEFAULT_TIDE_REFERENCE_ID,
  getCurrentReferenceById,
} from "@/lib/weather/config/currentLocations"
import type {
  CurrentReferenceOption,
  CurrentReading,
  CurrentStrength,
  SelectedCurrentSetup,
  TideReading,
} from "@/types/current"

export function getCurrentOptions(): CurrentReferenceOption[] {
  return CURRENT_REFERENCE_OPTIONS.filter((option) => option.type === "current")
}

export function getTideOptions(): CurrentReferenceOption[] {
  return CURRENT_REFERENCE_OPTIONS.filter((option) => option.type === "tide")
}

export function getDefaultCurrentSetup(): SelectedCurrentSetup {
  return {
    currentSourceId: DEFAULT_CURRENT_REFERENCE_ID,
    tideSourceId: DEFAULT_TIDE_REFERENCE_ID,
  }
}

export function resolveCurrentSetup(
  setup?: Partial<SelectedCurrentSetup>,
): SelectedCurrentSetup {
  return {
    currentSourceId: setup?.currentSourceId || DEFAULT_CURRENT_REFERENCE_ID,
    tideSourceId: setup?.tideSourceId || DEFAULT_TIDE_REFERENCE_ID,
  }
}

export function getCurrentLabel(sourceId?: string): string {
  if (!sourceId) return "Unknown source"
  return getCurrentReferenceById(sourceId)?.label ?? "Unknown source"
}

export function getReferenceNote(sourceId?: string): string | undefined {
  if (!sourceId) return undefined
  return getCurrentReferenceById(sourceId)?.notes
}

export function isCurrentSource(sourceId?: string): boolean {
  if (!sourceId) return false
  return getCurrentReferenceById(sourceId)?.type === "current"
}

export function isTideSource(sourceId?: string): boolean {
  if (!sourceId) return false
  return getCurrentReferenceById(sourceId)?.type === "tide"
}

export function formatCurrentDirection(direction?: string): string {
  switch (direction) {
    case "flood":
      return "Flood"
    case "ebb":
      return "Ebb"
    case "slack":
      return "Slack"
    default:
      return "Unknown"
  }
}

export function formatCurrentStrength(strength?: CurrentStrength): string {
  switch (strength) {
    case "weak":
      return "Weak"
    case "moderate":
      return "Moderate"
    case "strong":
      return "Strong"
    default:
      return "Unknown"
  }
}

export function inferCurrentStrength(speedKt?: number): CurrentStrength | undefined {
  if (typeof speedKt !== "number" || Number.isNaN(speedKt)) return undefined
  if (speedKt < 0.75) return "weak"
  if (speedKt < 1.5) return "moderate"
  return "strong"
}

export function buildCurrentSummary(reading?: CurrentReading): string {
  if (!reading) return "No current reading yet."

  const direction = formatCurrentDirection(reading.direction)
  const speed =
    typeof reading.speedKt === "number" ? `${reading.speedKt.toFixed(1)} kt` : "speed unknown"
  const strength = formatCurrentStrength(reading.strength ?? inferCurrentStrength(reading.speedKt))

  if (direction === "Unknown" && speed === "speed unknown") {
    return "Current reading available, but details are limited."
  }

  return `${direction} current, ${speed}, ${strength.toLowerCase()} strength.`
}

export function buildTideSummary(reading?: TideReading): string {
  if (!reading) return "No tide reading yet."

  const parts: string[] = []

  if (reading.stage) {
    parts.push(`Stage: ${reading.stage}`)
  }

  if (typeof reading.heightFt === "number") {
    parts.push(`Height: ${reading.heightFt.toFixed(1)} ft`)
  }

  if (reading.nextHighTime) {
    parts.push(`Next high: ${reading.nextHighTime}`)
  }

  if (reading.nextLowTime) {
    parts.push(`Next low: ${reading.nextLowTime}`)
  }

  return parts.length > 0 ? parts.join(" • ") : "Tide reading available, but details are limited."
}