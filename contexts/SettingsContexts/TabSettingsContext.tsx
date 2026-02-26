import { createContext } from "react";
import { useAccountScopedMMKVBoolean } from "../../utils/accountScopedSettings";

const initialValues = {
  showUsername: true,
  hideTabsOnScroll: false,
  liquidGlassEnabled: true,
};

const initialTabSettingsContext = {
  ...initialValues,
  toggleShowUsername: (_newValue?: boolean) => {},
  toggleHideTabsOnScroll: (_newValue?: boolean) => {},
  toggleLiquidGlassEnabled: (_newValue?: boolean) => {},
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
      }}
    >
      {children}
    </TabSettingsContext.Provider>
  );
}
