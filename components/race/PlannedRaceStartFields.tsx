"use client";

import { formatPlannedRaceStartLabel } from "@/lib/race/plannedRaceStart";

type PlannedRaceStartFieldsProps = {
  raceDate: string;
  raceTime: string;
  onRaceDateChange: (value: string) => void;
  onRaceTimeChange: (value: string) => void;
  helperText?: string;
};

export function PlannedRaceStartFields({
  raceDate,
  raceTime,
  onRaceDateChange,
  onRaceTimeChange,
  helperText,
}: PlannedRaceStartFieldsProps) {
  const plannedStartLabel = formatPlannedRaceStartLabel(raceDate, raceTime);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Race day</span>
          <input
            type="date"
            value={raceDate}
            onChange={(event) => onRaceDateChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Start time</span>
          <input
            type="time"
            step={300}
            value={raceTime}
            onChange={(event) => onRaceTimeChange(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--divider)] bg-black/30 px-3 py-3"
          />
        </label>
      </div>

      <p className="text-xs leading-5 text-[color:var(--muted)]">
        {plannedStartLabel
          ? `Planning target: ${plannedStartLabel}.`
          : "Set the planned race day and start time to shift the forecast and current planning window."}{" "}
        {helperText}
      </p>
    </div>
  );
}
