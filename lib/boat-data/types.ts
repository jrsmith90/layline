export type BoatDataQuality = "valid" | "suspect" | "invalid";

export type Position = {
  lat: number;
  lon: number;
};

export type Reading<T> = {
  value: T;
  source: string;
  sourceDevice?: string;
  rawTimestamp: string;
  normalizedTimestamp: string;
  quality: BoatDataQuality;
  ageSeconds: number;
};

export type Tack = "port" | "starboard";

export type BoatDataFieldKey =
  | "position"
  | "gpsAccuracyM"
  | "sogKt"
  | "cogTrueDeg"
  | "headingTrueDeg"
  | "headingMagneticDeg"
  | "magneticVariationDeg"
  | "distanceToWaypointNm"
  | "bearingToWaypointDeg"
  | "crossTrackErrorNm"
  | "speedThroughWaterKt"
  | "targetBoatSpeedKt"
  | "targetPercentage"
  | "vmgKt"
  | "upwindVmgKt"
  | "downwindVmgKt"
  | "awaDeg"
  | "awsKt"
  | "twaDeg"
  | "twsKt"
  | "twdDeg"
  | "depthBelowTransducerM"
  | "depthBelowKeelM"
  | "depthBelowSurfaceM"
  | "waterTempC"
  | "polarTargetSpeedKt"
  | "polarTargetAngleDeg"
  | "performancePercentage"
  | "liftHeaderDeg"
  | "currentTack"
  | "favoredTack"
  | "estimatedCurrentDirectionDeg"
  | "estimatedCurrentSpeedKt";

export type BoatDataFieldValue<K extends BoatDataFieldKey> = K extends "position"
  ? Position
  : K extends "currentTack" | "favoredTack"
    ? Tack
    : number;

export type BoatDataFields = {
  [K in BoatDataFieldKey]: Reading<BoatDataFieldValue<K>> | null;
};

export type ConnectionMode = "none" | "signalk" | "direct_navico" | "file_import" | "demo";

export type ConnectionLifecycleState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type ConnectionSummary = {
  mode: ConnectionMode;
  status: ConnectionLifecycleState;
  sourceLabel: string;
  lastMessageAt: string | null;
  reconnectAttempts: number;
  error?: string;
};

export type BoatDataSnapshot = BoatDataFields & {
  connection: ConnectionSummary;
};

export type SignalKConfig = {
  host: string;
  protocol: "http" | "https";
  port: number;
  authToken: string;
  vesselContext: string;
  autoReconnect: boolean;
};

export type NmeaProtocol = "tcp" | "udp";

export type DirectNavicoConfig = {
  host: string;
  protocol: NmeaProtocol;
  port: number;
  timeoutMs: number;
  autoReconnect: boolean;
  sentenceFilters: string[];
};

export type FtpImportConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  startingFolder: string;
};

export type BoatDataConnectionConfig = {
  activeMode: ConnectionMode;
  signalk: SignalKConfig;
  directNavico: DirectNavicoConfig;
  ftp: FtpImportConfig;
};

export const DEFAULT_SIGNALK_CONFIG: SignalKConfig = {
  host: "10.10.10.1",
  protocol: "http",
  port: 3000,
  authToken: "",
  vesselContext: "self",
  autoReconnect: true,
};

export const DEFAULT_DIRECT_NAVICO_CONFIG: DirectNavicoConfig = {
  host: "",
  protocol: "tcp",
  port: 10110,
  timeoutMs: 8000,
  autoReconnect: true,
  sentenceFilters: [],
};

export const DEFAULT_FTP_CONFIG: FtpImportConfig = {
  host: "",
  port: 21,
  username: "",
  password: "",
  startingFolder: "",
};

