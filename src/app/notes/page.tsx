export default function NotesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notes</h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
        <p className="text-sm opacity-80">
          Save tuning numbers, race notes, and what worked.
        </p>
        <p className="text-sm opacity-80">
          (We’ll add a simple note editor next.)
        </p>
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