import { NextResponse } from "next/server";
import {
  scoreRouteBias,
  type RouteBiasAnswers
} from "@/lib/race/scoreRouteBias";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOpeningLegType(
  value: string
): value is RouteBiasAnswers["openingLegType"] {
  return [
    "mostly_upwind",
    "close_reach",
    "beam_reach",
    "broad_reach",
    "unknown"
  ].includes(value);
}

function isWindTrend(value: string): value is RouteBiasAnswers["windTrend"] {
  return [
    "building",
    "fading",
    "steady",
    "oscillating",
    "unstable",
    "unknown"
  ].includes(value);
}

function isPressureSide(
  value: string
): value is RouteBiasAnswers["pressureSide"] {
  return ["shore", "bay", "even", "unclear"].includes(value);
}

function isCurrentSide(
  value: string
): value is RouteBiasAnswers["currentSide"] {
  return [
    "shore_less_adverse",
    "bay_less_adverse",
    "shore_more_favorable",
    "bay_more_favorable",
    "even",
    "unclear"
  ].includes(value);
}

function isEdgeStrength(
  value: string
): value is RouteBiasAnswers["edgeStrength"] {
  return ["strong", "moderate", "weak", "unclear"].includes(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    const {
      courseId,
      openingLegType,
      windDirectionDeg,
      windSpeedKt,
      windTrend,
      pressureSide,
      currentSide,
      edgeStrength
    } = body as Record<string, unknown>;

    if (!isNonEmptyString(courseId)) {
      return NextResponse.json(
        { error: "courseId is required." },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(openingLegType)) {
      return NextResponse.json(
        { error: "openingLegType is required." },
        { status: 400 }
      );
    }

    if (!isOpeningLegType(openingLegType)) {
      return NextResponse.json(
        { error: "openingLegType is invalid." },
        { status: 400 }
      );
    }

    if (typeof windDirectionDeg !== "number" || Number.isNaN(windDirectionDeg)) {
      return NextResponse.json(
        { error: "windDirectionDeg must be a valid number." },
        { status: 400 }
      );
    }

    if (windDirectionDeg < 0 || windDirectionDeg > 360) {
      return NextResponse.json(
        { error: "windDirectionDeg must be between 0 and 360." },
        { status: 400 }
      );
    }

    if (typeof windSpeedKt !== "number" || Number.isNaN(windSpeedKt)) {
      return NextResponse.json(
        { error: "windSpeedKt must be a valid number." },
        { status: 400 }
      );
    }

    if (windSpeedKt < 0) {
      return NextResponse.json(
        { error: "windSpeedKt must be 0 or greater." },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(windTrend)) {
      return NextResponse.json(
        { error: "windTrend is required." },
        { status: 400 }
      );
    }

    if (!isWindTrend(windTrend)) {
      return NextResponse.json(
        { error: "windTrend is invalid." },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(pressureSide)) {
      return NextResponse.json(
        { error: "pressureSide is required." },
        { status: 400 }
      );
    }

    if (!isPressureSide(pressureSide)) {
      return NextResponse.json(
        { error: "pressureSide is invalid." },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(currentSide)) {
      return NextResponse.json(
        { error: "currentSide is required." },
        { status: 400 }
      );
    }

    if (!isCurrentSide(currentSide)) {
      return NextResponse.json(
        { error: "currentSide is invalid." },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(edgeStrength)) {
      return NextResponse.json(
        { error: "edgeStrength is required." },
        { status: 400 }
      );
    }

    if (!isEdgeStrength(edgeStrength)) {
      return NextResponse.json(
        { error: "edgeStrength is invalid." },
        { status: 400 }
      );
    }

    const result = scoreRouteBias({
      courseId,
      openingLegType,
      windDirectionDeg,
      windSpeedKt,
      windTrend,
      pressureSide,
      currentSide,
      edgeStrength
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to score route bias",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}