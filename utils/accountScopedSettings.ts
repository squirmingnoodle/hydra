import { useContext, useEffect, useMemo } from "react";
import {
  useMMKVBoolean,
  useMMKVNumber,
  useMMKVObject,
  useMMKVString,
} from "react-native-mmkv";

import { AccountContext } from "../contexts/AccountContext";
import KeyStore from "./KeyStore";

export const GUEST_SETTINGS_SCOPE = "__guest__";
export const ACCOUNT_SETTINGS_KEY_PREFIX = "acctSetting";

type ScopedSettingValue = string | number | boolean;

export function getSettingsScopeFromUsername(username?: string | null): string {
  const normalized = username?.trim().toLowerCase();
  return normalized ? normalized : GUEST_SETTINGS_SCOPE;
}

export function getActiveSettingsScope(): string {
  return getSettingsScopeFromUsername(KeyStore.getString("currentUser"));
}

export function makeAccountScopedSettingPrefix(
  scope = getActiveSettingsScope(),
): string {
  return `${ACCOUNT_SETTINGS_KEY_PREFIX}:${scope}:`;
}

export function makeAccountScopedSettingKey(
  baseKey: string,
  scope = getActiveSettingsScope(),
): string {
  return `${makeAccountScopedSettingPrefix(scope)}${baseKey}`;
}

function useSettingsScope() {
  const { currentUser } = useContext(AccountContext);
  return getSettingsScopeFromUsername(
    currentUser?.userName ?? KeyStore.getString("currentUser"),
  );
}

function getLegacyObject<T>(baseKey: string): T | undefined {
  if (!KeyStore.contains(baseKey)) return undefined;
  const serialized = KeyStore.getString(baseKey);
  if (serialized === undefined) return undefined;
  try {
    return JSON.parse(serialized) as T;
  } catch (_e) {
    return undefined;
  }
}

function getOrMigrateScopedBoolean(
  baseKey: string,
  scope = getActiveSettingsScope(),
): boolean | undefined {
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  if (KeyStore.contains(scopedKey)) {
    return KeyStore.getBoolean(scopedKey);
  }
  if (!KeyStore.contains(baseKey)) {
    return undefined;
  }
  const legacyValue = KeyStore.getBoolean(baseKey);
  if (legacyValue !== undefined) {
    KeyStore.set(scopedKey, legacyValue);
  }
  return legacyValue;
}

function getOrMigrateScopedString(
  baseKey: string,
  scope = getActiveSettingsScope(),
): string | undefined {
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  if (KeyStore.contains(scopedKey)) {
    return KeyStore.getString(scopedKey);
  }
  if (!KeyStore.contains(baseKey)) {
    return undefined;
  }
  const legacyValue = KeyStore.getString(baseKey);
  if (legacyValue !== undefined) {
    KeyStore.set(scopedKey, legacyValue);
  }
  return legacyValue;
}

function getOrMigrateScopedNumber(
  baseKey: string,
  scope = getActiveSettingsScope(),
): number | undefined {
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  if (KeyStore.contains(scopedKey)) {
    return KeyStore.getNumber(scopedKey);
  }
  if (!KeyStore.contains(baseKey)) {
    return undefined;
  }
  const legacyValue = KeyStore.getNumber(baseKey);
  if (legacyValue !== undefined) {
    KeyStore.set(scopedKey, legacyValue);
  }
  return legacyValue;
}

export function useAccountScopedMMKVBoolean(baseKey: string) {
  const scope = useSettingsScope();
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  const [storedValue, setStoredValue] = useMMKVBoolean(scopedKey);

  const legacyValue = useMemo(() => {
    if (KeyStore.contains(scopedKey) || !KeyStore.contains(baseKey)) {
      return undefined;
    }
    return KeyStore.getBoolean(baseKey);
  }, [baseKey, scopedKey]);

  useEffect(() => {
    if (storedValue !== undefined || legacyValue === undefined) {
      return;
    }
    setStoredValue(legacyValue);
  }, [legacyValue, setStoredValue, storedValue]);

  return [storedValue ?? legacyValue, setStoredValue] as const;
}

export function useAccountScopedMMKVString(baseKey: string) {
  const scope = useSettingsScope();
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  const [storedValue, setStoredValue] = useMMKVString(scopedKey);

  const legacyValue = useMemo(() => {
    if (KeyStore.contains(scopedKey) || !KeyStore.contains(baseKey)) {
      return undefined;
    }
    return KeyStore.getString(baseKey);
  }, [baseKey, scopedKey]);

  useEffect(() => {
    if (storedValue !== undefined || legacyValue === undefined) {
      return;
    }
    setStoredValue(legacyValue);
  }, [legacyValue, setStoredValue, storedValue]);

  return [storedValue ?? legacyValue, setStoredValue] as const;
}

export function useAccountScopedMMKVNumber(baseKey: string) {
  const scope = useSettingsScope();
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  const [storedValue, setStoredValue] = useMMKVNumber(scopedKey);

  const legacyValue = useMemo(() => {
    if (KeyStore.contains(scopedKey) || !KeyStore.contains(baseKey)) {
      return undefined;
    }
    return KeyStore.getNumber(baseKey);
  }, [baseKey, scopedKey]);

  useEffect(() => {
    if (storedValue !== undefined || legacyValue === undefined) {
      return;
    }
    setStoredValue(legacyValue);
  }, [legacyValue, setStoredValue, storedValue]);

  return [storedValue ?? legacyValue, setStoredValue] as const;
}

export function useAccountScopedMMKVObject<T>(baseKey: string) {
  const scope = useSettingsScope();
  const scopedKey = makeAccountScopedSettingKey(baseKey, scope);
  const [storedValue, setStoredValue] = useMMKVObject<T>(scopedKey);

  const legacyValue = useMemo(() => {
    if (KeyStore.contains(scopedKey) || !KeyStore.contains(baseKey)) {
      return undefined;
    }
    return getLegacyObject<T>(baseKey);
  }, [baseKey, scopedKey]);

  useEffect(() => {
    if (storedValue !== undefined || legacyValue === undefined) {
      return;
    }
    setStoredValue(legacyValue);
  }, [legacyValue, setStoredValue, storedValue]);

  return [storedValue ?? legacyValue, setStoredValue] as const;
}

export function getAccountScopedBoolean(baseKey: string): boolean | undefined {
  return getOrMigrateScopedBoolean(baseKey);
}

export function getAccountScopedString(baseKey: string): string | undefined {
  return getOrMigrateScopedString(baseKey);
}

export function getAccountScopedNumber(baseKey: string): number | undefined {
  return getOrMigrateScopedNumber(baseKey);
}

export function setAccountScopedValue(
  baseKey: string,
  value: ScopedSettingValue,
): void {
  KeyStore.set(makeAccountScopedSettingKey(baseKey), value);
}

export function deleteAccountScopedValue(baseKey: string): void {
  KeyStore.delete(makeAccountScopedSettingKey(baseKey));
}
