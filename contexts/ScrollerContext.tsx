import { createContext, useMemo, useState } from "react";

const initialScrollerContext = {
  scrollDisabled: false,
  setScrollDisabled: (_: boolean) => {},
};

export const ScrollerContext = createContext(initialScrollerContext);

export function ScrollerProvider({ children }: React.PropsWithChildren) {
  const [scrollDisabled, setScrollDisabled] = useState(
    initialScrollerContext.scrollDisabled,
  );

  const value = useMemo(
    () => ({
      scrollDisabled,
      setScrollDisabled,
    }),
    [scrollDisabled],
  );

  return (
    <ScrollerContext.Provider value={value}>
      {children}
    </ScrollerContext.Provider>
  );
}
