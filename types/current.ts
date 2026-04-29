    
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

export type CurrentStrength = "weak" | "moderate" | "strong"
export type CurrentDirection = "flood" | "ebb" | "slack" | "unknown"
export type WaterAdvantageSide = "left" | "right" | "even" | "unknown"
export type EdgeStrength = "small" | "medium" | "strong" | "unknown"

export interface SelectedCurrentSetup {
  currentSourceId: string
  tideSourceId: string
}

export interface CurrentReading {
  sourceId: string
  stationId: string
  timestamp?: string
  direction: CurrentDirection
  speedKt?: number
  strength?: CurrentStrength
  nextSlackTime?: string
  notes?: string
}

export interface TideReading {
  sourceId: string
  stationId: string
  timestamp?: string
  stage?: "high" | "low" | "rising" | "falling"
  heightFt?: number
  nextHighTime?: string
  nextLowTime?: string
  notes?: string
}

export interface WaterSetupAssessment {
  betterWaterSide: WaterAdvantageSide
  edgeStrength: EdgeStrength
  reasoning: string[]
  confidence: number
}