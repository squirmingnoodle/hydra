import { createContext } from "react";
import {
  useAccountScopedMMKVBoolean,
  useAccountScopedMMKVString,
} from "../../utils/accountScopedSettings";

const initialValues = {
  showUsername: true,
  hideTabsOnScroll: false,
  liquidGlassEnabled: true,
  modernAccountViewEnabled: false,
  modernAccountViewAutoDisabled: false,
  modernAccountViewLastCrashReason: "",
};

const initialTabSettingsContext = {
  ...initialValues,
  toggleShowUsername: (_newValue?: boolean) => {},
  toggleHideTabsOnScroll: (_newValue?: boolean) => {},
  toggleLiquidGlassEnabled: (_newValue?: boolean) => {},
  toggleModernAccountViewEnabled: (_newValue?: boolean) => {},
  setModernAccountViewAutoDisabled: (_newValue?: boolean) => {},
  setModernAccountViewLastCrashReason: (_newValue?: string) => {},
};

export const TabSettingsContext = createContext(initialTabSettingsContext);

export function TabSettingsProvider({ children }: React.PropsWithChildren) {
  const [storedShowUsername, setShowUsername] =
    useAccountScopedMMKVBoolean("showUsername");
  const showUsername = storedShowUsername ?? initialValues.showUsername;

  const [storedHideTabsOnScroll, setHideTabsOnScroll] =
    useAccountScopedMMKVBoolean("hideTabsOnScroll");
  const hideTabsOnScroll =
    storedHideTabsOnScroll ?? initialValues.hideTabsOnScroll;

  const [storedLiquidGlassEnabled, setLiquidGlassEnabled] =
    useAccountScopedMMKVBoolean("liquidGlassEnabled");
  const liquidGlassEnabled =
    storedLiquidGlassEnabled ?? initialValues.liquidGlassEnabled;

  const [storedModernAccountViewEnabled, setModernAccountViewEnabled] =
    useAccountScopedMMKVBoolean("modernAccountViewEnabled");
  const modernAccountViewEnabled =
    storedModernAccountViewEnabled ?? initialValues.modernAccountViewEnabled;

  const [
    storedModernAccountViewAutoDisabled,
    setModernAccountViewAutoDisabled,
  ] = useAccountScopedMMKVBoolean("modernAccountViewAutoDisabled");
  const modernAccountViewAutoDisabled =
    storedModernAccountViewAutoDisabled ??
    initialValues.modernAccountViewAutoDisabled;

  const [
    storedModernAccountViewLastCrashReason,
    setModernAccountViewLastCrashReason,
  ] = useAccountScopedMMKVString("modernAccountViewLastCrashReason");
  const modernAccountViewLastCrashReason =
    storedModernAccountViewLastCrashReason ??
    initialValues.modernAccountViewLastCrashReason;

  return (
    <TabSettingsContext.Provider
      value={{
        showUsername: showUsername ?? initialValues.showUsername,
        toggleShowUsername: (newValue = !showUsername) =>
          setShowUsername(newValue),
        hideTabsOnScroll,
        toggleHideTabsOnScroll: (newValue = !hideTabsOnScroll) =>
          setHideTabsOnScroll(newValue),
        liquidGlassEnabled,
        toggleLiquidGlassEnabled: (newValue = !liquidGlassEnabled) =>
          setLiquidGlassEnabled(newValue),
        modernAccountViewEnabled,
        toggleModernAccountViewEnabled: (
          newValue = !modernAccountViewEnabled,
        ) => {
          if (newValue) {
            setModernAccountViewAutoDisabled(false);
            setModernAccountViewLastCrashReason("");
          }
          setModernAccountViewEnabled(newValue);
        },
        modernAccountViewAutoDisabled,
        setModernAccountViewAutoDisabled: (
          newValue = !modernAccountViewAutoDisabled,
        ) => setModernAccountViewAutoDisabled(newValue),
        modernAccountViewLastCrashReason,
        setModernAccountViewLastCrashReason: (newValue = "") =>
          setModernAccountViewLastCrashReason(newValue),
      }}
    >
      {children}
    </TabSettingsContext.Provider>
  );
}
