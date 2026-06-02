import { NextRequest, NextResponse } from "next/server";
import type {
  CourseStrategyAnswers,
  CourseStrategyResult,
} from "@/lib/race/courseStrategy/types";
import { getCourseStrategyReferencePolicy } from "@/lib/reference/decisionBasis";

function pushUnique(items: string[], value: string) {
  if (!items.includes(value)) {
    items.push(value);
  }
}

function scoreStrategy(answers: CourseStrategyAnswers): CourseStrategyResult {
  const keyRisks: string[] = [];
  const recommendations: string[] = [];
  const referencePolicy = getCourseStrategyReferencePolicy(answers.zones);

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
        pushUnique(
          recommendations,
          "Zone headings are very similar; monitor for shifts that favor one side.",
        );
      } else if (headingDiff > 60) {
        pushUnique(
          recommendations,
          "Wide heading difference between zones; clear lane separation strategy.",
        );
      }
    }

    if (port?.windShiftRisk === "high" && starboard?.windShiftRisk === "low") {
      pushUnique(
        recommendations,
        `Favor ${starboard.label.toLowerCase()} to avoid wind shift risk in ${port.label.toLowerCase()}`,
      );
    } else if (starboard?.windShiftRisk === "high" && port?.windShiftRisk === "low") {
      pushUnique(
        recommendations,
        `Favor ${port.label.toLowerCase()} to avoid wind shift risk in ${starboard.label.toLowerCase()}`,
      );
    }

    if (port?.currentEffect === "favorable" && starboard?.currentEffect === "adverse") {
      pushUnique(
        recommendations,
        `Current advantage favors ${port.label.toLowerCase()} side.`,
      );
    } else if (starboard?.currentEffect === "favorable" && port?.currentEffect === "adverse") {
      pushUnique(
        recommendations,
        `Current advantage favors ${starboard.label.toLowerCase()} side.`,
      );
    }
  }

  if (referencePolicy.phaseOverCorners) {
    pushUnique(
      recommendations,
      "Stay in phase with the shifts before forcing a full-corner split.",
    );
  }

  if (referencePolicy.currentBreaksTies) {
    pushUnique(
      recommendations,
      "If the wind picture stays close, let current break the tie instead of splitting on heading alone.",
    );
  }

  if (referencePolicy.preferFlexibility) {
    pushUnique(
      recommendations,
      "Keep the first move flexible until the observed lane confirms the forecasted edge.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Monitor both zones equally for shifts and current changes.");
  }

  if (
    answers.zones.every(
      (zone) => zone.windShiftRisk === "unknown" && zone.currentEffect === "unknown",
    )
  ) {
    pushUnique(
      recommendations,
      "No clean edge is mapped yet; keep options open and preserve the first tack or gybe change.",
    );
  }

  return {
    zoneAnalysis: answers.zones,
    keyRisks,
    recommendations,
    referenceBasis: referencePolicy.basis,
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

      if (
        zone.laylineHeadingDeg != null &&
        (zone.laylineHeadingDeg < 0 || zone.laylineHeadingDeg > 360)
      ) {
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
