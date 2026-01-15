export default function TacticsUpwindPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tactics — Upwind</h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <p className="text-sm opacity-80">
          Lane control, leverage, and clear-air decisions (trim handled in Trim).
        </p>
      </div>

      <a
        href="/tactics"
        className="inline-block rounded-xl bg-white text-black px-4 py-2 font-semibold shadow active:scale-[0.98] transition"
      >
        Back to Tactics
      </a>
    </div>
  );
}