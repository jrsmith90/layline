import { roundUpLaylineHeadingDeg } from "@/lib/race/courseStrategy/laylineHeading";
import type { CourseStrategyResult } from "@/lib/race/courseStrategy/types";

interface CourseStrategyResultCardProps {
  result: CourseStrategyResult | null;
  title?: string;
  strategyNotes?: string | null;
}

export function CourseStrategyResultCard({
  result,
  title = "Course strategy analysis",
  strategyNotes,
}: CourseStrategyResultCardProps) {
  if (!result) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 space-y-4">
        {/* Zone Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 text-left font-semibold text-white/80">Zone</th>
                <th className="px-2 py-2 text-center font-semibold text-white/80">Heading</th>
                <th className="px-2 py-2 text-center font-semibold text-white/80">Layline</th>
                <th className="px-2 py-2 text-center font-semibold text-white/80">Wind Risk</th>
                <th className="px-2 py-2 text-center font-semibold text-white/80">Current</th>
              </tr>
            </thead>
            <tbody>
              {result.zoneAnalysis.map((zone) => (
                <tr key={zone.id} className="border-b border-white/5">
                  <td className="px-2 py-2 font-medium">{zone.label}</td>
                  <td className="px-2 py-2 text-center">
                    {zone.headingDeg != null ? `${Math.round(zone.headingDeg)}°` : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {roundUpLaylineHeadingDeg(zone.laylineHeadingDeg) != null
                      ? `${roundUpLaylineHeadingDeg(zone.laylineHeadingDeg)}°`
                      : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                        zone.windShiftRisk === "high"
                          ? "bg-red-500/20 text-red-200"
                          : zone.windShiftRisk === "moderate"
                            ? "bg-amber-500/20 text-amber-200"
                            : zone.windShiftRisk === "low"
                              ? "bg-green-500/20 text-green-200"
                              : "bg-gray-500/20 text-gray-200"
                      }`}
                    >
                      {zone.windShiftRisk}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                        zone.currentEffect === "favorable"
                          ? "bg-green-500/20 text-green-200"
                          : zone.currentEffect === "adverse"
                            ? "bg-red-500/20 text-red-200"
                            : zone.currentEffect === "neutral"
                              ? "bg-blue-500/20 text-blue-200"
                              : "bg-gray-500/20 text-gray-200"
                      }`}
                    >
                      {zone.currentEffect}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Key Risks */}
        {result.keyRisks.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-sm font-semibold text-amber-200">Key risks</h3>
            <ul className="space-y-1 text-xs text-white/75">
              {result.keyRisks.map((risk, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-sm font-semibold text-blue-200">Recommendations</h3>
            <ul className="space-y-1 text-xs text-white/75">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {strategyNotes ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-sm font-semibold text-emerald-200">Strategy notes</h3>
            <div className="whitespace-pre-line text-xs leading-6 text-white/75">
              {strategyNotes}
            </div>
          </div>
        ) : null}

        {result.referenceBasis.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-sm font-semibold text-cyan-200">Reference basis</h3>
            <ul className="space-y-1 text-xs text-white/75">
              {result.referenceBasis.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-cyan-300">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
