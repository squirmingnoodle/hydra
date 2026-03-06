import { Feather } from "@expo/vector-icons";
import React, { useContext, useEffect, useState } from "react";
import { ColorValue, StyleSheet, Switch, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

import List from "../../components/UI/List";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import {
  AppLockContext,
  LockTimeout,
  TIMEOUT_LABELS,
} from "../../contexts/AppLockContext";

const TIMEOUT_OPTIONS: LockTimeout[] = [
  "immediate",
  "1min",
  "5min",
  "15min",
];

export default function Security() {
  const { theme } = useContext(ThemeContext);
  const { lockEnabled, lockTimeout, setLockEnabled, setLockTimeout } =
    useContext(AppLockContext);

  const [biometricType, setBiometricType] = useState<string>("Biometrics");

  useEffect(() => {
    (async () => {
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        )
      ) {
        setBiometricType("Face ID");
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        setBiometricType("Touch ID");
      }
    })();
  }, []);

  const handleToggle = async () => {
    if (!lockEnabled) {
      // Verify biometric works before enabling
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        alert(
          `${biometricType} is not available. Please enable it in your device settings.`,
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType} Lock`,
        fallbackLabel: "Use Passcode",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        setLockEnabled(true);
      }
    } else {
      setLockEnabled(false);
    }
  };

  return (
    <>
      <List
        title="App Lock"
        items={[
          {
            key: "appLock",
            icon: <Feather name="shield" size={24} color={theme.text} />,
            text: `Require ${biometricType}`,
            onPress: handleToggle,
            rightIcon: (
              <Switch
                trackColor={{
                  false: theme.iconSecondary as ColorValue,
                  true: theme.iconPrimary as ColorValue,
                }}
                value={lockEnabled}
                onValueChange={handleToggle}
              />
            ),
          },
        ]}
      />
      <Text style={[styles.description, { color: theme.subtleText }]}>
        Require {biometricType} or your device passcode to open Hydra.
      </Text>

      {lockEnabled && (
        <List
          title="Auto-Lock"
          items={TIMEOUT_OPTIONS.map((timeout) => ({
            key: timeout,
            text: TIMEOUT_LABELS[timeout],
            onPress: () => setLockTimeout(timeout),
            rightIcon:
              lockTimeout === timeout ? (
                <Feather name="check" size={20} color={theme.iconPrimary} />
              ) : undefined,
          }))}
        />
      )}
      {lockEnabled && (
        <Text style={[styles.description, { color: theme.subtleText }]}>
          How long after leaving the app before the lock activates.
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  description: {
    marginHorizontal: 15,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});
