"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import {
  createEmptyBoatDataSnapshot,
  createEmptyDiagnostics,
  DEFAULT_BOAT_DATA_CONNECTION_CONFIG,
  MAX_RAW_PREVIEW_LINES,
  type BoatDataConnectionConfig,
  type BoatDataFieldKey,
  type BoatDataFieldValue,
  type BoatDataSnapshot,
  type ConnectionLifecycleState,
  type ConnectionMode,
  type DiagnosticsCounters,
  type Reading,
} from "./types";

const MESSAGE_RATE_WINDOW_MS = 5000;

let snapshot: BoatDataSnapshot = createEmptyBoatDataSnapshot();
let diagnostics: DiagnosticsCounters = createEmptyDiagnostics();
let recentMessageTimestampsMs: number[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return snapshot;
}

function getDiagnosticsSnapshot() {
  return diagnostics;
}

function recomputeMessageRate(nowMs: number) {
  recentMessageTimestampsMs = recentMessageTimestampsMs.filter(
    (t) => nowMs - t <= MESSAGE_RATE_WINDOW_MS,
  );
  diagnostics = {
    ...diagnostics,
    messagesPerSecond:
      Math.round((recentMessageTimestampsMs.length / (MESSAGE_RATE_WINDOW_MS / 1000)) * 10) / 10,
  };
}

export function setReading<K extends BoatDataFieldKey>(
  field: K,
  reading: Reading<BoatDataFieldValue<K>>,
  nowMs: number,
) {
  snapshot = { ...snapshot, [field]: reading } as BoatDataSnapshot;
  recentMessageTimestampsMs.push(nowMs);
  diagnostics = {
    ...diagnostics,
    messageCount: diagnostics.messageCount + 1,
    lastMessageAt: reading.normalizedTimestamp,
    pathsReceived: {
      ...diagnostics.pathsReceived,
      [field]: (diagnostics.pathsReceived[field] ?? 0) + 1,
    },
  };
  recomputeMessageRate(nowMs);
  notify();
}

export function setConnectionState(partial: {
  mode?: ConnectionMode;
  status?: ConnectionLifecycleState;
  sourceLabel?: string;
  lastMessageAt?: string | null;
  reconnectAttempts?: number;
  error?: string;
}) {
  snapshot = {
    ...snapshot,
    connection: {
      ...snapshot.connection,
      ...partial,
    },
  };
  diagnostics = {
    ...diagnostics,
    connectionType: partial.mode ?? diagnostics.connectionType,
    state: partial.status ?? diagnostics.state,
  };
  if (partial.status === "connected") {
    diagnostics = { ...diagnostics, lastSuccessfulConnectionAt: new Date().toISOString() };
  }
  notify();
}

export function recordReconnectAttempt() {
  diagnostics = { ...diagnostics, reconnectAttempts: diagnostics.reconnectAttempts + 1 };
  snapshot = {
    ...snapshot,
    connection: {
      ...snapshot.connection,
      reconnectAttempts: snapshot.connection.reconnectAttempts + 1,
    },
  };
  notify();
}

export function recordChecksumFailure() {
  diagnostics = { ...diagnostics, checksumFailures: diagnostics.checksumFailures + 1 };
  notify();
}

export function recordParsingFailure() {
  diagnostics = { ...diagnostics, parsingFailures: diagnostics.parsingFailures + 1 };
  notify();
}

export function recordUnsupportedSentence(sentenceType: string) {
  diagnostics = {
    ...diagnostics,
    unsupportedSentences: {
      ...diagnostics.unsupportedSentences,
      [sentenceType]: (diagnostics.unsupportedSentences[sentenceType] ?? 0) + 1,
    },
  };
  notify();
}

export function pushRawPreview(line: string) {
  diagnostics = {
    ...diagnostics,
    rawPreview: [...diagnostics.rawPreview, line].slice(-MAX_RAW_PREVIEW_LINES),
  };
  notify();
}

export function setDiagnosticsTarget(host: string, port: number | null) {
  diagnostics = { ...diagnostics, host, port };
  notify();
}

export function updateStaleFieldCount(count: number) {
  if (diagnostics.staleFieldCount === count) return;
  diagnostics = { ...diagnostics, staleFieldCount: count };
  notify();
}

export function resetDiagnostics() {
  diagnostics = createEmptyDiagnostics();
  recentMessageTimestampsMs = [];
  notify();
}

export function resetSnapshotToEmpty() {
  snapshot = createEmptyBoatDataSnapshot();
  notify();
}

export function useBoatDataSnapshot(): BoatDataSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useBoatDataDiagnostics(): DiagnosticsCounters {
  return useSyncExternalStore(subscribe, getDiagnosticsSnapshot, getDiagnosticsSnapshot);
}

export function useNowMs(intervalMs = 1000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return nowMs;
}

let cachedConfigRaw: string | null | undefined;
let cachedConfigParsed: BoatDataConnectionConfig = DEFAULT_BOAT_DATA_CONNECTION_CONFIG;

// useSyncExternalStore requires getSnapshot to return a stable reference when
// nothing changed - cache the parsed config the same way phoneGpsSource.ts
// caches its parsed track, keyed off the raw string we last parsed.
function readConnectionConfig(): BoatDataConnectionConfig {
  if (typeof window === "undefined") return DEFAULT_BOAT_DATA_CONNECTION_CONFIG;

  const raw = localStorage.getItem(STORAGE_KEYS.boatDataConnectionConfig);
  if (raw === cachedConfigRaw) return cachedConfigParsed;

  cachedConfigRaw = raw;

  if (!raw) {
    cachedConfigParsed = DEFAULT_BOAT_DATA_CONNECTION_CONFIG;
    return cachedConfigParsed;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedConfigParsed = {
      activeMode: parsed.activeMode ?? DEFAULT_BOAT_DATA_CONNECTION_CONFIG.activeMode,
      signalk: { ...DEFAULT_BOAT_DATA_CONNECTION_CONFIG.signalk, ...parsed.signalk },
      directNavico: { ...DEFAULT_BOAT_DATA_CONNECTION_CONFIG.directNavico, ...parsed.directNavico },
      ftp: { ...DEFAULT_BOAT_DATA_CONNECTION_CONFIG.ftp, ...parsed.ftp },
    };
  } catch {
    cachedConfigParsed = DEFAULT_BOAT_DATA_CONNECTION_CONFIG;
  }

  return cachedConfigParsed;
}

export function saveConnectionConfig(config: BoatDataConnectionConfig) {
  if (typeof window === "undefined") return;
  cachedConfigRaw = JSON.stringify(config);
  cachedConfigParsed = config;
  localStorage.setItem(STORAGE_KEYS.boatDataConnectionConfig, cachedConfigRaw);
  window.dispatchEvent(new CustomEvent(CONFIG_CHANGED_EVENT));
}

const CONFIG_CHANGED_EVENT = "layline:boat-data-config-changed";

function subscribeConnectionConfig(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.boatDataConnectionConfig) listener();
  };

  window.addEventListener(CONFIG_CHANGED_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CONFIG_CHANGED_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useConnectionConfig() {
  return useSyncExternalStore(
    subscribeConnectionConfig,
    readConnectionConfig,
    () => DEFAULT_BOAT_DATA_CONNECTION_CONFIG,
  );
}
