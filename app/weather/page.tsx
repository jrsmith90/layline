"use client";

import { useState } from "react";
import { WaterOutlookPanel } from "@/components/race/WeatherCourseImpactPanel";

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WeatherPage() {
  const [date, setDate] = useState(localDate);
  const [time, setTime] = useState("12:00");

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[color:var(--divider)] pb-6">
        <div>
          <div className="layline-kicker">Weather &amp; Conditions</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[color:var(--text)] sm:text-4xl">
            See the water before race day.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-soft)]">
            Choose a day and time to see the predicted tide and current at each Annapolis-area NOAA buoy.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Day
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel)] px-3 py-2 text-sm text-[color:var(--text)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Time
            </span>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel)] px-3 py-2 text-sm text-[color:var(--text)]"
            />
          </label>
        </div>
      </div>

      <div className="mt-6">
        <WaterOutlookPanel date={date} time={time} />
      </div>
    </main>
  );
}
