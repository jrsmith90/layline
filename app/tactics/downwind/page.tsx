import Link from "next/link";
import { LiveInstrumentsPanel } from "@/components/gps/LiveInstrumentsPanel";

export default function TacticsDownwindPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tactics — Downwind</h1>

      <LiveInstrumentsPanel context="downwind" />

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <p className="text-sm opacity-80">
          Pressure lanes, jibe decisions, and angle management (trim handled in Trim).
        </p>
      </div>

      <Link
        href="/tactics"
        className="inline-block rounded-xl bg-white text-black px-4 py-2 font-semibold shadow active:scale-[0.98] transition"
      >
        Back to Tactics
      </Link>
    </div>
  );
}
