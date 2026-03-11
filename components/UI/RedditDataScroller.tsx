import { FlashList, FlashListProps } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  View,
  ColorValue,
  Platform,
} from "react-native";

import { RedditDataObject } from "../../api/RedditApi";
import {
  ScrollerContext,
  ScrollerProvider,
} from "../../contexts/ScrollerContext";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";
import { TabSettingsContext } from "../../contexts/SettingsContexts/TabSettingsContext";
import { TabScrollContext } from "../../contexts/TabScrollContext";
import { modifyStat, Stat } from "../../db/functions/Stats";
import KeyStore from "../../utils/KeyStore";
import { PostSkeletonList } from "./SkeletonLoader";

/**
 * Future note for when I'm an idiot and the scroller gets all glitchy again.
 * None of the components rendered by the scroller should create a new state
 * from the data passed into them. For example, adding something like this to
 * the PostComponent would cause the scroller to glitch. Let the parent that
 * wraps the scroller handle data modifications. State changes can be issued
 * to the parent.
 *
 * const [post, setPost] = useState(initialPostState); // BAD
 *
 * Also, elements rendered by the scroller should not change their height or
 * everything gets fucked.
 */

type OverridableFlashListProps<T> = Omit<
  FlashListProps<T>,
  "data" | "getItem" | "getItemCount"
>;

type RedditDataScrollerProps<T> = OverridableFlashListProps<T> & {
  scrollViewRef?: React.RefObject<typeof FlashList<T>>;
  showInitialLoader?: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  data: T[];
  fullyLoaded: boolean;
  hitFilterLimit: boolean;
  persistScrollKey?: string;
};

