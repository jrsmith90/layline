import Link from "next/link";

const trimChecks = [
  {
    label: "Pole",
    cue: "Square until the luff just curls, then hold the pole steady.",
  },
  {
    label: "Sheet",
    cue: "Ease for curl, trim for fill. Keep the chute breathing.",
  },
  {
    label: "Guy",
    cue: "Keep the pole off the forestay and matched to apparent wind.",
  },
  {
    label: "Helm",
    cue: "Drive to pressure first, angle second. Do not chase every puff.",
  },
];

export default function SpinnakerTrimPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Spinnaker Trim</h1>
        <p className="text-sm opacity-70">
          Downwind flow checks for keeping the kite full and the boat under control.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-blue-300">
            CALL
          </div>
          <p className="mt-1 text-sm opacity-90">
            Keep a soft, repeatable curl on the luff. If it collapses hard, stabilize before changing course.
          </p>
        </div>

        <div className="grid gap-3">
          {trimChecks.map((check) => (
            <div
              key={check.label}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="text-xs uppercase tracking-wide opacity-60">
                {check.label}
              </div>
              <p className="mt-1 text-sm opacity-85">{check.cue}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          If it gets unstable
        </div>
        <p className="text-sm opacity-80">
          Ease sheet, bring the boat under the rig, and rebuild pressure before asking for a hotter or deeper angle.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3">
        <Link
          href="/tactics/downwind"
          className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Go to Downwind Tactics
          <div className="text-sm font-normal opacity-70">
            pressure, lanes, and mark approach
          </div>
        </Link>

        <Link
          href="/trim"
          className="block rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold active:scale-[0.98] transition"
        >
          Back to Trim
        </Link>
      </div>
    </div>
  );
}
