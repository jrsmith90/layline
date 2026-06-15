"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CourseDetailView } from "@/components/course-library/CourseDetailView";
import { deriveCourseStatus } from "@/types/courseLibrary";
import {
  getCourseLibraryEntries,
  getCourseLibraryEntry,
  initializeCourseLibrary,
  subscribeCourseLibraryStore,
} from "@/lib/courseLibraryStore";
import { COURSE_LIBRARY_SEED_DATA } from "@/lib/courseLibrarySeedData";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initializeCourseLibrary(COURSE_LIBRARY_SEED_DATA);
      setInitialized(true);
    }
  }, [initialized]);

  // Subscribe so the page re-renders on store changes (results/debrief updates)
  useSyncExternalStore(subscribeCourseLibraryStore, getCourseLibraryEntries, () => []);

  const entry = getCourseLibraryEntry(id);
  const today = getToday();

  if (!entry) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center lg:px-8">
        <div className="text-lg font-black text-[color:var(--text)]">Course not found</div>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          This course may have been deleted or the link is incorrect.
        </p>
        <Link
          href="/course-library"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--favorable)] hover:underline"
        >
          <ArrowLeft size={14} strokeWidth={2.3} />
          Back to Course Library
        </Link>
      </div>
    );
  }

  const status = deriveCourseStatus(entry, today);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <div className="mb-6">
        <Link
          href="/course-library"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={2.4} />
          Course Library
        </Link>
      </div>
      <CourseDetailView entry={entry} status={status} today={today} />
    </div>
  );
}
