"use client";

import { useSyncExternalStore } from "react";
import {
  getCustomCoursesVersion,
  subscribeCustomCourses,
} from "@/data/race/customCourses";
import {
  getRaceConstraintOverrideVersion,
  subscribeRaceConstraintOverrides,
} from "@/data/race/customConstraints";
import { getAllCourseIds, getCourseData } from "@/data/race/getCourseData";

function subscribeCourseCatalog(listener: () => void) {
  const unsubscribeCustomCourses = subscribeCustomCourses(listener);
  const unsubscribeConstraints = subscribeRaceConstraintOverrides(listener);

  return () => {
    unsubscribeCustomCourses();
    unsubscribeConstraints();
  };
}

function getCourseCatalogVersion() {
  return getCustomCoursesVersion() + getRaceConstraintOverrideVersion();
}

export function useCourseCatalogVersion() {
  return useSyncExternalStore(
    subscribeCourseCatalog,
    getCourseCatalogVersion,
    () => 0,
  );
}

export function useCourseIds() {
  useCourseCatalogVersion();
  return getAllCourseIds();
}

export function useResolvedCourseData(courseId: string) {
  useCourseCatalogVersion();
  return getCourseData(courseId);
}
