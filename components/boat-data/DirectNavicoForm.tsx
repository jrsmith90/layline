"use client";

import { useState } from "react";
import { Btn } from "@/components/ui/Btn";
import type { BoatDataConnectionConfig, DirectNavicoConfig } from "@/lib/boat-data/types";
import { saveConnectionConfig } from "@/lib/boat-data/store";

const inputCls =
  "w-full rounded-lg border border-[color:var(--divider)] bg-[color:var(--panel-muted)] px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--favorable)] focus:outline-none transition-colors";
const labelCls = "block text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-1";

export function DirectNavicoForm({ config }: { config: BoatDataConnectionConfig }) {
  const [form, setForm] = useState<DirectNavicoConfig>(config.directNavico);
  const [saved, setSaved] = useState(false);

  function updateField<K extends keyof DirectNavicoConfig>(key: K, value: DirectNavicoConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveConnectionConfig({ ...config, directNavico: form });
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--warning)]/50 bg-[color:var(--warning)]/10 p-3 text-sm leading-6 text-[color:var(--text)]">
        Direct Navico mode requires a compatible local bridge or native service. Standard web
        browsers cannot reliably open arbitrary NMEA TCP or UDP sockets. This mode is experimental —
        connecting is disabled until that bridge ships in a later phase.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Vulcan IP address</label>
          <input
            className={inputCls}
            value={form.host}
            placeholder="e.g. 192.168.0.2 (check your network)"
            onChange={(e) => updateField("host", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Protocol</label>
          <select
            className={inputCls}
            value={form.protocol}
            onChange={(e) => updateField("protocol", e.target.value as DirectNavicoConfig["protocol"])}
          >
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Port</label>
          <input
            type="number"
            className={inputCls}
            value={form.port}
            placeholder="10110 (suggested, not guaranteed)"
            onChange={(e) => updateField("port", Number(e.target.value) || 0)}
          />
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            10110 is commonly used for GoFree NMEA 0183 streams; 2222 shows up on some setups. Neither
            is guaranteed — check your Vulcan&apos;s network settings.
          </p>
        </div>
        <div>
          <label className={labelCls}>Connection timeout (ms)</label>
          <input
            type="number"
            className={inputCls}
            value={form.timeoutMs}
            onChange={(e) => updateField("timeoutMs", Number(e.target.value) || 0)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Sentence filters</label>
          <input
            className={inputCls}
            value={form.sentenceFilters.join(", ")}
            placeholder="e.g. RMC, MWV, DBT (leave blank for all supported sentences)"
            onChange={(e) =>
              updateField(
                "sentenceFilters",
                e.target.value
                  .split(",")
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean),
              )
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[color:var(--text)] sm:col-span-2">
          <input
            type="checkbox"
            checked={form.autoReconnect}
            onChange={(e) => updateField("autoReconnect", e.target.checked)}
          />
          Automatically reconnect if the bridge connection drops
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Btn full={false} tone="neutral" onClick={handleSave}>
          {saved ? "Saved" : "Save configuration"}
        </Btn>
        <Btn full={false} tone="neutral" disabled>
          Connect (bridge required)
        </Btn>
      </div>
    </div>
  );
}
