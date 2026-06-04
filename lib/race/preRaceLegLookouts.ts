import type { CurrentSide } from "@/data/race/getRouteBiasInputs";
import type { CourseSummary } from "@/data/race/getCourseData";
import { getConstraintsForLeg, getConstraintActionCopy, getConstraintHeadline } from "@/lib/race/instructionConstraints";
import {
  STRATEGY_REFERENCE_CATALOG,
  type ReferenceBasisKey,
} from "@/lib/reference/generatedStrategyReferences";
import { wrap360 } from "@/lib/race/courseTracker";
import { getMarkShortLabel } from "@/lib/race/markLabels";
import { formatOpeningBiasLabel } from "@/lib/race/openingBias";
import { detectOpeningLegSailingMode, type OpeningLegSailingMode } from "@/lib/race/openingLegType";
import type { TacticalBoardDraft } from "@/lib/race/tacticalBoard/store";

export type PreRaceLegLookout = {
  legNumber: number;
  fromLabel: string;
  toLabel: string;
  modeLabel: string;
  bearingDeg: number;
  distanceNm: number | null;
  headingSummary: string | null;
  primaryCall: string;
  triggerPoints: string[];
  referenceInsight: string[];
};

function parseDraftNumber(value: string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function modeLabel(mode: OpeningLegSailingMode) {
  if (mode === "upwind") return "Upwind";
  if (mode === "downwind") return "Downwind";
  return "Reach";
}

function pushUnique(items: string[], value: string | null) {
  if (!value || items.includes(value)) return;
  items.push(value);
}

function currentSideLabel(currentSide: CurrentSide | null | undefined) {
  switch (currentSide) {
    case "shore_less_adverse":
    case "shore_more_favorable":
      return "shore";
    case "bay_less_adverse":
    case "bay_more_favorable":
      return "bay";
    default:
      return null;
  }
}

function formatCitation(key: ReferenceBasisKey) {
  const entry = STRATEGY_REFERENCE_CATALOG[key];
  return entry.sources
    .map((source) => {
      const label = /^Chapter\s/iu.test(source.sourceFile) ? "NS" : "DDB";
      return `${label} p.${source.page}`;
    })
    .join("; ");
}

function buildReferenceInsight(keys: ReferenceBasisKey[], limit: number) {
  const seen = new Set<ReferenceBasisKey>();
  const lines: string[] = [];

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`${STRATEGY_REFERENCE_CATALOG[key].summary} (${formatCitation(key)})`);
    if (lines.length >= limit) break;
  }

  return lines;
}

function buildHeadingSummary(params: {
  mode: OpeningLegSailingMode;
  windDirectionDeg: number | null;
  tackAngleDeg: number;
  draft: TacticalBoardDraft;
  legIndex: number;
}) {
  if (params.legIndex === 0 && params.draft.courseStrategyResult?.zoneAnalysis?.length) {
    const zoneBits = params.draft.courseStrategyResult.zoneAnalysis
      .filter((zone) => zone.headingDeg != null)
      .map((zone) => `${zone.label} ${Math.round(zone.headingDeg ?? 0)}°`);

    if (zoneBits.length > 0) {
      return zoneBits.join(" / ");
    }
  }

  if (params.windDirectionDeg == null) {
    return null;
  }

  if (params.mode === "downwind") {
    return `Port gybe ${Math.round(wrap360(params.windDirectionDeg + 135))}° / Starboard gybe ${Math.round(
      wrap360(params.windDirectionDeg - 135),
    )}°`;
  }

  return `Port tack ${Math.round(wrap360(params.windDirectionDeg - params.tackAngleDeg))}° / Starboard tack ${Math.round(
    wrap360(params.windDirectionDeg + params.tackAngleDeg),
  )}°`;
}

