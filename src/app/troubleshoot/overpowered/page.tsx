export default function TroubleshootOverpoweredPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Troubleshoot — Overpowered / Heavy Helm
      </h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Quick checks
          </div>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1 mt-2">
            <li>Excessive heel angle?</li>
            <li>Constant rudder angle to stay upright?</li>
            <li>Difficulty steering through waves or puffs?</li>
            <li>Boat rounding up in gusts?</li>
          </ul>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-blue-300">
              CALL
            </div>
            <div className="text-sm opacity-90 mt-1">
              Depower in sequence: traveler down first, then flatten the main.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">
              WHY
            </div>
            <div className="text-sm opacity-80 mt-1">
              Too much heel increases drag, overloads the rudder, and makes the
              boat slower and harder to control.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-green-300">
              DO NEXT
            </div>
            <div className="text-sm opacity-80 mt-1">
              Look for neutral helm and steadier speed through puffs.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-amber-300">
              IF / THEN
            </div>
            <div className="text-sm opacity-80 mt-1">
              If helm remains heavy, add depower one step at a time (backstay,
              then outhaul), not more steering input.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Next
        </div>

        <div className="grid grid-cols-1 gap-3">
          <a
            href="/trim/main"
            className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
          >
            Go to Trim — Mainsail
            <div className="text-sm font-normal opacity-70">
              backstay · outhaul · cunningham · sheet/traveler · vang
            </div>
          </a>

          <a
            href="/trim/jib"
            className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
          >
            Go to Trim — Headsail
            <div className="text-sm font-normal opacity-70">
              halyard · lead · sheet · telltales
            </div>
          </a>
        </div>
      </div>

      <a
        href="/troubleshoot"
        className="inline-block rounded-xl bg-white text-black px-4 py-2 font-semibold shadow active:scale-[0.98] transition"
      >
        Back to Troubleshoot
      </a>
    </div>
  );
}