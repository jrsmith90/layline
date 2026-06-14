import { STORAGE_KEYS } from "@/lib/storageKeys";

export type AppMode = "race" | "learning";

export const APP_MODE_KEY = STORAGE_KEYS.appMode;

export function isAppMode(value: unknown): value is AppMode {
  return value === "race" || value === "learning";
}
