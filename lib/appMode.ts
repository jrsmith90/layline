export type AppMode = "race" | "learning";

export const APP_MODE_KEY = "layline-app-mode";

export function isAppMode(value: unknown): value is AppMode {
  return value === "race" || value === "learning";
}
