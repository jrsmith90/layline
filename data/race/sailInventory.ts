import {
  DEFAULT_SAIL_INVENTORY_DEFAULTS,
  type SailInventoryDefaults,
} from "@/data/logic/sailSelectionLogic";
import { SAIL_INVENTORY_CATEGORY_META } from "@/lib/race/sailInventoryCatalog";

export type StoredSailInventoryState = {
  defaults: SailInventoryDefaults;
  updatedAtISO: string;
};

const SAIL_INVENTORY_STORAGE_KEY = "layline-sail-inventory-v1";

let cachedSailInventoryState: StoredSailInventoryState | null = null;
let sailInventoryVersion = 0;
let storageListenerAttached = false;
const listeners = new Set<() => void>();

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined" &&
    typeof localStorage.getItem === "function" &&
    typeof localStorage.setItem === "function"
  );
}

function sanitizeInventoryDefaults(value: unknown): SailInventoryDefaults {
  const input = value && typeof value === "object"
    ? (value as Partial<SailInventoryDefaults>)
    : {};

  function getValue<Key extends keyof SailInventoryDefaults>(key: Key): SailInventoryDefaults[Key] {
    const meta = SAIL_INVENTORY_CATEGORY_META[key];
    const candidate = input[key];
    return typeof candidate === "string" && meta.options.includes(candidate)
      ? (candidate as SailInventoryDefaults[Key])
      : DEFAULT_SAIL_INVENTORY_DEFAULTS[key];
  }

  return {
    mainChoice: getValue("mainChoice"),
    headsail150Choice: getValue("headsail150Choice"),
    headsail140Choice: getValue("headsail140Choice"),
    fullSizeSpinnakerChoice: getValue("fullSizeSpinnakerChoice"),
    heavyAirSpinnakerChoice: getValue("heavyAirSpinnakerChoice"),
  };
}

function sanitizeStoredState(value: unknown): StoredSailInventoryState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<StoredSailInventoryState>;
  return {
    defaults: sanitizeInventoryDefaults(input.defaults),
    updatedAtISO:
      typeof input.updatedAtISO === "string" && input.updatedAtISO.length > 0
        ? input.updatedAtISO
        : new Date().toISOString(),
  };
}

function buildDefaultState(): StoredSailInventoryState {
  return {
    defaults: DEFAULT_SAIL_INVENTORY_DEFAULTS,
    updatedAtISO: new Date().toISOString(),
  };
}

function loadStoredState() {
  if (cachedSailInventoryState != null) {
    return cachedSailInventoryState;
  }

  if (!canUseLocalStorage()) {
    cachedSailInventoryState = buildDefaultState();
    return cachedSailInventoryState;
  }

  try {
    const raw = localStorage.getItem(SAIL_INVENTORY_STORAGE_KEY);
    if (!raw) {
      cachedSailInventoryState = buildDefaultState();
      return cachedSailInventoryState;
    }

    const parsed = JSON.parse(raw);
    cachedSailInventoryState = sanitizeStoredState(parsed) ?? buildDefaultState();
  } catch {
    cachedSailInventoryState = buildDefaultState();
  }

  return cachedSailInventoryState;
}

function emitInventoryChange() {
  sailInventoryVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

function ensureStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") {
    return;
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== SAIL_INVENTORY_STORAGE_KEY) {
      return;
    }

    cachedSailInventoryState = null;
    emitInventoryChange();
  });

  storageListenerAttached = true;
}

function persistState(state: StoredSailInventoryState) {
  cachedSailInventoryState = state;

  if (canUseLocalStorage()) {
    localStorage.setItem(SAIL_INVENTORY_STORAGE_KEY, JSON.stringify(state));
  }

  emitInventoryChange();
}

export function getStoredSailInventoryState() {
  return loadStoredState();
}

export function getSailInventoryDefaults() {
  return loadStoredState().defaults;
}

export function getSailInventoryVersion() {
  loadStoredState();
  return sailInventoryVersion;
}

export function subscribeSailInventory(listener: () => void) {
  ensureStorageListener();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function saveSailInventoryDefaults(defaults: SailInventoryDefaults) {
  const sanitizedDefaults = sanitizeInventoryDefaults(defaults);
  const nextState: StoredSailInventoryState = {
    defaults: sanitizedDefaults,
    updatedAtISO: new Date().toISOString(),
  };
  persistState(nextState);
  return nextState;
}

export function resetSailInventoryDefaults() {
  return saveSailInventoryDefaults(DEFAULT_SAIL_INVENTORY_DEFAULTS);
}
