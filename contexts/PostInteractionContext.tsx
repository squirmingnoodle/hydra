import { createContext, useMemo } from "react";

const initialMediaViewerContext = {
  interactedWithPost: () => {},
};

export const PostInteractionContext = createContext(initialMediaViewerContext);

export function PostInteractionProvider({
  onPostInteraction,
  children,
}: React.PropsWithChildren<{
  onPostInteraction: () => void;
}>) {
  const value = useMemo(
    () => ({
      interactedWithPost: onPostInteraction,
    }),
    [onPostInteraction],
  );

  return (
    <PostInteractionContext.Provider value={value}>
      {children}
    </PostInteractionContext.Provider>
  );
}
