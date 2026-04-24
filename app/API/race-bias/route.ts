import { NextResponse } from "next/server";
import { scoreRouteBias } from "@/lib/race/scoreRouteBias";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = scoreRouteBias({
      courseId: body.courseId,
      openingLegType: body.openingLegType,
      windDirectionDeg: body.windDirectionDeg,
      windSpeedKt: body.windSpeedKt,
      windTrend: body.windTrend,
      pressureSide: body.pressureSide,
      currentSide: body.currentSide,
      edgeStrength: body.edgeStrength
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