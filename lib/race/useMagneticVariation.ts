"use client";

import { useSyncExternalStore } from "react";
import { parseVariation } from "@/lib/magneticVariation";
import {
  buildTacticalBoardDraftDefaults,
  getStoredTacticalBoardDraft,
  subscribeTacticalBoardStore,
} from "@/lib/race/tacticalBoard/store";
import { getDefaultCourseId } from "@/data/race/getCourseData";

const DEFAULT_DRAFT = buildTacticalBoardDraftDefaults(getDefaultCourseId());

/**
 * Returns the magnetic variation in degrees West from the tactical board draft.
 * Falls back to Annapolis default (10.5° W) if not set.
 */
export function useMagneticVariation(): number {
  const draft = useSyncExternalStore(
    subscribeTacticalBoardStore,
    getStoredTacticalBoardDraft,
    () => DEFAULT_DRAFT
  );
  return parseVariation(draft.magneticVariationDeg);
}
