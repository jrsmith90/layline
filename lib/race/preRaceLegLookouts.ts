import type { CourseSummary } from "@/data/race/getCourseData";
import { getConstraintActionCopy, getConstraintHeadline, getConstraintsForLeg } from "@/lib/race/instructionConstraints";
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
  watchFors: string[];
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

function modeWatchCopy(mode: OpeningLegSailingMode) {
  if (mode === "upwind") {
    return "Watch whether the lane with cleaner pressure still lets you stay in phase instead of chasing a corner too early.";
  }

  if (mode === "downwind") {
    return "Watch pressure bands, current lanes, and whether the next gybe setup helps the mark approach more than a short-term speed gain.";
  }

  return "Watch whether the hotter lane is actually converting to VMG, and avoid forcing a mode change before the pressure picture is clear.";
}

function pushUnique(items: string[], value: string | null) {
  if (!value || items.includes(value)) return;
  items.push(value);
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

  return params.courseData.course.legs.map((leg, index, allLegs) => {
    const fromLabel = getMarkShortLabel(leg.fromMark, params.courseData.marks[leg.fromMark]);
    const toLabel = getMarkShortLabel(leg.toMark, params.courseData.marks[leg.toMark]);
    const mode = detectOpeningLegSailingMode({
      firstLegBearingDeg: leg.bearingDeg,
      windDirectionDeg,
      laylineDeg: tackAngleDeg,
    });
    const watchFors: string[] = [modeWatchCopy(mode)];
    const legConstraints = getConstraintsForLeg(params.courseData, index);

    if (legConstraints.length > 0) {
      pushUnique(
        watchFors,
        `Legal setup matters here: ${legConstraints
          .map((constraint) => `${getConstraintActionCopy(constraint)} at ${getConstraintHeadline(constraint)}`)
          .join("; ")}.`,
      );
    } else if (index === allLegs.length - 1) {
      pushUnique(
        watchFors,
        "Start protecting the finish approach early enough that a short-term lane gain does not force a bad final setup.",
      );
    } else {
      pushUnique(
        watchFors,
        `Start the next call before ${toLabel}: exit this leg with the rounding and next-leg lane already in mind.`,
      );
    }

    if (index === 0) {
      if (params.draft.routeBias.originalPlan) {
        pushUnique(
          watchFors,
          `Saved opening bias is ${formatOpeningBiasLabel(params.draft.routeBias.originalPlan.decision)}. Keep it only if the live wind and current still confirm the same edge.`,
        );
      }

      if (favorableZones.length > 0 || adverseZones.length > 0) {
        const zoneCopy = [
          favorableZones.length > 0
            ? `Step 3 current read favored ${favorableZones.join(" and ")}`
            : null,
          adverseZones.length > 0 ? `and warned against ${adverseZones.join(" and ")}` : null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(" ");

        pushUnique(watchFors, `${zoneCopy}.`);
      }

      if (params.draft.confirmedSailSelection?.finalCall) {
        pushUnique(
          watchFors,
          `Crew setup note: ${params.draft.confirmedSailSelection.finalCall}`,
        );
      }
    }

    return {
      legNumber: leg.legNumber,
      fromLabel,
      toLabel,
      modeLabel: modeLabel(mode),
      bearingDeg: leg.bearingDeg,
      distanceNm: leg.distanceNmCalculated,
      watchFors: watchFors.slice(0, 4),
    };
  });
}
