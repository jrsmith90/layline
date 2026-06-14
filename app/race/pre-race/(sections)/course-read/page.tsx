"use client";

import dynamic from "next/dynamic";
import CoursePreviewCard from "@/components/race/CoursePreviewCard";

const RaceConditionsMap = dynamic(
  () => import("@/components/race/RaceConditionsMap"),
  { ssr: false }
);

const TideCurrentChart = dynamic(
  () => import("@/components/race/TideCurrentChart"),
  { ssr: false }
);

function SectionHead({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[color:var(--divider)] pb-3">
      <span className="layline-kicker">{badge}</span>
      <span className="flex-1 text-sm font-semibold text-[color:var(--text-soft)]">{title}</span>
    </div>
  );
}

export default function CourseReadPage() {
  return (
    <section>
      <SectionHead badge="Course Read" title="Read the course and chart" />
      <div className="space-y-6">
        <CoursePreviewCard showControls={false} />
        <RaceConditionsMap showCourseSelector={false} />
        <div>
          <div className="mb-3 border-t border-[color:var(--divider)] pt-5">
            <div className="layline-kicker">Tide &amp; Current</div>
            <div className="mt-0.5 text-lg font-black text-[color:var(--text)]">
              24-hour tide and current chart
            </div>
          </div>
          <TideCurrentChart />
        </div>
      </div>
    </section>
  );
}
