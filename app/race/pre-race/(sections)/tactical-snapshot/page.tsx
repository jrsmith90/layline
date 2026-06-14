"use client";

import { PreRaceTacticalSnapshot } from "@/components/race/PreRaceTacticalSnapshot";

function SectionHead({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[color:var(--divider)] pb-3">
      <span className="layline-kicker">{badge}</span>
      <span className="flex-1 text-sm font-semibold text-[color:var(--text-soft)]">{title}</span>
    </div>
  );
}

export default function TacticalSnapshotPage() {
  return (
    <section>
      <SectionHead badge="Tactical Snapshot" title="Carry the launch picture forward" />
      <PreRaceTacticalSnapshot />
    </section>
  );
}
