import type { SignalKConfig } from "@/lib/boat-data/types";
import { createReading } from "@/lib/boat-data/normalizer";
import {
  pushRawPreview,
  recordReconnectAttempt,
  recordUnsupportedSentence,
  setConnectionState,
  setDiagnosticsTarget,
  setReading,
} from "@/lib/boat-data/store";
import { convertSignalKValue, getEffectivePathMappings, buildPathToFieldIndex } from "./path-mapper";

const REST_TIMEOUT_MS = 6000;
const WS_TEST_TIMEOUT_MS = 5000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

function buildBaseUrl(config: SignalKConfig): string {
  return `${config.protocol}://${config.host}:${config.port}`;
}

function buildWebSocketUrl(config: SignalKConfig): string {
  const wsProtocol = config.protocol === "https" ? "wss" : "ws";
  return `${wsProtocol}://${config.host}:${config.port}/signalk/v1/stream?subscribe=self`;
}

function isMixedContentRisk(config: SignalKConfig): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    config.protocol === "http"
  );
}

function countSignalKPaths(node: unknown, depth = 0): number {
  if (!node || typeof node !== "object" || depth > 8) return 0;
  const record = node as Record<string, unknown>;

  if ("value" in record && ("timestamp" in record || "$source" in record)) {
    return 1;
  }

  let count = 0;
  for (const value of Object.values(record)) {
    count += countSignalKPaths(value, depth + 1);
  }
  return count;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function testWebSocket(config: SignalKConfig): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let socket: WebSocket;

    try {
      socket = new WebSocket(buildWebSocketUrl(config));
    } catch {
      resolve(false);
      return;
    }

    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      resolve(available);
      try {
        socket.close();
      } catch {
        // socket already closing/closed
      }
    };

    const timeout = setTimeout(() => finish(false), WS_TEST_TIMEOUT_MS);
    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      finish(true);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      finish(false);
    });
  });
}

export type SignalKAuthStatus = "not_required" | "accepted" | "rejected" | "unknown";

export type SignalKTestResult = {
  reachable: boolean;
  webSocketAvailable: boolean;
  vesselDetected: boolean;
  livePathCount: number;
  lastMessageAt: string | null;
  latencyMs: number | null;
  authStatus: SignalKAuthStatus;
  error: string | null;
  mixedContentWarning: string | null;
};

export async function testSignalKConnection(config: SignalKConfig): Promise<SignalKTestResult> {
  const mixedContentWarning = isMixedContentRisk(config)
    ? "This page is loaded over HTTPS but the Signal K server address uses HTTP. Browsers commonly block this as mixed content — try loading Layline over HTTP on the boat network, or use a Signal K server with HTTPS enabled."
    : null;

  const baseUrl = buildBaseUrl(config);
  const headers: Record<string, string> = {};
  if (config.authToken) headers.Authorization = `Bearer ${config.authToken}`;

  const startedAtMs = performance.now();

  try {
    const discoveryResponse = await fetchWithTimeout(`${baseUrl}/signalk`, {}, REST_TIMEOUT_MS);
    if (!discoveryResponse.ok) {
      return {
        reachable: false,
        webSocketAvailable: false,
        vesselDetected: false,
        livePathCount: 0,
        lastMessageAt: null,
        latencyMs: null,
        authStatus: "unknown",
        error: `Signal K server responded with HTTP ${discoveryResponse.status}.`,
        mixedContentWarning,
      };
    }

    let vesselResponse: Response;
    try {
      vesselResponse = await fetchWithTimeout(
        `${baseUrl}/signalk/v1/api/vessels/${config.vesselContext || "self"}`,
        { headers },
        REST_TIMEOUT_MS,
      );
    } catch {
      const webSocketAvailable = await testWebSocket(config);
      return {
        reachable: true,
        webSocketAvailable,
        vesselDetected: false,
        livePathCount: 0,
        lastMessageAt: null,
        latencyMs: Math.round(performance.now() - startedAtMs),
        authStatus: "unknown",
        error: "Server reachable, but the vessel data endpoint could not be read.",
        mixedContentWarning,
      };
    }

    const latencyMs = Math.round(performance.now() - startedAtMs);
    const authStatus: SignalKAuthStatus =
      vesselResponse.status === 401 || vesselResponse.status === 403
        ? "rejected"
        : config.authToken
          ? "accepted"
          : "not_required";

    if (!vesselResponse.ok) {
      const webSocketAvailable = await testWebSocket(config);
      return {
        reachable: true,
        webSocketAvailable,
        vesselDetected: false,
        livePathCount: 0,
        lastMessageAt: null,
        latencyMs,
        authStatus,
        error:
          authStatus === "rejected"
            ? "Authentication was rejected by the Signal K server."
            : `Vessel data request failed with HTTP ${vesselResponse.status}.`,
        mixedContentWarning,
      };
    }

    const vesselData = await vesselResponse.json();
    const livePathCount = countSignalKPaths(vesselData);
    const webSocketAvailable = await testWebSocket(config);

    return {
      reachable: true,
      webSocketAvailable,
      vesselDetected: Boolean(vesselData),
      livePathCount,
      lastMessageAt: new Date().toISOString(),
      latencyMs,
      authStatus,
      error: null,
      mixedContentWarning,
    };
  } catch (error) {
    return {
      reachable: false,
      webSocketAvailable: false,
      vesselDetected: false,
      livePathCount: 0,
      lastMessageAt: null,
      latencyMs: null,
      authStatus: "unknown",
      error:
        error instanceof Error
          ? `Could not reach the Signal K server: ${error.message}`
          : "Could not reach the Signal K server.",
      mixedContentWarning,
    };
  }
}

