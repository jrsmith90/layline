

export type CurrentReferenceType = "current" | "tide"

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
]

export const DEFAULT_CURRENT_REFERENCE_ID = "bay_bridge_current"
export const DEFAULT_TIDE_REFERENCE_ID = "annapolis_tide"

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