function RedditDataScroller<T extends RedditDataObject>(
  props: RedditDataScrollerProps<T>,
) {
  const { theme } = useContext(ThemeContext);
  const { liquidGlassEnabled } = useContext(TabSettingsContext);
  const { scrollDisabled } = useContext(ScrollerContext);
  const { handleScrollForTabBar } = useContext(TabScrollContext);
  const shouldUseSystemContentInsets =
    Platform.OS === "ios" && liquidGlassEnabled;

  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(
    props.showInitialLoader ?? true,
  );

  const lastScrollPosition = useRef(0);
  const accumulatedScroll = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isLoadingRef = useRef(false);

  // Scroll position persistence
  const scrollPersistKey = props.persistScrollKey
    ? `scrollPos:${props.persistScrollKey}`
    : null;
  const scrollPersistTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollRestoreTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tintColorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasRestoredScroll = useRef(false);
  const listRef = useRef<any>(null);

  const flushScrollStat = useCallback(() => {
    if (accumulatedScroll.current > 0) {
      modifyStat(Stat.SCROLL_DISTANCE, accumulatedScroll.current);
      accumulatedScroll.current = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(flushTimer.current);
      clearTimeout(scrollPersistTimer.current);
      clearTimeout(scrollRestoreTimer.current);
      clearTimeout(tintColorTimer.current);
      flushScrollStat();
    };
  }, []);

  // Restore scroll position when data first loads
  useEffect(() => {
    if (
      !hasRestoredScroll.current &&
      scrollPersistKey &&
      props.data.length > 0
    ) {
      hasRestoredScroll.current = true;
      const savedOffset = KeyStore.getNumber(scrollPersistKey);
      if (savedOffset && savedOffset > 0) {
        // Small delay to let FlashList finish layout
        scrollRestoreTimer.current = setTimeout(() => {
          listRef.current?.scrollToOffset({
            offset: savedOffset,
            animated: false,
          });
        }, 100);
      }
    }
  }, [props.data.length]);

  const loadMoreData = async (refresh = false) => {
    if (props.fullyLoaded && !refresh) return;
    if (isLoadingRef.current && !refresh) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);
    try {
      if (refresh) {
        await props.refresh();
        setRefreshing(false);
      } else {
        await props.loadMore();
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  /**
   * The tintColor prop on the RefreshControl component is broken in React Native 0.81.5.
   * This is a workaround to fix the bug. Same fix is used in the PostDetails component.
   * https://github.com/facebook/react-native/issues/53987
   */
  const [refreshControlColor, setRefreshControlColor] = useState<ColorValue>();
  useEffect(() => {
    tintColorTimer.current = setTimeout(() => {
      setRefreshControlColor(theme.text);
    }, 500);
  }, []);

  const contentInsetAdjustmentBehavior =
    props.contentInsetAdjustmentBehavior ??
    (shouldUseSystemContentInsets ? "automatic" : undefined);
  const automaticallyAdjustContentInsets =
    props.automaticallyAdjustContentInsets ??
    (shouldUseSystemContentInsets ? true : undefined);

  return (
    <FlashList<T>
      {...props}
      ref={listRef}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      automaticallyAdjustContentInsets={automaticallyAdjustContentInsets}
      scrollEnabled={!scrollDisabled}
      indicatorStyle={theme.systemModeStyle === "dark" ? "white" : "black"}
      refreshControl={
        <RefreshControl
          tintColor={refreshControlColor}
          refreshing={refreshing}
          onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setRefreshing(true);
            if (scrollPersistKey) {
              KeyStore.delete(scrollPersistKey);
              hasRestoredScroll.current = true; // Don't restore after refresh
            }
            loadMoreData(true);
          }}
        />
      }
      scrollEventThrottle={100}
      onScroll={(e) => {
        handleScrollForTabBar(e);
        const scrollPosition = e.nativeEvent.contentOffset.y;
        accumulatedScroll.current += Math.abs(
          scrollPosition - lastScrollPosition.current,
        );
        lastScrollPosition.current = scrollPosition;
        clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(flushScrollStat, 2000);
        // Debounce scroll position persistence
        if (scrollPersistKey) {
          clearTimeout(scrollPersistTimer.current);
          scrollPersistTimer.current = setTimeout(() => {
            KeyStore.set(scrollPersistKey, scrollPosition);
          }, 500);
        }
      }}
      onEndReachedThreshold={2}
      onEndReached={() => {
        loadMoreData();
      }}
      data={props.data}
      keyExtractor={(item, index) => {
        const keyType = (item as Partial<RedditDataObject> | undefined)?.type;
        const keyId = (item as Partial<RedditDataObject> | undefined)?.id;
        return `${keyType ?? "unknown"}-${keyId ?? index}`;
      }}
      ListFooterComponent={
        isLoadingMore && props.data.length === 0 ? (
          <PostSkeletonList count={6} />
        ) : (
          <View style={styles.endOfListContainer}>
            {isLoadingMore && <ActivityIndicator size="small" />}
            {!isLoadingMore && props.fullyLoaded && !!props.data.length && (
              <Text
                style={[
                  styles.endOfListText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {`You've reached the end`}
              </Text>
            )}
            {!isLoadingMore &&
              props.fullyLoaded &&
              props.data.length === 0 &&
              !props.hitFilterLimit && (
                <Text
                  style={[
                    styles.endOfListText,
                    {
                      color: theme.subtleText,
                    },
                  ]}
                >
                  Nothing to show here
                </Text>
              )}
            {!isLoadingMore && props.hitFilterLimit && (
              <Text
                style={[
                  styles.endOfListText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                Filter limit reached. Try adjusting your filters in Settings to
                see more content.
              </Text>
            )}
          </View>
        )
      }
    />
  );
}

export default function WrappedScroller<T extends RedditDataObject>(
  props: RedditDataScrollerProps<T>,
) {
  return (
    <ScrollerProvider>
      <RedditDataScroller<T> {...props} />
    </ScrollerProvider>
  );
}

const styles = StyleSheet.create({
  endOfListContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 75,
  },
  endOfListText: {
    fontSize: 14,
    marginHorizontal: 10,
  },
});
