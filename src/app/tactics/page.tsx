export default function TacticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tactics</h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-4">
          <div className="text-xs uppercase tracking-wide opacity-60">Sections</div>
          <div className="text-sm opacity-80 mt-1">
            Choose point of sail for tactics (not trim).
          </div>
        </div>

        <div className="border-t border-white/10" />

        <div className="px-5 py-4 space-y-3">
          <a
            href="/tactics/upwind"
            className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
          >
            Upwind Tactics
            <div className="text-sm font-normal opacity-70">
              lanes · leverage · clear air · covers
            </div>
          </a>

          <a
            href="/tactics/downwind"
            className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
          >
            Downwind Tactics
            <div className="text-sm font-normal opacity-70">
              pressure lanes · angles · jibes · funnels
            </div>
          </a>
        </div>
      </div>

      <a
        href="/"
        className="inline-block rounded-xl bg-white text-black px-4 py-2 font-semibold shadow active:scale-[0.98] transition"
      >
        Back to Home
      </a>
    </div>
  );
}