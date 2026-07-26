"use client";

import { useState } from "react";
import { Radio, Cable, FileUp, PlayCircle, StopCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Btn } from "@/components/ui/Btn";
import { ConnectionStatus } from "./ConnectionStatus";
import { SignalKConnectionForm } from "./SignalKConnectionForm";
import { DirectNavicoForm } from "./DirectNavicoForm";
import { FileImportPanel } from "./FileImportPanel";
import { saveConnectionConfig, useBoatDataSnapshot, useConnectionConfig } from "@/lib/boat-data/store";
import type { ConnectionMode } from "@/lib/boat-data/types";

const MODES: { mode: ConnectionMode; label: string; detail: string; icon: typeof Radio }[] = [
  {
    mode: "signalk",
    label: "Signal K",
    detail: "Recommended — live data over your boat network",
    icon: Radio,
  },
  {
    mode: "direct_navico",
    label: "Direct Navico",
    detail: "Advanced/experimental — requires a local bridge",
    icon: Cable,
  },
  {
    mode: "file_import",
    label: "Vulcan file import",
    detail: "Import routes, tracks, and polars from a file",
    icon: FileUp,
  },
];

export function ConnectionModeSelector() {
  const config = useConnectionConfig();
  const snapshot = useBoatDataSnapshot();
  const [viewMode, setViewMode] = useState<ConnectionMode>(
    config.activeMode === "none" || config.activeMode === "demo" ? "signalk" : config.activeMode,
  );

  const demoActive = config.activeMode === "demo";

  function toggleDemoMode() {
    if (demoActive) {
      saveConnectionConfig({ ...config, activeMode: "none" });
    } else {
      saveConnectionConfig({ ...config, activeMode: "demo" });
    }
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Connection"
        right={
          <Btn
            full={false}
            tone={demoActive ? "danger" : "neutral"}
            onClick={toggleDemoMode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            {demoActive ? (
              <>
                <StopCircle size={14} /> Stop demo
              </>
            ) : (
              <>
                <PlayCircle size={14} /> Demo mode
              </>
            )}
          </Btn>
        }
      >
        <ConnectionStatus />
        {demoActive ? (
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Demo mode is generating simulated boat data so you can try the dashboard away from the
            boat. Turn it off to configure a real connection below.
          </p>
        ) : null}
      </Panel>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map(({ mode, label, detail, icon: Icon }) => {
          const active = viewMode === mode;
          const isConnected = config.activeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={[
                "rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-[color:var(--favorable)] bg-[color:var(--panel-soft)]"
                  : "border-[color:var(--divider)] bg-[color:var(--panel)] hover:border-[color:var(--favorable)]/50",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-[color:var(--favorable)]" />
                <span className="text-sm font-semibold text-[color:var(--text)]">{label}</span>
                {isConnected ? (
                  <span className="layline-chip ml-auto text-[10px]">Active</span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-[color:var(--muted)]">{detail}</div>
            </button>
          );
        })}
      </div>

      <Panel>
        {viewMode === "signalk" && <SignalKConnectionForm config={config} />}
        {viewMode === "direct_navico" && <DirectNavicoForm config={config} />}
        {viewMode === "file_import" && <FileImportPanel />}
      </Panel>

      {snapshot.connection.mode === "signalk" && snapshot.connection.error ? (
        <div className="rounded-lg border border-[color:var(--unfavorable)]/50 bg-[color:var(--unfavorable)]/10 p-3 text-sm text-[color:var(--text)]">
          {snapshot.connection.error}
        </div>
      ) : null}
    </div>
  );
}
