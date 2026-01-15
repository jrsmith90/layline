export default function StartPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Start</h1>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
        <div className="text-sm opacity-80">
          Sections: Strategy · Bias · Time/Distance · Execution · Bail-out
        </div>
        <div className="text-sm opacity-80">
          (We’ll add tools here after layout is locked.)
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