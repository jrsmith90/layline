import Link from "next/link";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";

export default function TacticsPage() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tactics</h1>
        <p className="text-sm opacity-70">Choose a tactics module.</p>
      </div>

      <LiveInstrumentsPanel context="general" compact />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/tactics/upwind"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
        >
          <div className="text-lg font-semibold">Upwind</div>
          <div className="mt-1 text-sm opacity-70">
            Lane, mode, congestion, and trim-priority decisions.
          </div>
        </Link>

        <Link
          href="/tactics/downwind"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
        >
          <div className="text-lg font-semibold">Downwind</div>
          <div className="mt-1 text-sm opacity-70">Downwind tactics module.</div>
        </Link>

        <Link
          href="/race/tracker"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
        >
          <div className="text-lg font-semibold">Course Tracker</div>
          <div className="mt-1 text-sm opacity-70">
            Mark progress, VMG, laylines, and tack timing.
          </div>
        </Link>
      </div>

      <Link
        href="/"
        className="inline-block rounded-xl bg-white px-4 py-2 font-semibold text-black shadow transition active:scale-[0.98]"
      >
        Back to Home
      </Link>
    </div>
  );
}
