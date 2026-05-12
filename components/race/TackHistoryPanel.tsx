"use client";

import type { TackRecord } from "@/lib/raceSessionStore";

type TackHistoryPanelProps = {
  records: TackRecord[];
  standardAngleDeg: number | null;
  currentTackAngleDeg: number;
  isRecording: boolean;
};

function formatDeg(value: number | null) {
  return value == null ? "--" : `${Math.round(value)} deg`;
}

function formatKt(value: number | null) {
  return value == null ? "--" : `${value.toFixed(1)} kt`;
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatPosition(record: TackRecord) {
  if (!record.position) return "--";
  return `${record.position.lat.toFixed(4)}, ${record.position.lon.toFixed(4)}`;
}

export function TackHistoryPanel({
  records,
  standardAngleDeg,
  currentTackAngleDeg,
  isRecording,
}: TackHistoryPanelProps) {
  const latest = records.at(-1) ?? null;
  const recentRecords = records.slice(-6).reverse();

  return (
    <section className="layline-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="layline-kicker">Tack Learning</div>
          <h2 className="mt-1 text-xl font-black">Race-day standard</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {isRecording
              ? "Auto-collecting tacks while the race recorder is live."
              : "Start race recording to collect tack data in the background."}
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--divider)] bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-wide">
          {records.length} tacks
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SmallMetric label="Standard" value={formatDeg(standardAngleDeg)} />
        <SmallMetric label="In Use" value={formatDeg(currentTackAngleDeg)} />
        <SmallMetric label="Last" value={latest ? formatTime(latest.atISO) : "--"} />
      </div>

      {latest ? (
        <div className="mt-3 rounded-xl border border-[color:var(--divider)] bg-black/20 p-3 text-xs leading-5 text-[color:var(--text-soft)]">
          Last tack: {formatDeg(latest.halfAngleDeg)} half-angle, {formatKt(latest.sogKt)},{" "}
          wind {formatDeg(latest.windFromDeg)}, {latest.confidence} confidence.
        </div>
      ) : null}

      {recentRecords.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="text-[color:var(--muted)]">
              <tr className="border-b border-[color:var(--divider)]">
                <th className="py-2 pr-3 font-black uppercase tracking-[0.12em]">Time</th>
                <th className="py-2 pr-3 font-black uppercase tracking-[0.12em]">Angle</th>
                <th className="py-2 pr-3 font-black uppercase tracking-[0.12em]">SOG</th>
                <th className="py-2 pr-3 font-black uppercase tracking-[0.12em]">Wind</th>
                <th className="py-2 pr-3 font-black uppercase tracking-[0.12em]">GPS</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map((record) => (
                <tr key={record.id} className="border-b border-[color:var(--divider)]/60">
                  <td className="py-2 pr-3 font-bold">{formatTime(record.atISO)}</td>
                  <td className="py-2 pr-3">{formatDeg(record.halfAngleDeg)}</td>
                  <td className="py-2 pr-3">{formatKt(record.sogKt)}</td>
                  <td className="py-2 pr-3">{formatDeg(record.windFromDeg)}</td>
                  <td className="py-2 pr-3">{formatPosition(record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--divider)] bg-black/20 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-black leading-none">{value}</div>
    </div>
  );
}
