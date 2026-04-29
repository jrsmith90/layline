

import type {
  CurrentReading,
  EdgeStrength,
  TideReading,
  WaterAdvantageSide,
  WaterSetupAssessment,
} from "@/types/current"

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

export function scoreCurrentStrength(speedKt?: number): number {
  if (typeof speedKt !== "number" || Number.isNaN(speedKt)) return 0
  if (speedKt < 0.5) return 0.2
  if (speedKt < 1.0) return 0.45
  if (speedKt < 1.5) return 0.7
  return 1
}

export function scoreWindAgainstCurrentRisk(input: {
  windDirectionDeg?: number
  currentDirection?: "flood" | "ebb" | "slack" | "unknown"
  currentSpeedKt?: number
}): number {
  const { windDirectionDeg, currentDirection, currentSpeedKt } = input

  if (
    typeof windDirectionDeg !== "number" ||
    !currentDirection ||
    currentDirection === "unknown" ||
    currentDirection === "slack"
  ) {
    return 0
  }

  const strengthScore = scoreCurrentStrength(currentSpeedKt)

  if (currentDirection === "ebb") {
    return clamp(0.45 + strengthScore * 0.55)
  }

  if (currentDirection === "flood") {
    return clamp(0.2 + strengthScore * 0.35)
  }

  return 0
}

export function determineEdgeStrength(score: number): EdgeStrength {
  if (score >= 0.75) return "strong"
  if (score >= 0.4) return "medium"
  if (score > 0) return "small"
  return "unknown"
}

export function determineBetterWaterSide(input: {
  preferredSide?: WaterAdvantageSide
  currentReading?: CurrentReading
  windAgainstCurrentRisk?: number
}): WaterAdvantageSide {
  if (input.preferredSide && input.preferredSide !== "unknown") {
    return input.preferredSide
  }

  if (!input.currentReading) {
    return "unknown"
  }

  if (input.currentReading.direction === "slack") {
    return "even"
  }

  if ((input.windAgainstCurrentRisk ?? 0) >= 0.65) {
    return "right"
  }

  return "even"
}

export function buildWaterSetupAssessment(input: {
  preferredSide?: WaterAdvantageSide
  currentReading?: CurrentReading
  tideReading?: TideReading
  windDirectionDeg?: number
}): WaterSetupAssessment {
  const reasoning: string[] = []

  const windAgainstCurrentRisk = scoreWindAgainstCurrentRisk({
    windDirectionDeg: input.windDirectionDeg,
    currentDirection: input.currentReading?.direction,
    currentSpeedKt: input.currentReading?.speedKt,
  })

  const strengthScore = scoreCurrentStrength(input.currentReading?.speedKt)
  const combinedScore = clamp(Math.max(windAgainstCurrentRisk, strengthScore * 0.85))

  const betterWaterSide = determineBetterWaterSide({
    preferredSide: input.preferredSide,
    currentReading: input.currentReading,
    windAgainstCurrentRisk,
  })

  const edgeStrength = determineEdgeStrength(combinedScore)

  if (!input.currentReading) {
    reasoning.push("No current reading yet, so the water setup is still mostly a visual call.")
  } else {
    if (input.currentReading.direction === "slack") {
      reasoning.push("Current looks close to slack, so the water should be more even side to side.")
    }

    if (typeof input.currentReading.speedKt === "number") {
      reasoning.push(
        `Current speed is about ${input.currentReading.speedKt.toFixed(1)} kt, which helps set how meaningful the water difference may be.`,
      )
    }

    if (input.currentReading.direction === "ebb") {
      reasoning.push("An ebb can make the water rougher when the wind is opposed or when the course is more exposed.")
    }

    if (input.currentReading.direction === "flood") {
      reasoning.push("A flood may soften the water some, but exposed areas can still be rough depending on the breeze.")
    }
  }

  if (input.tideReading?.stage) {
    reasoning.push(`Tide stage is ${input.tideReading.stage}, which helps frame where the cycle is heading next.`)
  }

  if (betterWaterSide === "right") {
    reasoning.push("Right side currently gets the nod for better water based on the available setup inputs.")
  } else if (betterWaterSide === "left") {
    reasoning.push("Left side currently gets the nod for better water based on the available setup inputs.")
  } else if (betterWaterSide === "even") {
    reasoning.push("Water setup looks fairly even right now, so pressure and shifts may matter more than current.")
  }

  return {
    betterWaterSide,
    edgeStrength,
    reasoning,
    confidence: clamp(input.currentReading ? 0.72 : 0.35),
  }
}