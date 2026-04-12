"use client";

import { useState, useEffect } from "react";
import { Panel } from "@/components/panel";
import { formatMainChoice, formatHeadsailChoice, formatSpinChoice } from "@/lib/sail-utils";

export default function SailSelectionPage() {
  const [result, setResult] = useState({
    mainChoice: "reef1",
    headsailChoice: "jib1",
    spinnakerChoice: "no_spinnaker",
  });

  // ... existing logic and UI code ...

  return (
    <main className="space-y-5 px-4 pb-6 max-w-md mx-auto">
      {/* ... other content ... */}

      <Panel title="Recommendation">
        <div className="space-y-4">
          {/* existing content */}
          <div className="card">
            <h3 className="font-semibold">What Would Change the Call</h3>
            <p className="text-sm opacity-70">
              {/* existing explanation text */}
            </p>
          </div>

            <div className="grid gap-3 md:grid-cols-2">
              <a
                href="/trim/main"
                className="block rounded-lg bg-red-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
              >
                Go to Mainsail Trim
                <div className="text-sm font-normal opacity-90">
                  Apply the {formatMainChoice(result.mainChoice)} call
                </div>
              </a>

              {result.headsailChoice && (
                <a
                  href="/trim/jib"
                  className="block rounded-lg bg-orange-500 text-white p-4 font-semibold shadow active:scale-[0.98] transition"
                >
                  Go to Headsail Trim
                  <div className="text-sm font-normal opacity-90">
                    Trim the {formatHeadsailChoice(result.headsailChoice)}
                  </div>
                </a>
              )}

              {result.spinnakerChoice && result.spinnakerChoice !== "no_spinnaker" && (
                <a
                  href="/trim/spin"
                  className="block rounded-lg bg-blue-600 text-white p-4 font-semibold shadow active:scale-[0.98] transition md:col-span-2"
                >
                  Go to Spinnaker Trim
                  <div className="text-sm font-normal opacity-90">
                    Trim the {formatSpinChoice(result.spinnakerChoice)}
                  </div>
                </a>
              )}
            </div>
        </div>
      </Panel>

      {/* ... other content ... */}

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/"
          className="block w-full text-center rounded-lg bg-gray-700 text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Return Home
        </a>
        <a
          href="/trim"
          className="block w-full text-center rounded-lg bg-black text-white py-3 px-4 font-semibold shadow active:scale-[0.98] transition"
        >
          Go to Trim Hub
        </a>
      </div>
    </main>
  );
}