"use client";

import { useBoatDataSnapshot } from "@/lib/boat-data/store";

const MODE_LABEL: Record<string, string> = {
  none: "Not connected",
  signalk: "Signal K",
  direct_navico: "Direct Navico",
  file_import: "File import",
  demo: "Demo mode",
};

const STATUS_DOT_CLASS: Record<string, string> = {
  connected: "bg-[color:var(--favorable)]",
  connecting: "bg-[color:var(--warning)]",
  reconnecting: "bg-[color:var(--warning)]",
  disconnected: "bg-[color:var(--divider)]",
  error: "bg-[color:var(--unfavorable)]",
};

export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const snapshot = useBoatDataSnapshot();
  const { connection } = snapshot;

  return (
    <div className="flex items-center gap-2">
      <span
        className={["h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT_CLASS[connection.status]].join(
          " ",
        )}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[color:var(--text)]">
          {MODE_LABEL[connection.mode] ?? connection.mode}
        </div>
        {!compact && (
          <div className="truncate text-xs text-[color:var(--muted)]">
            {connection.status === "connected"
              ? connection.sourceLabel
              : connection.status === "reconnecting"
                ? `Reconnecting… (${connection.reconnectAttempts} attempts)`
                : connection.status === "error"
                  ? connection.error ?? "Connection error"
                  : "No live boat data"}
          </div>
        )}
      </div>
    </div>
  );
}
