"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { InlineExplain } from "@/components/ui/InlineExplain";
import type { BoatDataConnectionConfig, SignalKConfig } from "@/lib/boat-data/types";
import { saveConnectionConfig } from "@/lib/boat-data/store";
import { testSignalKConnection, type SignalKTestResult } from "@/lib/signalk/client";

const inputCls =
  "w-full rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--favorable)] focus:outline-none transition-colors";
const labelCls = "block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-1";

function ResultRow({ label, ok, detail }: { label: string; ok: boolean | null; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--divider)] py-2 last:border-b-0">
      <div className="text-sm text-[color:var(--text)]">{label}</div>
      <div className="flex items-center gap-2 text-sm">
        {detail ? <span className="text-[color:var(--muted)]">{detail}</span> : null}
        {ok === null ? (
          <span className="text-[color:var(--muted)]">—</span>
        ) : ok ? (
          <CheckCircle2 size={16} className="text-[color:var(--favorable)]" />
        ) : (
          <XCircle size={16} className="text-[color:var(--unfavorable)]" />
        )}
      </div>
    </div>
  );
}

export function SignalKConnectionForm({ config }: { config: BoatDataConnectionConfig }) {
  const isActive = config.activeMode === "signalk";
  const [form, setForm] = useState<SignalKConfig>(config.signalk);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SignalKTestResult | null>(null);

  function updateField<K extends keyof SignalKConfig>(key: K, value: SignalKConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function persist(nextSignalk: SignalKConfig, activeMode: BoatDataConnectionConfig["activeMode"]) {
    saveConnectionConfig({ ...config, activeMode, signalk: nextSignalk });
  }

  async function handleTestConnection() {
    setTesting(true);
    setResult(null);
    try {
      const testResult = await testSignalKConnection(form);
      setResult(testResult);
    } finally {
      setTesting(false);
    }
  }

  function handleSaveAndConnect() {
    persist(form, "signalk");
  }

  function handleDisconnect() {
    persist(form, "none");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Server address</label>
          <input
            className={inputCls}
            value={form.host}
            placeholder="10.10.10.1"
            onChange={(e) => updateField("host", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Protocol</label>
          <select
            className={inputCls}
            value={form.protocol}
            onChange={(e) => updateField("protocol", e.target.value as SignalKConfig["protocol"])}
          >
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Port</label>
          <input
            type="number"
            className={inputCls}
            value={form.port}
            onChange={(e) => updateField("port", Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className={labelCls}>Vessel context</label>
          <input
            className={inputCls}
            value={form.vesselContext}
            placeholder="self"
            onChange={(e) => updateField("vesselContext", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Authentication token{" "}
            <span className="normal-case text-[color:var(--muted)]">(optional)</span>
          </label>
          <input
            type="password"
            className={inputCls}
            value={form.authToken}
            onChange={(e) => updateField("authToken", e.target.value)}
            placeholder="Only if your Signal K server requires it"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[color:var(--text)] sm:col-span-2">
          <input
            type="checkbox"
            checked={form.autoReconnect}
            onChange={(e) => updateField("autoReconnect", e.target.checked)}
          />
          Automatically reconnect if the connection drops
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Btn full={false} tone="neutral" onClick={handleTestConnection} disabled={testing || !form.host}>
          {testing ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Testing…
            </span>
          ) : (
            "Test Connection"
          )}
        </Btn>
        {isActive ? (
          <Btn full={false} tone="danger" onClick={handleDisconnect}>
            Disconnect
          </Btn>
        ) : (
          <Btn full={false} tone="primary" onClick={handleSaveAndConnect} disabled={!form.host}>
            Save &amp; Connect
          </Btn>
        )}
        <InlineExplain label="About Signal K" title="Signal K live connection">
          Signal K collects data from your NMEA 2000/0183 instruments (via a Raspberry Pi or similar
          onboard computer) and exposes it over your boat&apos;s local network. Layline connects to it
          directly from the browser — nothing is sent to the public internet.
        </InlineExplain>
      </div>

      {result ? (
        <div className="rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] p-3">
          <ResultRow label="Server reachable" ok={result.reachable} />
          <ResultRow label="WebSocket available" ok={result.webSocketAvailable} />
          <ResultRow label="Vessel detected" ok={result.vesselDetected} />
          <ResultRow
            label="Live data paths found"
            ok={result.livePathCount > 0}
            detail={String(result.livePathCount)}
          />
          <ResultRow
            label="Connection latency"
            ok={result.latencyMs != null}
            detail={result.latencyMs != null ? `${result.latencyMs} ms` : undefined}
          />
          <ResultRow
            label="Authentication"
            ok={result.authStatus !== "rejected"}
            detail={result.authStatus.replace("_", " ")}
          />
          {result.mixedContentWarning ? (
            <div className="mt-2 rounded-md border border-[color:var(--warning)]/50 bg-[color:var(--warning)]/10 p-2 text-xs text-[color:var(--text)]">
              {result.mixedContentWarning}
            </div>
          ) : null}
          {result.error ? (
            <div className="mt-2 rounded-md border border-[color:var(--unfavorable)]/50 bg-[color:var(--unfavorable)]/10 p-2 text-xs text-[color:var(--text)]">
              {result.error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
