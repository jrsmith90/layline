import type {
  CurrentSide,
  EdgeStrength,
  PressureSide,
  WindTrend,
} from "@/data/race/getRouteBiasInputs";
import { getCourseCode, type CourseSummary } from "@/data/race/getCourseData";
import { wrap360 } from "@/lib/race/courseTracker";
import type {
  CourseWindRead,
  CurrentImpactDecision,
  ForecastDecision,
} from "@/lib/race/preRaceCoachAssist";

export type RouteBiasCoachAutofill = {
  windDirectionDeg: number | null;
  windSpeedKt: number | null;
  windTrend: WindTrend;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
  edgeStrength: EdgeStrength;
  summary: string;
  reasoning: string[];
};

const OPEN_BAY_BEARING_DEG = 110;

function mapForecastTrendToRouteTrend(trend: ForecastDecision["trend"]): WindTrend {
  if (trend === "building") return "building";
  if (trend === "easing") return "fading";
  if (trend === "steady") return "steady";
  return "unknown";
}

function getBaySideOfFirstLeg(courseData: CourseSummary): "left" | "right" | "unknown" {
  const firstLegBearingDeg = courseData.firstLeg?.bearingDeg;
  if (typeof firstLegBearingDeg !== "number" || !Number.isFinite(firstLegBearingDeg)) {
    return "unknown";
  }

  const leftNormalDeg = wrap360(firstLegBearingDeg - 90);
  const rightNormalDeg = wrap360(firstLegBearingDeg + 90);
  const leftDelta = Math.abs((((leftNormalDeg - OPEN_BAY_BEARING_DEG) % 360) + 540) % 360 - 180);
  const rightDelta = Math.abs(
    ((((rightNormalDeg - OPEN_BAY_BEARING_DEG) % 360) + 540) % 360) - 180,
  );

  if (Math.abs(leftDelta - rightDelta) < 8) {
    return "unknown";
  }

  return leftDelta < rightDelta ? "left" : "right";
}

function inferPressureSide(params: {
  courseData: CourseSummary;
  forecastDecision: ForecastDecision;
}): { value: PressureSide; reason: string } {
  const windSpeedKt = params.forecastDecision.recommendedWindKt;
  const courseCode = getCourseCode(params.courseData.courseId);
  const isShortLocalCourse =
    courseCode === "1" ||
    courseCode === "1R" ||
    courseCode === "short" ||
    courseCode === "shortR";
  const isOpenBayCourse =
    courseCode === "2" ||
    courseCode === "2R" ||
    courseCode === "3" ||
    courseCode === "3R" ||
    courseCode === "4" ||
    courseCode === "4R" ||
    courseCode === "medium" ||
    courseCode === "mediumR";

  if (params.forecastDecision.confidence === "low") {
    return {
      value: "unclear",
      reason: "Forecast confidence is low, so the coach is not forcing a pressure-side call yet.",
    };
  }

  if ((params.forecastDecision.directionSpreadDeg ?? 0) >= 18) {
    return {
      value: "unclear",
      reason: "Direction spread is wide enough that pressure shape still needs visual confirmation.",
    };
  }

  if (typeof windSpeedKt === "number" && params.forecastDecision.trend === "building") {
    if (isOpenBayCourse || windSpeedKt >= 12) {
      return {
        value: "bay",
        reason: "Building breeze on a more exposed course leans the coach toward the open-bay lane.",
      };
    }
  }

  if (typeof windSpeedKt === "number" && params.forecastDecision.trend === "easing") {
    if (isShortLocalCourse || windSpeedKt <= 8) {
      return {
        value: "shore",
        reason: "Lighter or easing pressure on a local course leans the coach toward the shore lane.",
      };
    }
  }

  if (typeof windSpeedKt === "number" && windSpeedKt <= 7 && isShortLocalCourse) {
    return {
      value: "shore",
      reason: "In lighter local-course pressure, the coach gives the shoreline a slight nod.",
    };
  }

  if (typeof windSpeedKt === "number" && windSpeedKt >= 14 && isOpenBayCourse) {
    return {
      value: "bay",
      reason: "Stronger breeze on an exposed course points the coach toward cleaner open-bay pressure.",
    };
  }

  return {
    value: "even",
    reason: "No clean pressure edge stands out from the forecast alone, so the coach keeps this even.",
  };
}

