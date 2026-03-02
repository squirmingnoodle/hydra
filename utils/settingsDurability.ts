import { File, Paths } from "expo-file-system/next";

import KeyStore from "./KeyStore";

const SETTINGS_SNAPSHOT_FILE_NAME = "hydra-settings-snapshot-v1.json";
const SETTINGS_SNAPSHOT_VERSION = 1;
const SETTINGS_PREFIX = "acctSetting:";
const AUTOSAVE_DEBOUNCE_MS = 500;

const GLOBAL_SETTINGS_KEYS = new Set([
  "allowErrorReporting",
]);

type SnapshotPrimitive = string | number | boolean;
type SnapshotValueType = "string" | "number" | "boolean";

type SnapshotValue = {
  type: SnapshotValueType;
  value: SnapshotPrimitive;
};

type SettingsSnapshot = {
  version: number;
  values: Record<string, SnapshotValue>;
};

let writeTimeout: ReturnType<typeof setTimeout> | null = null;

function getSnapshotFile() {
  return new File(Paths.document, SETTINGS_SNAPSHOT_FILE_NAME);
}

function isIncludedSettingsKey(key: string) {
  return key.startsWith(SETTINGS_PREFIX) || GLOBAL_SETTINGS_KEYS.has(key);
}

function toSnapshotValue(value: SnapshotPrimitive): SnapshotValue {
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (typeof value === "number") {
    return { type: "number", value };
  }
  return { type: "boolean", value };
}

function readKeyStorePrimitive(key: string): SnapshotPrimitive | undefined {
  if (!KeyStore.contains(key)) {
    return undefined;
  }

  const stringValue = KeyStore.getString(key);
  if (stringValue !== undefined) {
    return stringValue;
  }

  const numberValue = KeyStore.getNumber(key);
  if (numberValue !== undefined) {
    return numberValue;
  }

  const booleanValue = KeyStore.getBoolean(key);
  if (booleanValue !== undefined) {
    return booleanValue;
  }

  return undefined;
}

function buildSnapshot(): SettingsSnapshot {
  const values: Record<string, SnapshotValue> = {};

  for (const key of KeyStore.getAllKeys()) {
    if (!isIncludedSettingsKey(key)) {
      continue;
    }

    const value = readKeyStorePrimitive(key);
    if (value !== undefined) {
      values[key] = toSnapshotValue(value);
    }
  }

  return {
    version: SETTINGS_SNAPSHOT_VERSION,
    values,
  };
}

function parseSnapshot(raw: string): SettingsSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as SettingsSnapshot;
    if (
      parsed.version !== SETTINGS_SNAPSHOT_VERSION ||
      typeof parsed.values !== "object" ||
      parsed.values === null
    ) {
      return null;
    }

    const values: Record<string, SnapshotValue> = {};

    for (const [key, item] of Object.entries(parsed.values)) {
      if (!isIncludedSettingsKey(key)) {
        continue;
      }

      if (!item || typeof item !== "object") {
        continue;
      }

      const type = (item as SnapshotValue).type;
      const value = (item as SnapshotValue).value;

      if (
        (type === "string" && typeof value === "string") ||
        (type === "number" && typeof value === "number") ||
        (type === "boolean" && typeof value === "boolean")
      ) {
        values[key] = { type, value };
      }
    }

    return {
      version: SETTINGS_SNAPSHOT_VERSION,
      values,
    };
  } catch (_error) {
    return null;
  }
}

async function writeSnapshot() {
  const snapshotFile = getSnapshotFile();
  const snapshot = buildSnapshot();
  const payload = JSON.stringify(snapshot);

  if (!snapshotFile.exists) {
    snapshotFile.create({ intermediates: true, overwrite: true });
  }

  snapshotFile.write(payload);
}

function applySnapshot(snapshot: SettingsSnapshot) {
  for (const [key, item] of Object.entries(snapshot.values)) {
    if (!isIncludedSettingsKey(key)) {
      continue;
    }

    if (item.type === "string" && typeof item.value === "string") {
      KeyStore.set(key, item.value);
      continue;
    }

    if (item.type === "number" && typeof item.value === "number") {
      KeyStore.set(key, item.value);
      continue;
    }

    if (item.type === "boolean" && typeof item.value === "boolean") {
      KeyStore.set(key, item.value);
    }
  }
}

function scheduleWriteSnapshot() {
  if (writeTimeout) {
    clearTimeout(writeTimeout);
  }

  writeTimeout = setTimeout(() => {
    writeTimeout = null;
    void writeSnapshot();
  }, AUTOSAVE_DEBOUNCE_MS);
}

export async function hydrateSettingsFromSnapshot() {
  const snapshotFile = getSnapshotFile();
  if (!snapshotFile.exists) {
    return;
  }

  let raw = "";
  try {
    raw = await snapshotFile.text();
  } catch (_error) {
    return;
  }

  const snapshot = parseSnapshot(raw);
  if (!snapshot) {
    return;
  }

  applySnapshot(snapshot);
}

export function startSettingsAutosaveListener() {
  const listener = KeyStore.addOnValueChangedListener((changedKey) => {
    if (!isIncludedSettingsKey(changedKey)) {
      return;
    }
    scheduleWriteSnapshot();
  });

  scheduleWriteSnapshot();

  return () => {
    listener.remove();
    if (writeTimeout) {
      clearTimeout(writeTimeout);
      writeTimeout = null;
    }
  };
}
