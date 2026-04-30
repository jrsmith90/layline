import Link from "next/link";
import type { ReactNode } from "react";
import type { TroubleshootGuide } from "@/data/logic/troubleshootLogic";
import { TroubleshootLiveContextPanel } from "@/components/troubleshoot/TroubleshootLiveContextPanel";

function InfoBlock({
  label,
  children,
  tone = "text-white/60",
}: {
  label: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div>
      <div className={`text-xs font-semibold tracking-wide ${tone}`}>{label}</div>
      <div className="mt-1 text-sm leading-6 opacity-85">{children}</div>
    </div>
  );
}

export function TroubleshootGuidePage({ guide }: { guide: TroubleshootGuide }) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{guide.title}</h1>
        <p className="text-sm leading-6 opacity-75">{guide.summary}</p>
      </header>

      <TroubleshootLiveContextPanel />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Quick checks
          </div>
          <ul className="mt-2 space-y-2">
            {guide.quickChecks.map((check) => (
              <li key={check} className="flex gap-3 text-sm leading-6 opacity-85">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <InfoBlock label="CALL" tone="text-blue-300">
            {guide.call}
          </InfoBlock>
          <InfoBlock label="WHY">{guide.why}</InfoBlock>
          <InfoBlock label="DO NEXT" tone="text-green-300">
            {guide.doNext}
          </InfoBlock>
          <InfoBlock label="IF / THEN" tone="text-amber-300">
            {guide.ifThen}
          </InfoBlock>
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Sail system fixes
        </div>

        <div className="grid gap-3">
          {guide.sailFixes.map((fix) => (
            <article
              key={fix.system}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-60">
                    {fix.system}
                  </div>
                  <h2 className="mt-1 text-lg font-bold">{fix.label}</h2>
                  <p className="mt-1 text-sm leading-6 opacity-80">{fix.cue}</p>
                </div>

                <Link
                  href={fix.href}
                  className="rounded-xl bg-white px-4 py-2 text-center text-sm font-semibold text-black shadow transition active:scale-[0.98]"
                >
                  Open
                </Link>
              </div>

              <ul className="mt-4 space-y-2">
                {fix.actions.map((action) => (
                  <li key={action} className="flex gap-3 text-sm leading-6 opacity-85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-300" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3">
        <Link
          href="/troubleshoot"
          className="block rounded-2xl bg-white px-4 py-4 font-semibold text-black shadow transition active:scale-[0.98]"
        >
          Back to Troubleshoot
        </Link>

        <Link
          href="/"
          className="block rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold transition active:scale-[0.98]"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
