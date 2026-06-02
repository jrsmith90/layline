"use client";

import { useSyncExternalStore } from "react";
import {
  getCustomCoursesVersion,
  subscribeCustomCourses,
} from "@/data/race/customCourses";
import { getAllCourseIds, getCourseData } from "@/data/race/getCourseData";

export function useCourseCatalogVersion() {
  return useSyncExternalStore(
    subscribeCustomCourses,
    getCustomCoursesVersion,
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
