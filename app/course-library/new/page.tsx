"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseForm } from "@/components/course-library/CourseForm";

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/course-library"
          className="layline-pill flex h-9 w-9 items-center justify-center text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2.4} />
        </Link>
        <div>
          <div className="layline-kicker">Course Library</div>
          <h1 className="text-xl font-black text-[color:var(--text)]">New Course</h1>
        </div>
      </div>
      <CourseForm />
    </div>
  );
}
