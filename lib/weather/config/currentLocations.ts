

export type CurrentReferenceType = "current" | "tide" | "wind"

export interface CurrentReferenceOption {
  id: string
  label: string
  stationId: string
  type: CurrentReferenceType
  shortUse: string
  notes?: string
  defaultBin?: number
}

export const CURRENT_REFERENCE_OPTIONS: CurrentReferenceOption[] = [
  {
    id: "bay_bridge_current",
    label: "Bay Bridge Current",
    stationId: "cb1102",
    type: "current",
    shortUse: "Open Bay current reference",
    notes:
      "Best primary current read for Bay-exposed legs. Use this when the course is more open and less river-influenced.",
  },
  {
    id: "cove_point_current",
    label: "Cove Point Current",
    stationId: "cb1001",
    type: "current",
    shortUse: "Broader Bay trend reference",
    notes:
      "Useful as a broader Bay comparison or backup current reference. Better for trend context than tight local course decisions.",
  },
  {
    id: "annapolis_tide",
    label: "Annapolis Tide",
    stationId: "8575512",
    type: "tide",
    shortUse: "Local tide stage reference",
    notes:
      "Use for tide timing and local water level context, not as the main current-direction source.",
  },
  {
    id: "thomas_point_wind",
    label: "Thomas Point / TPLM2",
    stationId: "TPLM2",
    type: "wind",
    shortUse: "Top of course / open Bay wind reference",
    notes:
      "Best default for Bay-facing course breeze, pressure, and trend. Use this when the windward mark or most of the course is in the open Bay.",
  },
  {
    id: "annapolis_buoy_wind",
    label: "Annapolis CBIBS Buoy",
    stationId: "AN",
    type: "wind",
    shortUse: "Bottom of course / Severn mouth wind and wave reference",
    notes:
      "Use for Annapolis and Severn-mouth water state, local wind, wave height, and transition into or out of the river.",
  },
  {
    id: "naval_academy_wind",
    label: "Naval Academy / KNAK",
    stationId: "KNAK",
    type: "wind",
    shortUse: "River wind reference",
    notes:
      "Good when racing inside the river. Less reliable for open Bay decisions because it is land and river influenced.",
  },
  {
    id: "nearby_radial_wind",
    label: "Nearby NDBC radial observations",
    stationId: "GPS",
    type: "wind",
    shortUse: "Phone GPS based 5 nm observation cloud",
    notes:
      "Uses phone GPS to search nearby NDBC stations, buoys, C-MAN, drifting buoys, ships, and other observations within 5 nautical miles over the last 6 hours.",
  },
]

export const DEFAULT_CURRENT_REFERENCE_ID = "bay_bridge_current"
export const DEFAULT_TIDE_REFERENCE_ID = "annapolis_tide"
export const DEFAULT_WIND_REFERENCE_ID = "thomas_point_wind"

export function getCurrentReferenceById(
  id: string,
): CurrentReferenceOption | undefined {
  return CURRENT_REFERENCE_OPTIONS.find((option) => option.id === id)
}

export const CURRENT_REFERENCE_LABELS: Record<string, string> =
  CURRENT_REFERENCE_OPTIONS.reduce<Record<string, string>>((acc, option) => {
    acc[option.id] = option.label
    return acc
  }, {})
