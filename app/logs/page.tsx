"use client";

import { useMemo, useState } from "react";
import {
  clearAllLogs,
  deleteLog,
  downloadTextFile,
  exportLogsToCsv,
  exportLogsToJson,
  getLogs,
  rateLog,
  type LaylineLog,
  type Rating,
} from "@/lib/logStore";

function formatLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function badge(status: LaylineLog["status"]) {
  if (status === "pending") return "bg-blue-400/20 text-blue-200 border-blue-400/30";
  if (status === "unrated") return "bg-amber-400/20 text-amber-200 border-amber-400/30";
  return "bg-green-400/20 text-green-200 border-green-400/30";
}

function ratingLabel(r?: Rating) {
  if (!r) return "—";
  if (r === "better") return "Better";
  if (r === "same") return "Same";
  return "Worse";
}

export default function LogsPage() {
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<"all" | "pending" | "unrated" | "rated">("unrated");

  const logs = useMemo(() => {
    const all = getLogs().slice().sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
    if (filter === "all") return all;
    return all.filter((l) => l.status === filter);
  }, [refresh, filter]);

  const counts = useMemo(() => {
    const all = getLogs();
    return {
      all: all.length,
      pending: all.filter((l) => l.status === "pending").length,
      unrated: all.filter((l) => l.status === "unrated").length,
      rated: all.filter((l) => l.status === "rated").length,
    };
  }, [refresh]);

  const btn =
    "rounded-xl bg-white text-black px-4 py-3 font-semibold shadow active:scale-[0.98] transition";
  const btnSoft =
    "rounded-xl bg-white/10 text-white border border-white/10 px-4 py-3 font-semibold active:scale-[0.98] transition";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Logs</h1>
        <div className="text-sm opacity-80">
          Only <span className="font-semibold">Rated</span> logs affect learning. Pending/unrated are stored for review.
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">Filter</div>
        <div className="grid grid-cols-2 gap-2">
          <button className={filter === "unrated" ? btn : btnSoft} onClick={() => setFilter("unrated")}>
            Unrated ({counts.unrated})
          </button>
          <button className={filter === "pending" ? btn : btnSoft} onClick={() => setFilter("pending")}>
            Pending ({counts.pending})
          </button>
          <button className={filter === "rated" ? btn : btnSoft} onClick={() => setFilter("rated")}>
            Rated ({counts.rated})
          </button>
          <button className={filter === "all" ? btn : btnSoft} onClick={() => setFilter("all")}>
            All ({counts.all})
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide opacity-60">Export</div>
        <div className="grid grid-cols-1 gap-2">
          <button
            className={btn}
            onClick={() => {
              const json = exportLogsToJson();
              downloadTextFile("layline_logs.json", json, "application/json");
            }}
          >
            Download JSON
          </button>
          <button
            className={btn}
            onClick={() => {
              const csv = exportLogsToCsv();
              downloadTextFile("layline_logs.csv", csv, "text/csv");
            }}
          >
            Download CSV
          </button>
          <button
            className={btnSoft}
            onClick={() => {
              clearAllLogs();
              setRefresh((x) => x + 1);
            }}
          >
            Clear all logs
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {logs.length === 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-sm opacity-80">
            No logs yet.
          </div>
        )}

        {logs.map((l) => (
          <div key={l.id} className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {formatLocal(l.createdAtISO)}
                </div>
                <div className="text-xs opacity-70">
                  {l.page} · {l.sailMode} · Wind {l.windSpeedKt ?? "—"} kt · Dir {l.windDirTrueFromDeg ?? "—"}°
                </div>
                <div className="text-xs opacity-70">
                  Car {l.carBefore} → {l.carSuggested} ({l.carDelta >= 0 ? "+" : ""}
                  {l.carDelta})
                </div>
              </div>

              <div className={`text-xs px-3 py-1 rounded-full border ${badge(l.status)}`}>
                {l.status.toUpperCase()}
              </div>
            </div>

            <div className="text-xs opacity-70">
              Symptom: {l.symptom} · Telltales: {l.telltales}
              {l.boatMode ? ` · Boat mode: ${l.boatMode}` : ""}
            </div>

            <div className="rounded-xl bg-black/30 border border-white/10 p-4 space-y-2">
              <div className="text-xs uppercase tracking-wide opacity-60">CALL</div>
              <div className="text-sm opacity-90 whitespace-pre-line">{l.recommendation.call}</div>
            </div>

            <div className="text-xs opacity-70">
              Rated: <span className="font-semibold">{ratingLabel(l.rating)}</span>
              {l.gps?.lat != null && l.gps?.lon != null && (
                <>
                  {" · "}
                  GPS: {l.gps.lat.toFixed(5)}, {l.gps.lon.toFixed(5)} · COG{" "}
                  {l.gps.cogDeg == null ? "—" : Math.round(l.gps.cogDeg)}°
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                className={btn}
                onClick={() => {
                  rateLog(l.id, "better");
                  setRefresh((x) => x + 1);
                }}
              >
                ✅ Better
              </button>
              <button
                className={btn}
                onClick={() => {
                  rateLog(l.id, "same");
                  setRefresh((x) => x + 1);
                }}
              >
                ➖ Same
              </button>
              <button
                className={btn}
                onClick={() => {
                  rateLog(l.id, "worse");
                  setRefresh((x) => x + 1);
                }}
              >
                ❌ Worse
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                className={btnSoft}
                onClick={() => {
                  deleteLog(l.id);
                  setRefresh((x) => x + 1);
                }}
              >
                Delete log
              </button>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/"
        className="block rounded-2xl bg-white text-black py-4 px-4 font-semibold shadow active:scale-[0.98] transition"
      >
        Back to Home
      </a>
    </div>
  );
}