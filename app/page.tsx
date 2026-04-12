export default function HomePage() {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Layline</h1>
        <p className="text-sm opacity-70">
          Sailing decision support for starts, trim, and tactics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <a
          href="/start"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
        >
          <div className="text-lg font-semibold">Start</div>
          <div className="mt-1 text-sm opacity-70">
            Final-minute lane, pressure, and bailout logic.
          </div>
        </a>

        <a
          href="/trim"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
        >
          <div className="text-lg font-semibold">Trim</div>
          <div className="mt-1 text-sm opacity-70">
            Sail trim guidance and mode-based setup.
          </div>
        </a>

        <a
          href="/tactics"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
        >
          <div className="text-lg font-semibold">Tactics</div>
          <div className="mt-1 text-sm opacity-70">
            Upwind and downwind decision modules.
          </div>
        </a>

        <a
          href="/notes"
          className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
        >
          <div className="text-lg font-semibold">Notes</div>
          <div className="mt-1 text-sm opacity-70">
            Logs, notes, and future learning tools.
          </div>
        </a>
      </div>
    </div>
  );
}