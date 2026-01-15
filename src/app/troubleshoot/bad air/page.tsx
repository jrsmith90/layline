export default function TroubleshootBadAirPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Troubleshoot — Bad Air</h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60">
            Quick checks
          </div>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1 mt-2">
            <li>Are telltales collapsing randomly?</li>
            <li>Is speed inconsistent despite good trim?</li>
            <li>Is the boat ahead blanketing our sails?</li>
            <li>Are we stuck in a narrow lane with no flow?</li>
          </ul>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-blue-300">
              CALL
            </div>
            <div className="text-sm opacity-90 mt-1">
              Get to clean air — even if it costs distance.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">
              WHY
            </div>
            <div className="text-sm opacity-80 mt-1">
              Bad air destroys speed and removes tactical options. A slower boat
              in bad air cannot recover without first finding flow.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-green-300">
              DO NEXT
            </div>
            <div className="text-sm opacity-80 mt-1">
              Once clear, rebuild speed before making any tactical or trimming
              decisions.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-amber-300">
              IF / THEN
            </div>
            <div className="text-sm opacity-80 mt-1">
              If the fleet compresses again, choose the next safest lane early
              instead of waiting for it to open.
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