function inferCurrentSide(params: {
  courseData: CourseSummary;
  currentImpact: CurrentImpactDecision;
}): { value: CurrentSide; reason: string } {
  if (params.currentImpact.betterWaterSide === "unknown") {
    return {
      value: "unclear",
      reason: "No nearby current read is strong enough yet to pin the better side of the first leg.",
    };
  }

  if (params.currentImpact.betterWaterSide === "even" || params.currentImpact.level === "low") {
    return {
      value: "even",
      reason: "Current looks minor enough that it should not dominate the first-leg side choice.",
    };
  }

  const baySide = getBaySideOfFirstLeg(params.courseData);
  if (baySide === "unknown") {
    return {
      value: "unclear",
      reason: "The coach can see a better water side, but this leg’s shore-vs-bay orientation is still ambiguous.",
    };
  }

  const betterSide = params.currentImpact.betterWaterSide;
  const favorsBay = betterSide === baySide;

  return {
    value: favorsBay ? "bay_more_favorable" : "shore_more_favorable",
    reason: favorsBay
      ? "Tide/current setup points toward the open-bay side of the projected first leg."
      : "Tide/current setup points toward the shore side of the projected first leg.",
  };
}

function inferEdgeStrength(params: {
  forecastDecision: ForecastDecision;
  currentImpact: CurrentImpactDecision;
  pressureSide: PressureSide;
  currentSide: CurrentSide;
}): { value: EdgeStrength; reason: string } {
  let score = 0;

  if (params.pressureSide === "shore" || params.pressureSide === "bay") {
    score += 1;
  }

  if (
    params.currentSide === "shore_less_adverse" ||
    params.currentSide === "bay_less_adverse" ||
    params.currentSide === "shore_more_favorable" ||
    params.currentSide === "bay_more_favorable"
  ) {
    score += params.currentImpact.level === "high" ? 2 : 1;
  }

  if (params.forecastDecision.confidence === "high" && (params.forecastDecision.directionSpreadDeg ?? 0) <= 12) {
    score += 1;
  }

  if (params.currentImpact.level === "high") {
    score += 1;
  }

  if (score >= 4) {
    return {
      value: "strong",
      reason: "Forecast confidence and current setup are aligned enough for the coach to call this a strong edge.",
    };
  }

  if (score >= 2) {
    return {
      value: "moderate",
      reason: "There is a usable opening hint here, but the coach still wants some flexibility.",
    };
  }

  if (score > 0 || params.currentImpact.level === "low" || params.pressureSide === "even") {
    return {
      value: "weak",
      reason: "The signal is present but small, so the coach treats it as a weak edge.",
    };
  }

  return {
    value: "unclear",
    reason: "The coach does not see enough aligned evidence yet to call a real opening edge.",
  };
}

export function buildRouteBiasCoachAutofill(params: {
  courseData: CourseSummary;
  courseWindRead: CourseWindRead;
  forecastDecision: ForecastDecision;
  currentImpact: CurrentImpactDecision;
}): RouteBiasCoachAutofill {
  const windDirectionDeg =
    params.forecastDecision.recommendedWindDirectionDeg ?? params.courseWindRead.windDirectionDeg ?? null;
  const windSpeedKt =
    params.forecastDecision.recommendedWindKt ?? params.courseWindRead.windAvgKt ?? null;
  const windTrend = mapForecastTrendToRouteTrend(params.forecastDecision.trend);
  const pressureSide = inferPressureSide({
    courseData: params.courseData,
    forecastDecision: params.forecastDecision,
  });
  const currentSide = inferCurrentSide({
    courseData: params.courseData,
    currentImpact: params.currentImpact,
  });
  const edgeStrength = inferEdgeStrength({
    forecastDecision: params.forecastDecision,
    currentImpact: params.currentImpact,
    pressureSide: pressureSide.value,
    currentSide: currentSide.value,
  });

  return {
    windDirectionDeg,
    windSpeedKt,
    windTrend,
    pressureSide: pressureSide.value,
    currentSide: currentSide.value,
    edgeStrength: edgeStrength.value,
    summary: [
      windDirectionDeg != null ? `Projected wind ${Math.round(windDirectionDeg)} deg` : null,
      windSpeedKt != null ? `around ${windSpeedKt.toFixed(1)} kt` : null,
      pressureSide.value !== "unclear" ? `pressure leans ${pressureSide.value}` : "pressure still unclear",
      currentSide.value !== "unclear" ? "current read is loaded" : "current still needs a live sanity check",
    ]
      .filter((part): part is string => Boolean(part))
      .join(" - "),
    reasoning: [pressureSide.reason, currentSide.reason, edgeStrength.reason],
  };
}
