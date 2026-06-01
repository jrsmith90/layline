import { NextRequest, NextResponse } from "next/server";
import type {
  CourseStrategyAnswers,
  CourseStrategyResult,
} from "@/lib/race/courseStrategy/types";

function scoreStrategy(answers: CourseStrategyAnswers): CourseStrategyResult {
  const keyRisks: string[] = [];
  const recommendations: string[] = [];

  // Analyze zones for risks
  const highRiskZones = answers.zones.filter((z) => z.windShiftRisk === "high");
  if (highRiskZones.length > 0) {
    keyRisks.push(
      `High wind shift risk in ${highRiskZones.map((z) => z.label.toLowerCase()).join(", ")}`,
    );
  }

  const adverseCurrentZones = answers.zones.filter((z) => z.currentEffect === "adverse");
  if (adverseCurrentZones.length > 0) {
    keyRisks.push(
      `Adverse current in ${adverseCurrentZones.map((z) => z.label.toLowerCase()).join(", ")}`,
    );
  }

  // Generate recommendations based on zone analysis
  if (answers.zones.length >= 2) {
    const port = answers.zones[0];
    const starboard = answers.zones[1];

    if (port?.headingDeg != null && starboard?.headingDeg != null) {
      const headingDiff = Math.abs(port.headingDeg - starboard.headingDeg);
      if (headingDiff < 30) {
        recommendations.push("Zone headings are very similar; monitor for shifts that favor one side");
      } else if (headingDiff > 60) {
        recommendations.push("Wide heading difference between zones; clear lane separation strategy");
      }
    }

    if (port?.windShiftRisk === "high" && starboard?.windShiftRisk === "low") {
      recommendations.push(
        `Favor ${starboard.label.toLowerCase()} to avoid wind shift risk in ${port.label.toLowerCase()}`,
      );
    } else if (starboard?.windShiftRisk === "high" && port?.windShiftRisk === "low") {
      recommendations.push(
        `Favor ${port.label.toLowerCase()} to avoid wind shift risk in ${starboard.label.toLowerCase()}`,
      );
    }

    if (port?.currentEffect === "favorable" && starboard?.currentEffect === "adverse") {
      recommendations.push(`Current advantage favors ${port.label.toLowerCase()} side`);
    } else if (starboard?.currentEffect === "favorable" && port?.currentEffect === "adverse") {
      recommendations.push(`Current advantage favors ${starboard.label.toLowerCase()} side`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Monitor both zones equally for shifts and current changes");
  }

  return {
    zoneAnalysis: answers.zones,
    keyRisks,
    recommendations,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const answers = body as CourseStrategyAnswers;

    // Validate required fields
    if (!answers.courseId || !Array.isArray(answers.zones) || answers.zones.length === 0) {
      return NextResponse.json(
        { error: "Invalid course strategy: missing courseId or zones" },
        { status: 400 },
      );
    }

    // Validate zones
    for (const zone of answers.zones) {
      if (!zone.id || !zone.label) {
        return NextResponse.json(
          { error: "Invalid zone: missing id or label" },
          { status: 400 },
        );
      }

      if (zone.headingDeg != null && (zone.headingDeg < 0 || zone.headingDeg > 360)) {
        return NextResponse.json(
          { error: `Invalid heading in ${zone.label}: must be 0-360` },
          { status: 400 },
        );
      }

      if (zone.laylineHeadingDeg != null && (zone.laylineHeadingDeg < 0 || zone.laylineHeadingDeg > 360)) {
        return NextResponse.json(
          { error: `Invalid layline heading in ${zone.label}: must be 0-360` },
          { status: 400 },
        );
      }
    }

    // Score the strategy
    const result = scoreStrategy(answers);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Strategy scoring error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Strategy submission failed" },
      { status: 500 },
    );
  }
}
