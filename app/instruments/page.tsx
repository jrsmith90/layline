"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { ConnectionStatus } from "@/components/boat-data/ConnectionStatus";
import { InstrumentGrid } from "@/components/instruments/InstrumentGrid";

export default function InstrumentsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-8 pt-4">
      <AppPageHeader
        eyebrow="Instruments"
        title="Live Instruments"
        description="Sunlight-readable boat instrument cards, fed by whatever boat data connection is active."
        actions={
          <Link
            href="/settings/boat-data"
            className="layline-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)]"
          >
            <Settings size={13} /> Connection
          </Link>
        }
      />

      <section className="layline-panel p-4">
        <ConnectionStatus />
      </section>

      <InstrumentGrid />
    </main>
  );
}
