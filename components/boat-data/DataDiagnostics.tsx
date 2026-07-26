"use client";

import { Download } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Btn } from "@/components/ui/Btn";
import { downloadTextFile } from "@/lib/logStore";
import { useBoatDataDiagnostics, useBoatDataSnapshot } from "@/lib/boat-data/store";

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--divider)] py-1.5 text-sm last:border-b-0">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span className="font-semibold text-[color:var(--text)]">{value}</span>
    </div>
  );
}

function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "None";
  return entries.map(([key, count]) => `${key} (${count})`).join(", ");
}

export function DataDiagnostics() {
  const diagnostics = useBoatDataDiagnostics();
  const snapshot = useBoatDataSnapshot();

  function handleDownload() {
    // Deliberately excludes the diagnostics report from ever containing
    // auth tokens/passwords - only connection metadata and counters go out.
    const report = {
      generatedAt: new Date().toISOString(),
      connectionType: diagnostics.connectionType,
      host: diagnostics.host,
      port: diagnostics.port,
      state: diagnostics.state,
      lastSuccessfulConnectionAt: diagnostics.lastSuccessfulConnectionAt,
      lastMessageAt: diagnostics.lastMessageAt,
      messageCount: diagnostics.messageCount,
      messagesPerSecond: diagnostics.messagesPerSecond,
      pathsReceived: diagnostics.pathsReceived,
      unsupportedSentences: diagnostics.unsupportedSentences,
      checksumFailures: diagnostics.checksumFailures,
      parsingFailures: diagnostics.parsingFailures,
      staleFieldCount: diagnostics.staleFieldCount,
      reconnectAttempts: diagnostics.reconnectAttempts,
      rawPreview: diagnostics.rawPreview,
    };
    downloadTextFile(
      `layline-boat-data-diagnostics-${new Date().toISOString()}.json`,
      JSON.stringify(report, null, 2),
      "application/json",
    );
  }

  return (
    <Panel
      title="Diagnostics"
      right={
        <Btn
          full={false}
          tone="neutral"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Download size={13} /> Download report
        </Btn>
      }
    >
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <div>
          <DiagnosticRow label="Connection type" value={diagnostics.connectionType} />
          <DiagnosticRow
            label="Host / port"
            value={diagnostics.host ? `${diagnostics.host}:${diagnostics.port ?? "—"}` : "—"}
          />
          <DiagnosticRow label="Connection state" value={diagnostics.state} />
          <DiagnosticRow
            label="Last successful connection"
            value={diagnostics.lastSuccessfulConnectionAt ?? "—"}
          />
          <DiagnosticRow label="Last message received" value={diagnostics.lastMessageAt ?? "—"} />
          <DiagnosticRow label="Reconnect attempts" value={String(diagnostics.reconnectAttempts)} />
        </div>
        <div>
          <DiagnosticRow label="Message count" value={String(diagnostics.messageCount)} />
          <DiagnosticRow label="Messages / second" value={diagnostics.messagesPerSecond.toFixed(1)} />
          <DiagnosticRow label="Data paths received" value={formatCounts(diagnostics.pathsReceived)} />
          <DiagnosticRow
            label="Unsupported sentences/paths"
            value={formatCounts(diagnostics.unsupportedSentences)}
          />
          <DiagnosticRow label="Checksum failures" value={String(diagnostics.checksumFailures)} />
          <DiagnosticRow label="Parsing failures" value={String(diagnostics.parsingFailures)} />
        </div>
      </div>

      <div className="mt-4">
        <div className="layline-kicker mb-2">Raw data preview</div>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] p-2 font-mono text-[11px] leading-5 text-[color:var(--text-soft)]">
          {snapshot.connection.mode === "none" || diagnostics.rawPreview.length === 0 ? (
            <span className="text-[color:var(--muted)]">No raw messages captured yet.</span>
          ) : (
            diagnostics.rawPreview.map((line, index) => <div key={index}>{line}</div>)
          )}
        </div>
      </div>
    </Panel>
  );
}
