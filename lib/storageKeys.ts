export const STORAGE_KEYS = {
  sessions: "layline-race-sessions-v1",
  activeSessionId: "layline-active-race-session-id-v1",
  sessionRepositoryCache: "layline-race-session-repository-cache-v1",
  gpsTrack: "layline-phone-gps-track-v1",
  activeCourseTracker: "layline-active-course-tracker-v1",
  tackCalibrations: "layline-tack-calibrations-v1",
  tacticalBoardDraft: "layline-tactical-board-draft-v1",
  sailInventory: "layline-sail-inventory-v1",
  appMode: "layline-app-mode",
  displayMode: "layline-display-mode",
  phoneGpsEnabled: "layline-phone-gps-enabled",
  logs: "layline-logs-v1",
  pendingLogId: "layline-pending-log-id-v1",
  courseLibrary: "layline-course-library-v1",
  boatDataConnectionConfig: "layline-boat-data-connection-config-v1",
  boatDataPathMappingOverrides: "layline-boat-data-path-mapping-overrides-v1",
  boatDataSourcePriority: "layline-boat-data-source-priority-v1",
  instrumentDashboardLayout: "layline-instrument-dashboard-layout-v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
