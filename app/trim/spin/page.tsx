import Link from "next/link";

const trimChecks = [
  {
    label: "Sheet",
    cue: "Play the sheet constantly so the luff is just on the edge of curling.",
    detail:
      "A slightly undertrimmed kite is usually faster than an overtrimmed one. Trim only when the curl grows too deep or the sail starts to fold.",
  },
  {
    label: "Pole angle",
    cue: "On a run or broad reach, square the pole near perpendicular to apparent wind.",
    detail:
      "Squaring projects the kite away from the main. In heavier air or when reaching, oversquare a little to flatten and calm the sail.",
  },
  {
    label: "Pole height",
    cue: "Adjust until the curl breaks evenly from top to bottom.",
    detail:
      "Pole too high usually makes the lower luff curl first. Pole too low closes the upper luff and makes the top curl first.",
  },
  {
    label: "Sheet lead",
    cue: "Lead aft for reaching, forward on broader angles when the foot needs power.",
    detail:
      "A forward lead adds lower depth and stabilizes the kite in waves. Too far aft on a broad reach can make the foot too flat.",
  },
];

const modeCards = [
  {
    label: "Running",
    goal: "Float the kite forward and keep it breathing.",
    setup: [
      "Pole squared to apparent wind.",
      "Sheet eased enough for a soft, repeatable curl.",
      "Crew quiet and weight balanced so the boat does not roll the kite around.",
    ],
  },
  {
    label: "Broad Reach",
    goal: "Project the kite, keep pressure on, and avoid overtrimming.",
    setup: [
      "Pole mostly square, adjusted for pressure and helm balance.",
      "Sheet lead can move forward if the lower sail is too flat.",
      "Drive to pressure first, then soak only when the kite stays stable.",
    ],
  },
  {
    label: "Power Reach",
    goal: "Open the exits, reduce heel, and keep the rudder loaded lightly enough to steer.",
    setup: [
      "Sheet lead aft to open the leech.",
      "Pole lower and slightly oversquared to flatten and stabilize.",
      "Be ready to jerk-ease the sheet before the boat broaches.",
    ],
  },
];

const controlEffects = [
  {
    control: "Raise pole",
    effect: "Flattens the kite by opening the leeches and spreading the shoulders.",
  },
  {
    control: "Lower pole",
    effect: "Adds depth and control, but too low can close the upper luff.",
  },
  {
    control: "Move lead forward",
    effect: "Adds depth in the lower half and helps the kite stay steady in waves.",
  },
  {
    control: "Move lead aft",
    effect: "Opens the leech and helps depower on a reach.",
  },
  {
    control: "Oversquare pole",
    effect: "Flattens and stabilizes the sail, useful when powered up.",
  },
  {
    control: "Undersquare pole",
    effect: "Lets the kite float forward and deepen, often useful in light air and chop.",
  },
];

const heavyAirSequence = [
  "Ease mainsheet",
  "Ease vang",
  "Jerk-ease spinnaker sheet",
  "Bear away or bring the boat back under the rig",
  "Collapse the kite if control is still going away",
];

const mistakes = [
  "Overtrimming until the luff stops breathing.",
  "Holding one sheet position instead of playing curl continuously.",
  "Keeping the pole too high when the lower luff is curling first.",
  "Leading the sheet too far aft on a broad reach and flattening the foot.",
  "Waiting too long to dump sheet when the boat starts to broach.",
];

export default function SpinnakerTrimPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Spinnaker Trim</h1>
        <p className="text-sm opacity-70">
          Downwind flow checks for keeping the kite full, breathing, and under
          control.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-blue-300">
            PRIMARY CALL
          </div>
          <p className="mt-1 text-sm opacity-90">
            Keep a soft, repeatable curl on the luff. If the curl disappears,
            ease. If it folds hard, trim and stabilize before changing course.
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
              <p className="mt-1 text-sm font-semibold opacity-90">{check.cue}</p>
              <p className="mt-2 text-sm leading-6 opacity-75">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Angle Modes
        </div>
        <div className="grid gap-3">
          {modeCards.map((mode) => (
            <article
              key={mode.label}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-base font-bold">{mode.label}</h2>
                <p className="text-sm text-blue-200">{mode.goal}</p>
              </div>
              <ul className="mt-3 space-y-2">
                {mode.setup.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 opacity-80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="text-xs uppercase tracking-wide opacity-60">
          What Each Control Does
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {controlEffects.map((item) => (
            <div
              key={item.control}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="text-sm font-bold text-blue-200">
                {item.control}
              </div>
              <p className="mt-1 text-sm leading-6 opacity-80">{item.effect}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          If It Gets Unstable
        </div>
        <p className="text-sm opacity-80">
          Ease sheet, bring the boat under the rig, and rebuild pressure before
          asking for a hotter or deeper angle. In heavy air, the response needs
          to be clear before the broach starts.
        </p>
        <ol className="space-y-2">
          {heavyAirSequence.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6">
              <span className="w-5 shrink-0 font-bold text-yellow-300">
                {index + 1}
              </span>
              <span className="opacity-85">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">
          Common Mistakes
        </div>
        <ul className="space-y-2">
          {mistakes.map((mistake) => (
            <li key={mistake} className="flex gap-3 text-sm leading-6">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" />
              <span className="opacity-85">{mistake}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-3">
        <Link
          href="/trim/downwind"
          className="block rounded-2xl border border-white/10 bg-white/10 py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Go to Downwind Checklist
          <div className="text-sm font-normal opacity-70">
            weather mark set, crew jobs, and weight placement
          </div>
        </Link>

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