function buildPrimaryCall(params: {
  mode: OpeningLegSailingMode;
  legIndex: number;
  draft: TacticalBoardDraft;
  favorableZones: string[];
  adverseZones: string[];
}) {
  if (params.legIndex === 0) {
    const decision = params.draft.routeBias.originalPlan?.decision;

    if (decision === "shore_first") {
      return "Open this leg expecting the shore lane to be first usable, but only hold it if the shore side still keeps both pressure and cleaner water in play.";
    }

    if (decision === "bay_first") {
      return "Open this leg expecting the bay lane to be first usable, but only stay on it if the bay side still has the better pressure-and-current combination.";
    }

    if (decision === "neutral") {
      return "Treat the first leg as a lower-leverage start: keep the boat in phase from the middle and move toward the first side that proves itself.";
    }

    if (decision === "mixed_signal") {
      return "Treat the first leg as a flexible read rather than a corner call. The first real edge should earn commitment, not assumption.";
    }
  }

  if (params.mode === "upwind") {
    return "Sail this leg to stay on the lifted tack and in the better lane. Only extend leverage when one side has a clear wind-and-water advantage.";
  }

  if (params.mode === "downwind") {
    return "Choose the gybe that keeps pressure, angle to the mark, and current working together. Avoid an early split that gives away the next approach.";
  }

  if (params.favorableZones.length > 0 || params.adverseZones.length > 0) {
    return "Use the hotter reach only if it still converts cleanly to the next mark. If the lane gets fast but tactically expensive, protect the rounding setup instead.";
  }

  return "On this reach, value the lane that stays fast and leaves a clean next move. A short burst of speed is not worth a poor mark approach.";
}

function buildTriggerPoints(params: {
  mode: OpeningLegSailingMode;
  legIndex: number;
  draft: TacticalBoardDraft;
  toLabel: string;
  favorableZones: string[];
  adverseZones: string[];
  legConstraints: ReturnType<typeof getConstraintsForLeg>;
}) {
  const items: string[] = [];
  const originalAnswers = params.draft.routeBias.originalAnswers;
  const currentBiasSide = currentSideLabel(originalAnswers?.currentSide);

  if (params.legIndex === 0 && currentBiasSide) {
    pushUnique(
      items,
      `If the wind lanes look close, let the ${currentBiasSide} current lane break the tie instead of forcing a pure pressure call.`,
    );
  }

  if (params.favorableZones.length > 0 || params.adverseZones.length > 0) {
    const parts = [
      params.favorableZones.length > 0
        ? `Current tables favor ${params.favorableZones.join(" and ")}`
        : null,
      params.adverseZones.length > 0
        ? `be careful about ${params.adverseZones.join(" and ")}`
        : null,
    ].filter((part): part is string => Boolean(part));

    pushUnique(items, `${parts.join("; ")}.`);
  }

  if (originalAnswers?.windTrend === "oscillating") {
    pushUnique(
      items,
      "If headers arrive rhythmically, tack on the headers and stay on the lifted tack rather than stretching for a corner.",
    );
  } else if (originalAnswers?.windTrend === "building") {
    pushUnique(
      items,
      "If one side begins to build consistently, let the better pressure lane outrank a small current difference.",
    );
  } else if (originalAnswers?.windTrend === "fading") {
    pushUnique(
      items,
      "If the breeze softens, expect current and lane preservation to matter more than a hard side bet.",
    );
  }

  if (params.legConstraints.length > 0) {
    pushUnique(
      items,
      `Protect the legal approach: ${params.legConstraints
        .map((constraint) => `${getConstraintActionCopy(constraint)} at ${getConstraintHeadline(constraint)}`)
        .join("; ")}.`,
    );
  } else {
    pushUnique(
      items,
      `Make the next decision before ${params.toLabel} so the rounding sets up the following leg instead of reacting after it.`,
    );
  }

  if (params.mode === "downwind") {
    pushUnique(
      items,
      "If one gybe gets fast but opens the gate to an ugly leeward approach, take the smaller speed loss and keep the better finish to the leg.",
    );
  }

  return items.slice(0, 3);
}

