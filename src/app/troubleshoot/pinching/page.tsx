export default function TroubleshootPinchingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Troubleshoot — Pinching / Stalling</h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Quick checks
          </div>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1 mt-2">
            <li>Are inside jib telltales stalled?</li>
            <li>Is the helm loaded or twitchy?</li>
            <li>Does speed drop every time you head up?</li>
            <li>Is the bow slamming in chop?</li>
          </ul>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-blue-300">
              CALL
            </div>
            <div className="text-sm opacity-90 mt-1">
              Ease slightly and sail lower until flow returns.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">
              WHY
            </div>
            <div className="text-sm opacity-80 mt-1">
              Pinching kills attached flow and makes the boat slower and harder
              to steer.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-green-300">
              DO NEXT
            </div>
            <div className="text-sm opacity-80 mt-1">
              Once fast, slowly head up until telltales just start to lift.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-amber-300">
              IF / THEN
            </div>
            <div className="text-sm opacity-80 mt-1">
              If stalling returns immediately, you’re too high — stay in fast
              mode longer.
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