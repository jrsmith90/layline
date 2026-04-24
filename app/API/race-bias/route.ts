import { NextResponse } from "next/server";
import { scoreRouteBias } from "@/lib/race/scoreRouteBias";

export async function POST(request: Request) {
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
}