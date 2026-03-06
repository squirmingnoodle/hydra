import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv";

const APP_LOCK_ENABLED_KEY = "appLockEnabled";
const APP_LOCK_TIMEOUT_KEY = "appLockTimeout";

export type LockTimeout = "immediate" | "1min" | "5min" | "15min";

const TIMEOUT_MS: Record<LockTimeout, number> = {
  immediate: 0,
  "1min": 60_000,
  "5min": 300_000,
  "15min": 900_000,
};

export const TIMEOUT_LABELS: Record<LockTimeout, string> = {
  immediate: "Immediately",
  "1min": "After 1 minute",
  "5min": "After 5 minutes",
  "15min": "After 15 minutes",
};

type AppLockContextType = {
  isLocked: boolean;
  lockEnabled: boolean;
  lockTimeout: LockTimeout;
  setLockEnabled: (enabled: boolean) => void;
  setLockTimeout: (timeout: LockTimeout) => void;
  unlock: () => Promise<boolean>;
};

export const AppLockContext = createContext<AppLockContextType>({
  isLocked: false,
  lockEnabled: false,
  lockTimeout: "immediate",
  setLockEnabled: () => {},
  setLockTimeout: () => {},
  unlock: async () => false,
});

export function AppLockProvider({ children }: PropsWithChildren) {
  const [storedEnabled, setStoredEnabled] = useMMKVBoolean(APP_LOCK_ENABLED_KEY);
  const [storedTimeout, setStoredTimeout] = useMMKVString(APP_LOCK_TIMEOUT_KEY);

  const lockEnabled = storedEnabled ?? false;
  const lockTimeout = (storedTimeout as LockTimeout) ?? "immediate";

  const [isLocked, setIsLocked] = useState(lockEnabled);
  const backgroundTimestamp = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Hydra",
        fallbackLabel: "Use Passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!lockEnabled) {
      setIsLocked(false);
      return;
    }

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundTimestamp.current = Date.now();
      } else if (nextState === "active") {
        if (backgroundTimestamp.current !== null) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          const timeoutMs = TIMEOUT_MS[lockTimeout];
          if (elapsed >= timeoutMs) {
            setIsLocked(true);
          }
          backgroundTimestamp.current = null;
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [lockEnabled, lockTimeout]);

  // Auto-authenticate on mount if locked
  useEffect(() => {
    if (isLocked && lockEnabled) {
      unlock();
    }
  }, [isLocked]);

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        lockEnabled,
        lockTimeout,
        setLockEnabled: (enabled: boolean) => {
          setStoredEnabled(enabled);
          if (!enabled) setIsLocked(false);
        },
        setLockTimeout: (timeout: LockTimeout) => setStoredTimeout(timeout),
        unlock,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}
