"use client";

import { PreRaceLegHeadingChart } from "@/components/race/PreRaceLegHeadingChart";

function SectionHead({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[color:var(--divider)] pb-3">
      <span className="layline-kicker">{badge}</span>
      <span className="flex-1 text-sm font-semibold text-[color:var(--text-soft)]">{title}</span>
    </div>
  );
}

export default function HeadingReferencePage() {
  return (
    <section>
      <SectionHead badge="Heading Reference" title="Mark-to-mark heading chart" />
      <PreRaceLegHeadingChart />
    </section>
  );
}
