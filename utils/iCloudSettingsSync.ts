import { NativeICloudKV } from "./nativeICloudKV";

import {
  ACCOUNT_SETTINGS_KEY_PREFIX,
  getSettingsScopeFromUsername,
  GUEST_SETTINGS_SCOPE,
  makeAccountScopedSettingPrefix,
} from "./accountScopedSettings";
import KeyStore from "./KeyStore";

const CURRENT_USER_STORAGE_KEY = "currentUser";
const ICLOUD_UPDATED_AT_PREFIX = "iCloudSyncUpdatedAt";
const ICLOUD_KEY_PREFIX = "hydra:settings:";
const SYNC_DEBOUNCE_MS = 1_500;

const EXCLUDED_BASE_KEYS = new Set<string>([
  // File-system roots are device-specific and should stay local.
  "downloadFilesRootUri",
]);

type SyncPrimitive = string | number | boolean;
type SyncValueType = "string" | "number" | "boolean";
type SyncValue = { type: SyncValueType; value: SyncPrimitive };
type ScopeSnapshot = { updatedAt: number; values: Record<string, SyncValue> };

const pendingSyncTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const scopeSyncInProgress = new Set<string>();
const scopeApplyInProgress = new Set<string>();

function isSupportedScope(scope: string | null | undefined): scope is string {
  return !!scope && scope !== GUEST_SETTINGS_SCOPE;
}

function iCloudKey(scope: string): string {
  return `${ICLOUD_KEY_PREFIX}${scope}`;
}

function makeUpdatedAtKey(scope: string): string {
  return `${ICLOUD_UPDATED_AT_PREFIX}:${scope}`;
}

function getLocalUpdatedAt(scope: string): number {
  return KeyStore.getNumber(makeUpdatedAtKey(scope)) ?? 0;
}

function setLocalUpdatedAt(scope: string, updatedAt: number): void {
  KeyStore.set(makeUpdatedAtKey(scope), updatedAt);
}

function toSyncValue(value: SyncPrimitive): SyncValue {
  if (typeof value === "string") return { type: "string", value };
  if (typeof value === "number") return { type: "number", value };
  return { type: "boolean", value };
}

function readPrimitive(key: string): SyncPrimitive | undefined {
  if (!KeyStore.contains(key)) return undefined;
  const s = KeyStore.getString(key);
  if (s !== undefined) return s;
  const n = KeyStore.getNumber(key);
  if (n !== undefined) return n;
  const b = KeyStore.getBoolean(key);
  if (b !== undefined) return b;
  return undefined;
}

function parseAccountScopedKey(key: string) {
  const prefix = `${ACCOUNT_SETTINGS_KEY_PREFIX}:`;
  if (!key.startsWith(prefix)) return null;
  const withoutPrefix = key.slice(prefix.length);
  const sep = withoutPrefix.indexOf(":");
  if (sep <= 0) return null;
  const scope = withoutPrefix.slice(0, sep);
  const baseKey = withoutPrefix.slice(sep + 1);
  if (!baseKey || EXCLUDED_BASE_KEYS.has(baseKey)) return null;
  return { scope, baseKey };
}

function collectScopedSettings(scope: string): Record<string, SyncValue> {
  const keyPrefix = makeAccountScopedSettingPrefix(scope);
  const values: Record<string, SyncValue> = {};
  KeyStore.getAllKeys().forEach((key) => {
    if (!key.startsWith(keyPrefix)) return;
    const baseKey = key.slice(keyPrefix.length);
    if (!baseKey || EXCLUDED_BASE_KEYS.has(baseKey)) return;
    const value = readPrimitive(key);
    if (value !== undefined) values[baseKey] = toSyncValue(value);
  });
  return values;
}