export const DEFAULT_BOAT_DATA_CONNECTION_CONFIG: BoatDataConnectionConfig = {
  activeMode: "none",
  signalk: DEFAULT_SIGNALK_CONFIG,
  directNavico: DEFAULT_DIRECT_NAVICO_CONFIG,
  ftp: DEFAULT_FTP_CONFIG,
};

export type DiagnosticsCounters = {
  connectionType: ConnectionMode;
  host: string;
  port: number | null;
  state: ConnectionLifecycleState;
  lastSuccessfulConnectionAt: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  messagesPerSecond: number;
  pathsReceived: Record<string, number>;
  unsupportedSentences: Record<string, number>;
  checksumFailures: number;
  parsingFailures: number;
  staleFieldCount: number;
  reconnectAttempts: number;
  rawPreview: string[];
};

export const MAX_RAW_PREVIEW_LINES = 20;

export function createEmptyDiagnostics(): DiagnosticsCounters {
  return {
    connectionType: "none",
    host: "",
    port: null,
    state: "disconnected",
    lastSuccessfulConnectionAt: null,
    lastMessageAt: null,
    messageCount: 0,
    messagesPerSecond: 0,
    pathsReceived: {},
    unsupportedSentences: {},
    checksumFailures: 0,
    parsingFailures: 0,
    staleFieldCount: 0,
    reconnectAttempts: 0,
    rawPreview: [],
  };
}

export function createEmptyBoatDataSnapshot(): BoatDataSnapshot {
  return {
    position: null,
    gpsAccuracyM: null,
    sogKt: null,
    cogTrueDeg: null,
    headingTrueDeg: null,
    headingMagneticDeg: null,
    magneticVariationDeg: null,
    distanceToWaypointNm: null,
    bearingToWaypointDeg: null,
    crossTrackErrorNm: null,
    speedThroughWaterKt: null,
    targetBoatSpeedKt: null,
    targetPercentage: null,
    vmgKt: null,
    upwindVmgKt: null,
    downwindVmgKt: null,
    awaDeg: null,
    awsKt: null,
    twaDeg: null,
    twsKt: null,
    twdDeg: null,
    depthBelowTransducerM: null,
    depthBelowKeelM: null,
    depthBelowSurfaceM: null,
    waterTempC: null,
    polarTargetSpeedKt: null,
    polarTargetAngleDeg: null,
    performancePercentage: null,
    liftHeaderDeg: null,
    currentTack: null,
    favoredTack: null,
    estimatedCurrentDirectionDeg: null,
    estimatedCurrentSpeedKt: null,
    connection: {
      mode: "none",
      status: "disconnected",
      sourceLabel: "Not connected",
      lastMessageAt: null,
      reconnectAttempts: 0,
    },
  };
}

export type InstrumentMetricKey = Extract<
  BoatDataFieldKey,
  | "speedThroughWaterKt"
  | "sogKt"
  | "headingTrueDeg"
  | "cogTrueDeg"
  | "awaDeg"
  | "awsKt"
  | "twaDeg"
  | "twsKt"
  | "depthBelowKeelM"
  | "vmgKt"
  | "targetPercentage"
  | "liftHeaderDeg"
>;

export type InstrumentLayout = "2-card" | "4-card" | "6-card" | "custom";

export type InstrumentDashboardConfig = {
  layout: InstrumentLayout;
  metrics: InstrumentMetricKey[];
};

export const DEFAULT_INSTRUMENT_METRICS: InstrumentMetricKey[] = [
  "speedThroughWaterKt",
  "sogKt",
  "headingTrueDeg",
  "cogTrueDeg",
  "awaDeg",
  "awsKt",
  "twaDeg",
  "twsKt",
  "depthBelowKeelM",
  "vmgKt",
  "targetPercentage",
  "liftHeaderDeg",
];

export const DEFAULT_INSTRUMENT_DASHBOARD_CONFIG: InstrumentDashboardConfig = {
  layout: "4-card",
  metrics: DEFAULT_INSTRUMENT_METRICS.slice(0, 4),
};
