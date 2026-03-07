import {
  Animated,
  GestureResponderEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, {
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ThemeContext } from "./SettingsContexts/ThemeContext";
import { AntDesign, Feather } from "@expo/vector-icons";
import { ScrollToNextButtonContext } from "./ScrollToNextButtonContext";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { TAB_BAR_REMOVED_PADDING_BOTTOM } from "../constants/TabBarPadding";
import { useAccountScopedMMKVString } from "../utils/accountScopedSettings";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CommentFilterMode,
  COMMENT_FILTER_MODES,
} from "../utils/commentFilters";

const BUTTON_SIZE = 40;
const PARENT_BUTTON_SIZE = 32;
const PARENT_BUTTON_GAP = 8;
const EDGE_PADDING = 20;
const FILTER_CHIP_SIZE = 28;
const FILTER_CHIP_GAP = 6;

// Total height of items stacked above the main button in the cluster
const CHIPS_HEIGHT =
  COMMENT_FILTER_MODES.length * (FILTER_CHIP_SIZE + FILTER_CHIP_GAP);
const ABOVE_MAIN_BUTTON =
  CHIPS_HEIGHT + PARENT_BUTTON_SIZE + PARENT_BUTTON_GAP;

export default function ScrollToNextButtonProvider({
  children,
}: PropsWithChildren) {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const tabBarHeightFromContext = useContext(BottomTabBarHeightContext);
  const tabBarHeight =
    tabBarHeightFromContext ??
    (Platform.OS === "ios" ? insets.bottom + 49 : insets.bottom + 56);

  const scrollToNext = useRef<(() => void) | null>(null);
  const scrollToPrevious = useRef<(() => void) | null>(null);
  const scrollToParent = useRef<(() => void) | null>(null);
  const [commentFilterMode, setCommentFilterMode] =
    useState<CommentFilterMode>("all");
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerVerticalOffset, setContainerVerticalOffset] = useState(0);
  const [containerHorizontalOffset, setContainerHorizontalOffset] =
    useState(0);

  const LOCKED_POSITIONS = useMemo(
    () => ({
      "bottom-right": {
        x: containerWidth - BUTTON_SIZE - EDGE_PADDING,
        y: containerHeight - BUTTON_SIZE - EDGE_PADDING,
      },
      "top-right": {
        x: containerWidth - BUTTON_SIZE - EDGE_PADDING,
        y: EDGE_PADDING,
      },
      "bottom-left": {
        x: EDGE_PADDING,
        y: containerHeight - BUTTON_SIZE - EDGE_PADDING,
      },
      "top-left": {
        x: EDGE_PADDING,
        y: EDGE_PADDING,
      },
      "bottom-center": {
        x: containerWidth / 2 - BUTTON_SIZE / 2,
        y: containerHeight - BUTTON_SIZE - EDGE_PADDING,
      },
      "top-center": {
        x: containerWidth / 2 - BUTTON_SIZE / 2,
        y: EDGE_PADDING,
      },
      "left-center": {
        x: EDGE_PADDING,
        y: containerHeight / 2 - BUTTON_SIZE / 2,
      },
      "right-center": {
        x: containerWidth - BUTTON_SIZE - EDGE_PADDING,
        y: containerHeight / 2 - BUTTON_SIZE / 2,
      },
      "left-three-quarters-bottom": {
        x: EDGE_PADDING,
        y: (containerHeight * 3) / 4 - BUTTON_SIZE,
      },
      "right-three-quarters-bottom": {
        x: containerWidth - BUTTON_SIZE - EDGE_PADDING,
        y: (containerHeight * 3) / 4 - BUTTON_SIZE,
      },
    }),
    [containerWidth, containerHeight],
  );

  const [storedButtonPosition, setButtonPosition] = useAccountScopedMMKVString(
    "scrollToNextButtonPosition",
  );
  const buttonPosition = (storedButtonPosition ??
    "bottom-right") as keyof typeof LOCKED_POSITIONS;

  const position = useRef(new Animated.ValueXY()).current;
  const touchStartedTime = useRef<number | null>(null);
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const inMoveMode = useRef(false);

  const scrollToPreviousTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const startDragTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeouts = () => {
    if (scrollToPreviousTimeout.current) {
      clearTimeout(scrollToPreviousTimeout.current);
    }
    if (startDragTimeout.current) {
      clearTimeout(startDragTimeout.current);
    }
  };

  const getButtonOffsetPosition = (e: GestureResponderEvent) => {
    return {
      x: e.nativeEvent.pageX - BUTTON_SIZE / 2 - containerHorizontalOffset,
      y: e.nativeEvent.pageY - BUTTON_SIZE / 2 - 30 - containerVerticalOffset,
    };
  };

  const getHoveredLockedPosition = (btnPosition: { x: number; y: number }) => {
    for (const [positionName, lockedPosition] of Object.entries(
      LOCKED_POSITIONS,
    )) {
      const distance = Math.sqrt(
        (btnPosition.x - lockedPosition.x) ** 2 +
          (btnPosition.y - lockedPosition.y) ** 2,
      );
      if (distance < BUTTON_SIZE) {
        return {
          positionName,
          position: lockedPosition,
        };
      }
    }
  };

  const startDrag = () => {
    clearTimeouts();
    inMoveMode.current = true;
    overlayOpacity.setValue(0);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    position.setValue(LOCKED_POSITIONS[buttonPosition]);
  }, [containerHeight, containerWidth]);

  const value = useMemo(
    () => ({
      setScrollToNext: (fn: () => void) => {
        scrollToNext.current = fn;
      },
      setScrollToPrevious: (fn: () => void) => {
        scrollToPrevious.current = fn;
      },
      setScrollToParent: (fn: () => void) => {
        scrollToParent.current = fn;
      },
      commentFilterMode,
      setCommentFilterMode,
    }),
    [commentFilterMode],
  );

  return (
    <ScrollToNextButtonContext.Provider value={value}>
      <View style={styles.rootContainer}>
        {children}
        {/* Drag mode overlay - shows locked position indicators */}
        <Animated.View
          style={[
            styles.dragOverlay,
            {
              opacity: overlayOpacity,
              bottom: tabBarHeight - TAB_BAR_REMOVED_PADDING_BOTTOM,
            },
          ]}
          pointerEvents="none"
        >
          {Object.entries(LOCKED_POSITIONS).map(([key, lockedPosition]) => (
            <View
              key={key}
              style={[
                styles.lockedPosition,
                {
                  left: lockedPosition.x,
                  top: lockedPosition.y,
                  borderColor: theme.buttonBg,
                },
              ]}
            />
          ))}
        </Animated.View>
        {/* Invisible measurement layer to get the available area dimensions */}
        <View
          style={[
            styles.measureLayer,
            { bottom: tabBarHeight - TAB_BAR_REMOVED_PADDING_BOTTOM },
          ]}
          pointerEvents="none"
          onLayout={(event) => {
            event.target.measure((_x, _y, width, height, pageX, pageY) => {
              setContainerVerticalOffset(pageY);
              setContainerHorizontalOffset(pageX);
              setContainerHeight(height);
              setContainerWidth(width);
            });
          }}
        />
        {/* Button cluster: single Animated.View that holds all buttons in a vertical
            column layout. The container translates so the main button (last child)
            ends up at position.x/y. Regular TouchableOpacity inside works because
            they participate in normal layout flow within the cluster. */}
        {containerHeight > 0 && containerWidth > 0 && (
          <Animated.View
            style={[
              styles.buttonCluster,
              {
                opacity: buttonOpacity,
                transform: [
                  { translateX: position.x },
                  {
                    translateY: Animated.add(
                      position.y,
                      -ABOVE_MAIN_BUTTON,
                    ),
                  },
                ],
              },
            ]}
            pointerEvents="box-none"
          >
            {/* Comment filter chips - vertically stacked */}
            {COMMENT_FILTER_MODES.map((mode) => {
              const isActive = commentFilterMode === mode.key;
              return (
                <TouchableOpacity
                  key={mode.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive
                        ? theme.iconOrTextButton
                        : theme.buttonBg,
                    },
                  ]}
                  onPress={() => {
                    setCommentFilterMode(
                      commentFilterMode === mode.key ? "all" : mode.key,
                    );
                  }}
                  activeOpacity={0.6}
                >
                  {mode.key === "op" ? (
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#fff" : theme.buttonText },
                      ]}
                    >
                      OP
                    </Text>
                  ) : (
                    <Feather
                      name={mode.icon as any}
                      size={13}
                      color={isActive ? "#fff" : theme.buttonText}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
            {/* Go to parent comment button */}
            <TouchableOpacity
              style={[
                styles.parentButton,
                { backgroundColor: theme.buttonBg },
              ]}
              onPress={() => scrollToParent.current?.()}
              activeOpacity={0.6}
            >
              <AntDesign name="up" size={14} color={theme.buttonText} />
            </TouchableOpacity>
            {/* Spacer between parent and main button */}
            <View style={{ height: PARENT_BUTTON_GAP }} />
            {/* Main scroll-to-next button with drag support.
                Uses responder system so drag/tap/long-press all work. */}
            <View
              style={[
                styles.mainButton,
                { backgroundColor: theme.buttonBg },
              ]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={() => {
                touchStartedTime.current = Date.now();
                buttonOpacity.setValue(0.7);
                scrollToPreviousTimeout.current = setTimeout(() => {
                  scrollToPrevious.current?.();
                }, 300);
                startDragTimeout.current = setTimeout(() => {
                  startDrag();
                }, 1000);
              }}
              onResponderMove={(event) => {
                if (!inMoveMode.current) {
                  const distance = Math.sqrt(
                    event.nativeEvent.locationX ** 2 +
                      event.nativeEvent.locationY ** 2,
                  );
                  if (distance > 30) {
                    startDrag();
                  }
                }
                if (inMoveMode.current) {
                  const btnPosition = getButtonOffsetPosition(event);
                  const hoveredLockedPosition =
                    getHoveredLockedPosition(btnPosition);
                  if (hoveredLockedPosition) {
                    position.setValue(hoveredLockedPosition.position);
                    return;
                  }
                  position.setValue(btnPosition);
                }
              }}
              onResponderRelease={(e) => {
                buttonOpacity.setValue(1);
                if (inMoveMode.current) {
                  const hoveredLockedPosition = getHoveredLockedPosition(
                    getButtonOffsetPosition(e),
                  );
                  if (hoveredLockedPosition) {
                    setButtonPosition(hoveredLockedPosition.positionName);
                  } else {
                    Animated.spring(position, {
                      toValue: LOCKED_POSITIONS[buttonPosition],
                      useNativeDriver: true,
                    }).start();
                  }
                  inMoveMode.current = false;
                  overlayOpacity.setValue(0);
                }
                if (!touchStartedTime.current) return;
                const delay = Date.now() - touchStartedTime.current;
                if (touchStartedTime.current && delay < 300) {
                  clearTimeouts();
                  scrollToNext.current?.();
                }
                if (startDragTimeout.current && delay < 1000) {
                  clearTimeouts();
                }
              }}
            >
              <AntDesign name="down" size={18} color={theme.buttonText} />
            </View>
          </Animated.View>
        )}
      </View>
    </ScrollToNextButtonContext.Provider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  mainButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 1000,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignSelf: "center",
  },
  parentButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 1000,
    width: PARENT_BUTTON_SIZE,
    height: PARENT_BUTTON_SIZE,
    alignSelf: "center",
  },
  dragOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  measureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  buttonCluster: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    width: BUTTON_SIZE,
  },
  lockedPosition: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 1000,
    borderWidth: 2,
  },
  filterChip: {
    width: FILTER_CHIP_SIZE,
    height: FILTER_CHIP_SIZE,
    borderRadius: FILTER_CHIP_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: FILTER_CHIP_GAP,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
