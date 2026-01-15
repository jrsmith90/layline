import { Panel } from "@/components/ui/Panel";
import { BtnLink } from "@/components/ui/Btn";
import { Chip } from "@/components/ui/Chip";

export default function Home() {
  return (
    <main className="space-y-5">
      {/* Header */}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Layline</h1>
          <p className="text-sm text-[color:var(--muted)]">
            A Cal 25 Sailing Guide
          </p>
        </div>
        <div className="text-xs text-[color:var(--muted)]">
          v1
        </div>
      </header>

      {/* Instrument bar */}
      <Panel title="Instruments" right={<span className="text-xs text-[color:var(--muted)]">Tap into Trim for live values</span>}>
        <div className="grid grid-cols-2 gap-3">
          <Chip label="Mode" value="Upwind" accent="blue" />
          <Chip label="Wind" value="— kt" accent="teal" />
          <Chip label="Car" value="—" accent="neutral" />
          <Chip label="GPS" value="Off" accent="neutral" />
        </div>
      </Panel>

      {/* Panic */}
      <Panel title="Quick Fix">
        <BtnLink href="/troubleshoot/slow" tone="amber" className="text-lg">
          I’M SLOW
        </BtnLink>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Fast checklist to stabilize speed before you start tweaking.
        </p>
      </Panel>

      {/* Navigation */}
      <Panel title="Sections">
        <div className="grid grid-cols-2 gap-3">
          <BtnLink href="/trim" tone="primary">
            Trim
          </BtnLink>
          <BtnLink href="/start" tone="neutral">
            Start
          </BtnLink>
          <BtnLink href="/tactics" tone="neutral">
            Tactics
          </BtnLink>
          <BtnLink href="/troubleshoot" tone="neutral">
            Troubleshoot
          </BtnLink>
          <BtnLink href="/logs" tone="neutral">
            Logs
          </BtnLink>
          <BtnLink href="/notes" tone="neutral">
            Notes
          </BtnLink>
        </div>
      </Panel>

      {/* Accent bar */}
      <div className="h-1 w-full rounded-full bg-[color:var(--teal)]/30" />
    </main>
  );
}