"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CourseForm } from "@/components/course-library/CourseForm";
import {
  getCourseLibraryEntries,
  getCourseLibraryEntry,
  initializeCourseLibrary,
  subscribeCourseLibraryStore,
} from "@/lib/courseLibraryStore";
import { COURSE_LIBRARY_SEED_DATA } from "@/lib/courseLibrarySeedData";

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initializeCourseLibrary(COURSE_LIBRARY_SEED_DATA);
      setInitialized(true);
    }
  }, [initialized]);

  useSyncExternalStore(subscribeCourseLibraryStore, getCourseLibraryEntries, () => []);

  const entry = getCourseLibraryEntry(id);

  if (!entry) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center lg:px-8">
        <div className="text-lg font-black text-[color:var(--text)]">Course not found</div>
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/course-library/${id}`}
          className="layline-pill flex h-9 w-9 items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2.4} />
        </Link>
        <div>
          <div className="layline-kicker">Course Library</div>
          <h1 className="text-xl font-black text-[color:var(--text)]">Edit Course</h1>
        </div>
      </div>
      <CourseForm existing={entry} />
    </div>
  );
}
