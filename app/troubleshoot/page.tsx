import Link from "next/link";
import { TroubleshootLiveContextPanel } from "@/components/troubleshoot/TroubleshootLiveContextPanel";
import { troubleshootGuides } from "@/data/logic/troubleshootLogic";

export default function TroubleshootPage() {
  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Troubleshoot</h1>
        <p className="text-sm leading-6 opacity-70">
          Diagnose the boat by symptom, then check mainsail, headsail, and
          spinnaker fixes in one place.
        </p>
      </header>

      <TroubleshootLiveContextPanel />

      <div className="grid gap-3">
        {troubleshootGuides.map((item) => (
          <Link
            key={item.slug}
            href={`/troubleshoot/${item.slug}`}
            className={`block rounded-xl p-4 font-semibold shadow transition active:scale-[0.98] ${item.tone}`}
          >
            {item.shortLabel}
            <div className="mt-1 text-sm font-normal opacity-75">
              {item.sailFixes.map((fix) => fix.system).join(" · ")}
            </div>
          </Link>
        ))}
      </div>

      <Link href="/" className="block text-center mt-4 text-sm underline">
        Back Home
      </Link>
    </div>
  );
}