function buildReferenceKeys(params: {
  mode: OpeningLegSailingMode;
  legIndex: number;
  draft: TacticalBoardDraft;
  hasCurrentSignal: boolean;
}) {
  const keys: ReferenceBasisKey[] = [];
  const decision = params.draft.routeBias.originalPlan?.decision;
  const confidence = params.draft.routeBias.originalPlan?.confidence;
  const windTrend = params.draft.routeBias.originalAnswers?.windTrend ?? params.draft.windTrend;

  if (params.legIndex === 0 && params.mode === "upwind" && decision && decision !== "mixed_signal") {
    keys.push("start_side_alignment");
  }

  if (params.mode === "upwind") {
    keys.push("upwind_core");
  } else {
    keys.push("tactical_risk_control");
  }

  if (params.hasCurrentSignal) {
    keys.push("current_and_sailing_wind");
  }

  if (windTrend === "oscillating") {
    keys.push("oscillating_shift");
  }

  if (
    decision === "mixed_signal" ||
    confidence === "low" ||
    windTrend === "unstable" ||
    windTrend === "unknown"
  ) {
    keys.push("keep_options_open");
  }

  keys.push("forecast_confidence");
  return keys;
}

export function buildPreRaceLegLookouts(params: {
  courseData: CourseSummary;
  draft: TacticalBoardDraft;
}): PreRaceLegLookout[] {
  const windDirectionDeg =
    parseDraftNumber(params.draft.meanWindDirectionDeg) ??
    parseDraftNumber(params.draft.currentWindDirectionDeg);
  const tackAngleDeg = parseDraftNumber(params.draft.tackAngleDeg) ?? 42;
  const strategyZones = params.draft.courseStrategyResult?.zoneAnalysis ?? [];
  const favorableZones = strategyZones
    .filter((zone) => zone.currentEffect === "favorable")
    .map((zone) => zone.label);
  const adverseZones = strategyZones
    .filter((zone) => zone.currentEffect === "adverse")
    .map((zone) => zone.label);

  return params.courseData.course.legs.map((leg, index) => {
    const fromLabel = getMarkShortLabel(leg.fromMark, params.courseData.marks[leg.fromMark]);
    const toLabel = getMarkShortLabel(leg.toMark, params.courseData.marks[leg.toMark]);
    const mode = detectOpeningLegSailingMode({
      firstLegBearingDeg: leg.bearingDeg,
      windDirectionDeg,
      laylineDeg: tackAngleDeg,
    });
    const legConstraints = getConstraintsForLeg(params.courseData, index);
    const legFavorableZones = index === 0 ? favorableZones : [];
    const legAdverseZones = index === 0 ? adverseZones : [];
    const headingSummary = buildHeadingSummary({
      mode,
      windDirectionDeg,
      tackAngleDeg,
      draft: params.draft,
      legIndex: index,
    });
    const primaryCall = buildPrimaryCall({
      mode,
      legIndex: index,
      draft: params.draft,
      favorableZones: legFavorableZones,
      adverseZones: legAdverseZones,
    });
    const triggerPoints = buildTriggerPoints({
      mode,
      legIndex: index,
      draft: params.draft,
      toLabel,
      favorableZones: legFavorableZones,
      adverseZones: legAdverseZones,
      legConstraints,
    });
    const referenceInsight = buildReferenceInsight(
      buildReferenceKeys({
        mode,
        legIndex: index,
        draft: params.draft,
        hasCurrentSignal:
          index === 0 &&
          (legFavorableZones.length > 0 ||
            legAdverseZones.length > 0 ||
            currentSideLabel(params.draft.routeBias.originalAnswers?.currentSide) != null),
      }),
      2,
    );

    if (index === 0 && params.draft.confirmedSailSelection?.finalCall) {
      triggerPoints.unshift(`Sail package on deck: ${params.draft.confirmedSailSelection.finalCall}.`);
    }

    return {
      legNumber: leg.legNumber,
      fromLabel,
      toLabel,
      modeLabel: modeLabel(mode),
      bearingDeg: leg.bearingDeg,
      distanceNm: leg.distanceNmCalculated,
      headingSummary,
      primaryCall:
        index === 0 && params.draft.routeBias.originalPlan
          ? `${primaryCall} Saved opening bias: ${formatOpeningBiasLabel(params.draft.routeBias.originalPlan.decision)}.`
          : primaryCall,
      triggerPoints: triggerPoints.slice(0, 4),
      referenceInsight,
    };
  });
}