type SignalKDeltaValue = { path: string; value: unknown };
type SignalKDeltaUpdate = {
  timestamp?: string;
  $source?: string;
  source?: { label?: string };
  values?: SignalKDeltaValue[];
};
type SignalKDelta = {
  context?: string;
  updates?: SignalKDeltaUpdate[];
};

export type SignalKConnectionController = {
  disconnect: () => void;
};

export function connectSignalK(config: SignalKConfig): SignalKConnectionController {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
  let disconnected = false;

  const pathToField = buildPathToFieldIndex(getEffectivePathMappings());
  setDiagnosticsTarget(config.host, config.port);

  function scheduleReconnect() {
    if (disconnected || !config.autoReconnect) return;
    setConnectionState({ status: "reconnecting" });
    recordReconnectAttempt();
    reconnectTimer = setTimeout(() => {
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
      open();
    }, reconnectDelayMs);
  }

  function handleMessage(event: MessageEvent) {
    const nowMs = Date.now();
    if (typeof event.data === "string") {
      pushRawPreview(event.data.slice(0, 500));
    }

    let delta: SignalKDelta;
    try {
      delta = JSON.parse(event.data);
    } catch {
      return;
    }

    for (const update of delta.updates ?? []) {
      const sourceLabel = update.source?.label ?? update.$source ?? "signalk";
      const rawTimestamp = update.timestamp ?? new Date(nowMs).toISOString();

      for (const entry of update.values ?? []) {
        const mapping = pathToField.get(entry.path);
        if (!mapping) {
          recordUnsupportedSentence(entry.path);
          continue;
        }

        if (mapping.field === "position") {
          const positionValue = entry.value as { latitude?: number; longitude?: number } | null;
          if (
            positionValue &&
            typeof positionValue.latitude === "number" &&
            typeof positionValue.longitude === "number"
          ) {
            setReading(
              "position",
              createReading({
                value: { lat: positionValue.latitude, lon: positionValue.longitude },
                source: sourceLabel,
                rawTimestamp,
                nowMs,
              }),
              nowMs,
            );
          }
          continue;
        }

        if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) continue;

        const convertedValue = convertSignalKValue(mapping.unit, entry.value);
        setReading(
          mapping.field,
          createReading({
            value: convertedValue,
            source: sourceLabel,
            rawTimestamp,
            nowMs,
          }),
          nowMs,
        );
      }
    }
  }

  function open() {
    setConnectionState({ mode: "signalk", status: "connecting", sourceLabel: config.host });
    socket = new WebSocket(buildWebSocketUrl(config));

    socket.addEventListener("open", () => {
      reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
      setConnectionState({
        mode: "signalk",
        status: "connected",
        sourceLabel: `Signal K @ ${config.host}`,
      });
    });

    socket.addEventListener("message", handleMessage);

    socket.addEventListener("close", () => {
      if (disconnected) return;
      setConnectionState({ status: "disconnected" });
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      setConnectionState({ status: "error", error: "Signal K connection error." });
    });
  }

  open();

  return {
    disconnect() {
      disconnected = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      setConnectionState({ mode: "none", status: "disconnected", sourceLabel: "Not connected" });
    },
  };
}
