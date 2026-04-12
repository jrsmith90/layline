import { Chip } from "@/components/Chip";
import { BtnLink } from "@/components/BtnLink";

export default function MainTrimPage() {
  const modeText = "Auto";
  const windText = "5-10 kts";

  return (
    <div className="space-y-4 max-w-md mx-auto px-4 pb-6">
      <h1 className="text-2xl font-bold">Trim — Mainsail</h1>

      <div className="space-y-2">
        <Chip label="Mode" value={modeText} accent="amber" />
        <Chip label="Wind" value={windText} accent="neutral" />
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-4">
        <div>
          <div className="text-xs tracking-widest text-red-400 uppercase">
            Call
          </div>
          <div className="text-base opacity-90 mt-1 leading-relaxed">
            Ease the mainsheet slightly to depower.
          </div>
        </div>

        <div>
          <div className="text-xs tracking-widest text-red-400 uppercase">
            Why
          </div>
          <div className="text-base opacity-90 mt-1 leading-relaxed">
            Reduces heeling and weather helm, improves balance.
          </div>
        </div>

        <div>
          <div className="text-xs tracking-widest text-red-400 uppercase">
            Do Next
          </div>
          <div className="text-base opacity-90 mt-1 leading-relaxed">
            Adjust outhaul and cunningham for optimal sail shape.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/"
          className="block w-full text-center rounded-lg bg-gray-700 text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Return Home
        </a>
        <a
          href="/trim"
          className="block w-full text-center rounded-lg bg-red-500 text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Back to Trim
        </a>
      </div>
    </div>
  );
}