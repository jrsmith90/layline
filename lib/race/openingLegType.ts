import type { OpeningLegType } from "@/data/race/getRouteBiasInputs";

const DEFAULT_UPWIND_LAYLINE_DEG = 42;

function normalizeAngle(deg: number) {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

function angleDifference(from: number, to: number) {
  let diff = normalizeAngle(to - from);
  if (diff > 180) diff -= 360;
  return diff;
}

export type OpeningLegAutoRead = {
  openingLegType: OpeningLegType;
  windAngleDeg: number | null;
  firstLegBearingDeg: number | null;
  windDirectionDeg: number | null;
  laylineDeg: number;
  laylineDeltaDeg: number | null;
  summary: string;
};

export type OpeningLegSailingMode = "upwind" | "reach" | "downwind";

export function getOpeningLegTypeLabel(value: OpeningLegType) {
  switch (value) {
    case "mostly_upwind":
      return "Mostly upwind";
    case "close_reach":
      return "Close reach";
    case "beam_reach":
      return "Beam reach";
    case "broad_reach":
      return "Broad reach";
    default:
      return "Unsure";
  }
}

export function detectOpeningLegType(params: {
  windDirectionDeg?: number | null;
  firstLegBearingDeg?: number | null;
  laylineDeg?: number | null;
}): OpeningLegAutoRead {
  const laylineDeg =
    typeof params.laylineDeg === "number" && Number.isFinite(params.laylineDeg)
      ? Math.max(20, Math.min(70, params.laylineDeg))
      : DEFAULT_UPWIND_LAYLINE_DEG;
  const windDirectionDeg =
    typeof params.windDirectionDeg === "number" && Number.isFinite(params.windDirectionDeg)
      ? normalizeAngle(params.windDirectionDeg)
      : null;
  const firstLegBearingDeg =
    typeof params.firstLegBearingDeg === "number" && Number.isFinite(params.firstLegBearingDeg)
      ? normalizeAngle(params.firstLegBearingDeg)
      : null;

  if (windDirectionDeg == null || firstLegBearingDeg == null) {
    return {
      openingLegType: "unknown",
      windAngleDeg: null,
      firstLegBearingDeg,
      windDirectionDeg,
      laylineDeg,
      laylineDeltaDeg: null,
      summary:
        "Enter a wind direction and use a course with a known first-leg bearing to auto-read the opening leg.",
    };
  }

  const windAngleDeg = Math.abs(angleDifference(windDirectionDeg, firstLegBearingDeg));
  const laylineDeltaDeg = Math.abs(windAngleDeg - laylineDeg);
  const upwindThreshold = Math.min(60, laylineDeg + 8);

  let openingLegType: OpeningLegType;
  if (windAngleDeg <= upwindThreshold) {
    openingLegType = "mostly_upwind";
  } else if (windAngleDeg <= 80) {
    openingLegType = "close_reach";
  } else if (windAngleDeg <= 120) {
    openingLegType = "beam_reach";
  } else {
    openingLegType = "broad_reach";
  }

  return {
    openingLegType,
    windAngleDeg: Number(windAngleDeg.toFixed(0)),
    firstLegBearingDeg: Number(firstLegBearingDeg.toFixed(0)),
    windDirectionDeg: Number(windDirectionDeg.toFixed(0)),
    laylineDeg,
    laylineDeltaDeg: Number(laylineDeltaDeg.toFixed(0)),
    summary:
      openingLegType === "mostly_upwind"
        ? `Auto-read: ${getOpeningLegTypeLabel(openingLegType)}. First-leg bearing ${Math.round(firstLegBearingDeg)}° sits about ${Math.round(windAngleDeg)}° off the wind, which is close to the ~${Math.round(laylineDeg)}° upwind layline.`
        : `Auto-read: ${getOpeningLegTypeLabel(openingLegType)}. First-leg bearing ${Math.round(firstLegBearingDeg)}° sits about ${Math.round(windAngleDeg)}° off the wind, which is freer than the ~${Math.round(laylineDeg)}° upwind layline.`
  };
}

export function detectOpeningLegSailingMode(params: {
  windDirectionDeg?: number | null;
  firstLegBearingDeg?: number | null;
  laylineDeg?: number | null;
}): OpeningLegSailingMode {
  const autoRead = detectOpeningLegType(params);

  if (autoRead.openingLegType === "mostly_upwind") {
    return "upwind";
  }

  if (autoRead.windAngleDeg != null && autoRead.windAngleDeg >= 120) {
    return "downwind";
  }

  return "reach";
}
