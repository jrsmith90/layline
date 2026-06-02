"use client";

import { useMemo, useState } from "react";
import { getCourseData } from "@/data/race/getCourseData";
import { getCourseStrategyDefaults } from "@/data/race/getCourseStrategyInputs";
import type {
  CourseStrategyAnswers,
  CourseStrategyResult,
  CourseZone,
} from "@/lib/race/courseStrategy/types";
import { readJsonResponse } from "@/lib/readJsonResponse";

type FormState = CourseStrategyAnswers & { error: string | null };

interface PreRaceCourseStrategyFormProps {
  defaultCourseId: string;
  meanWindDirectionDeg: string;
  tackAngleDeg: string;
  initialAnswers?: CourseStrategyAnswers | null;
  onPlanReady?: (payload: { result: CourseStrategyResult; answers: CourseStrategyAnswers }) => void;
}

export default function PreRaceCourseStrategyForm({
  defaultCourseId,
  meanWindDirectionDeg,
  tackAngleDeg,
  initialAnswers,
  onPlanReady,
}: PreRaceCourseStrategyFormProps) {
  const course = useMemo(() => getCourseData(defaultCourseId), [defaultCourseId]);

  const initialState = useMemo(() => {
    if (initialAnswers) {
      return { ...initialAnswers, error: null };
    }

    const windDirNum = meanWindDirectionDeg ? Number(meanWindDirectionDeg) : null;
    const tackAngleNum = tackAngleDeg ? Number(tackAngleDeg) : 42;

    const defaults = getCourseStrategyDefaults(defaultCourseId, course, windDirNum, tackAngleNum);
    return { ...defaults, error: null };
  }, [defaultCourseId, course, meanWindDirectionDeg, tackAngleDeg, initialAnswers]);

  const [formState, setFormState] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  function updateZone(zoneId: string, updates: Partial<CourseZone>) {
    setFormState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
    }));
  }

  function updateStrategyNotes(notes: string) {
    setFormState((prev) => ({ ...prev, strategyNotes: notes }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState((prev) => ({ ...prev, error: null }));
    setSubmitting(true);

    try {
      const response = await fetch("/api/race-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const data = await readJsonResponse<{ result?: CourseStrategyResult; error?: string }>(
        response,
      );

      if (!response.ok || data.error) {
        setFormState((prev) => ({ ...prev, error: data.error || "Strategy submission failed." }));
        setSubmitting(false);
        return;
      }

      const result = data.result;
      if (result && onPlanReady) {
        onPlanReady({
          result,
          answers: formState,
        });
      }
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Opening leg zones</h3>

        <div className="grid gap-4 md:grid-cols-2">
          {formState.zones.map((zone) => (
            <div key={zone.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={zone.label}
                  onChange={(e) => updateZone(zone.id, { label: e.target.value })}
                  className="w-full rounded border border-white/15 bg-black/30 px-3 py-2 text-sm font-semibold"
                  placeholder="Zone name"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="block text-white/60">Heading</span>
                    <input
                      type="number"
                      min="0"
                      max="360"
                      value={zone.headingDeg ?? ""}
                      onChange={(e) =>
                        updateZone(zone.id, {
                          headingDeg: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-sm"
                      placeholder="deg"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="block text-white/60">Layline</span>
                    <input
                      type="number"
                      min="0"
                      max="360"
                      value={zone.laylineHeadingDeg ?? ""}
                      onChange={(e) =>
                        updateZone(zone.id, {
                          laylineHeadingDeg: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-sm"
                      placeholder="deg"
                    />
                  </label>
                </div>

                <label className="block text-xs">
                  <span className="block text-white/60">Wind shift risk</span>
                  <select
                    value={zone.windShiftRisk}
                    onChange={(e) =>
                      updateZone(zone.id, {
                        windShiftRisk: e.target.value as CourseZone["windShiftRisk"],
                      })
                    }
                    className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-sm"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <input
                  type="text"
                  value={zone.windShiftLocation}
                  onChange={(e) => updateZone(zone.id, { windShiftLocation: e.target.value })}
                  className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs"
                  placeholder="Wind shift location"
                />

                <label className="block text-xs">
                  <span className="block text-white/60">Current effect</span>
                  <select
                    value={zone.currentEffect}
                    onChange={(e) =>
                      updateZone(zone.id, {
                        currentEffect: e.target.value as CourseZone["currentEffect"],
                      })
                    }
                    className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-sm"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="favorable">Favorable</option>
                    <option value="neutral">Neutral</option>
                    <option value="adverse">Adverse</option>
                  </select>
                </label>

                <textarea
                  value={zone.notes}
                  onChange={(e) => updateZone(zone.id, { notes: e.target.value })}
                  className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-xs"
                  placeholder="Zone notes"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Strategy notes</span>
          <textarea
            value={formState.strategyNotes}
            onChange={(e) => updateStrategyNotes(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm"
            placeholder="Overall strategy notes for the opening leg..."
            rows={3}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="layline-pill px-4 py-2 text-sm font-bold text-[color:var(--text)] disabled:opacity-50"
      >
        {submitting ? "Analyzing..." : "Lock Course Strategy"}
      </button>

      {formState.error && (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {formState.error}
        </div>
      )}
    </form>
  );
}
