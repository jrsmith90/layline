export default function TroubleshootSlowPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Troubleshoot — Slow</h1>

      {/* One-tap actions */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Fix now (one tap)
        </div>

        <div className="grid grid-cols-1 gap-3">
          <a
            href="/trim/main"
            className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
          >
            Fix now — Trim Mainsail
            <div className="text-sm font-normal opacity-70">
              backstay · outhaul · cunningham · sheet/traveler · vang
            </div>
          </a>

          <a
            href="/trim/jib"
            className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
          >
            Fix now — Trim Headsail
            <div className="text-sm font-normal opacity-70">
              halyard · lead · sheet · telltales
            </div>
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Quick checks
          </div>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1 mt-2">
            <li>Are we in clear air?</li>
            <li>Are we pinching or stalling?</li>
            <li>Are telltales flowing?</li>
            <li>Are we hitting waves head-on (need fast mode)?</li>
          </ul>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-blue-300">
              CALL
            </div>
            <div className="text-sm opacity-90 mt-1">
              Foot slightly to build speed and flow.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">
              WHY
            </div>
            <div className="text-sm opacity-80 mt-1">
              A slow boat cannot point or defend a lane. Speed must come first.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-green-300">
              DO NEXT
            </div>
            <div className="text-sm opacity-80 mt-1">
              Compare speed to a similar boat for 30–60 seconds.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-amber-300">
              IF / THEN
            </div>
            <div className="text-sm opacity-80 mt-1">
              If still slow, change one control only (ease sheet or add depth).
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="grid grid-cols-1 gap-3">
        <a
          href="/troubleshoot"
          className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Back to Troubleshoot
        </a>

        <a
          href="/"
          className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}