function applyScopedSettings(
  scope: string,
  values: Record<string, SyncValue>,
): void {
  const keyPrefix = makeAccountScopedSettingPrefix(scope);
  const existingKeys = KeyStore.getAllKeys().filter((key) => {
    if (!key.startsWith(keyPrefix)) return false;
    const baseKey = key.slice(keyPrefix.length);
    return !!baseKey && !EXCLUDED_BASE_KEYS.has(baseKey);
  });
  const incomingBaseKeys = new Set(Object.keys(values));
  existingKeys.forEach((key) => {
    const baseKey = key.slice(keyPrefix.length);
    if (!incomingBaseKeys.has(baseKey)) KeyStore.delete(key);
  });
  Object.entries(values).forEach(([baseKey, sv]) => {
    const settingKey = `${keyPrefix}${baseKey}`;
    if (sv.type === "string" && typeof sv.value === "string") {
      KeyStore.set(settingKey, sv.value);
    } else if (sv.type === "number" && typeof sv.value === "number") {
      KeyStore.set(settingKey, sv.value);
    } else if (sv.type === "boolean" && typeof sv.value === "boolean") {
      KeyStore.set(settingKey, sv.value);
    }
  });
}

function readRemoteSnapshot(scope: string): ScopeSnapshot | null {
  try {
    const raw = NativeICloudKV.getString(iCloudKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScopeSnapshot;
    if (typeof parsed.updatedAt !== "number" || typeof parsed.values !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeRemoteSnapshot(scope: string, snapshot: ScopeSnapshot): void {
  NativeICloudKV.set(iCloudKey(scope), JSON.stringify(snapshot));
}

function pushScope(scope: string): void {
  const values = collectScopedSettings(scope);
  let updatedAt = getLocalUpdatedAt(scope);
  if (updatedAt <= 0) {
    updatedAt = Date.now();
    setLocalUpdatedAt(scope, updatedAt);
  }
  writeRemoteSnapshot(scope, { updatedAt, values });
}

function scheduleScopePush(scope: string): void {
  const existing = pendingSyncTimeouts.get(scope);
  if (existing) clearTimeout(existing);
  const id = setTimeout(() => {
    pendingSyncTimeouts.delete(scope);
    pushScope(scope);
  }, SYNC_DEBOUNCE_MS);
  pendingSyncTimeouts.set(scope, id);
}

export function syncAccountSettingsForUser(
  username?: string | null,
): void {
  const scope = getSettingsScopeFromUsername(username);
  if (!isSupportedScope(scope) || scopeSyncInProgress.has(scope)) return;

  scopeSyncInProgress.add(scope);
  try {
    const remote = readRemoteSnapshot(scope);

    if (!remote) {
      pushScope(scope);
      return;
    }

    const localUpdatedAt = getLocalUpdatedAt(scope);

    if (remote.updatedAt > localUpdatedAt) {
      scopeApplyInProgress.add(scope);
      try {
        applyScopedSettings(scope, remote.values);
        setLocalUpdatedAt(scope, remote.updatedAt);
      } finally {
        scopeApplyInProgress.delete(scope);
      }
      return;
    }

    if (localUpdatedAt > remote.updatedAt) {
      pushScope(scope);
    }
  } finally {
    scopeSyncInProgress.delete(scope);
  }
}

export function syncCurrentUserAccountSettings(): void {
  const currentUser = KeyStore.getString(CURRENT_USER_STORAGE_KEY);
  syncAccountSettingsForUser(currentUser);
}

export function startAccountSettingsSyncListener(): () => void {
  const listener = KeyStore.addOnValueChangedListener((changedKey) => {
    const parsed = parseAccountScopedKey(changedKey);
    if (!parsed || !isSupportedScope(parsed.scope)) return;
    if (scopeApplyInProgress.has(parsed.scope)) return;
    setLocalUpdatedAt(parsed.scope, Date.now());
    scheduleScopePush(parsed.scope);
  });

  return () => {
    listener.remove();
    pendingSyncTimeouts.forEach((id) => clearTimeout(id));
    pendingSyncTimeouts.clear();
  };
}
