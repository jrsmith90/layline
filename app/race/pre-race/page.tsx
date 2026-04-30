import Link from "next/link";
import PreRaceRouteBiasWorkflow from "@/components/race/PreRaceRouteBiasWorkflow";

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/weather/current"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Current and tide setup
        </Link>
        <Link
          href="/race/tracker"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Active course tracker
        </Link>
        <Link
          href="/race/live"
          className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition active:scale-[0.98]"
        >
          Race live cockpit
        </Link>
      </div>
      <PreRaceRouteBiasWorkflow />
    </main>
  );
}
