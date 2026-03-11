import { createContext, useMemo } from "react";

const initialFeedMediaViewerContext = {
  openMediaViewer: (_postId: string, _itemIndex?: number) => {},
  isAvailable: false,
};

export const FeedMediaViewerContext = createContext(
  initialFeedMediaViewerContext,
);

export function FeedMediaViewerProvider({
  onOpenMediaViewer,
  children,
}: React.PropsWithChildren<{
  onOpenMediaViewer: (postId: string, itemIndex?: number) => void;
}>) {
  const value = useMemo(
    () => ({
      openMediaViewer: onOpenMediaViewer,
      isAvailable: true,
    }),
    [onOpenMediaViewer],
  );

  return (
    <FeedMediaViewerContext.Provider value={value}>
      {children}
    </FeedMediaViewerContext.Provider>
  );
}
