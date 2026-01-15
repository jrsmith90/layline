import { Panel } from "@/components/ui/Panel";
import { BtnLink } from "@/components/ui/Btn";
import { Chip } from "@/components/ui/Chip";

export default function TrimHubPage() {
  return (
    <main className="space-y-5">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Trim</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Quick, repeatable adjustments. One change at a time.
        </p>
      </header>

      {/* Instrument strip (static for now; we’ll wire live values later) */}
      <Panel title="Instruments">
        <div className="grid grid-cols-2 gap-3">
          <Chip label="Mode" value="Upwind" accent="blue" />
          <Chip label="Wind" value="— kt" accent="teal" />
          <Chip label="Target" value="Speed" accent="neutral" />
          <Chip label="GPS" value="Off" accent="neutral" />
        </div>
      </Panel>

      {/* Primary choices */}
      <Panel title="Choose a sail">
        <div className="grid grid-cols-1 gap-3">
          <BtnLink href="/trim/jib" tone="primary" className="text-lg">
            Headsail (150%)
          </BtnLink>
          <BtnLink href="/trim/main" tone="neutral" className="text-lg">
            Mainsail
          </BtnLink>
        </div>

        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Headsail controls: sheet + car + halyard. Mainsail controls: sheet +
          traveler + backstay + outhaul + cunningham + vang.
        </p>
      </Panel>

      {/* Quick actions */}
      <Panel title="Quick actions">
        <div className="grid grid-cols-2 gap-3">
          <BtnLink href="/troubleshoot/slow" tone="amber">
            I’M SLOW
          </BtnLink>
          <BtnLink href="/logs" tone="neutral">
            Review Logs
          </BtnLink>
        </div>
      </Panel>

      {/* Back */}
      <BtnLink href="/" tone="neutral">
        Back
      </BtnLink>
    </main>
  );
}