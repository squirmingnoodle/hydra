import { useEvent, useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useMemo, useRef, useState, useContext } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ImageViewer from "./ImageViewer";
import { PostInteractionContext } from "../../../../../contexts/PostInteractionContext";
import { DataModeContext } from "../../../../../contexts/SettingsContexts/DataModeContext";
import { ThemeContext } from "../../../../../contexts/SettingsContexts/ThemeContext";
import useMediaSharing from "../../../../../utils/useMediaSharing";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import { PostSettingsContext } from "../../../../../contexts/SettingsContexts/PostSettingsContext";
import { TabSettingsContext } from "../../../../../contexts/SettingsContexts/TabSettingsContext";
import DismountWhenBackgrounded from "../../../../Other/DismountWhenBackgrounded";
import VideoCache from "../../../../../utils/VideoCache";

type VideoPlayerProps = {
  source: string;
  thumbnail: string;
  videoDownloadURL?: string;
  straightToFullscreen?: boolean;
  exitedFullScreenCallback?: () => void;
  aspectRatio?: number;
  subreddit?: string;
};

// Match the image viewer's swipe-to-close thresholds
const SWIPE_CLOSE_OFFSET = 50;
const SWIPE_CLOSE_VELOCITY = 1.55;

/**
 * Separate fullscreen component with its own independent player.
 * Uses a separate useVideoPlayer so there's no shared-player event interference.
 * Supports swipe-to-dismiss matching the image viewer behavior.
 */
function FullscreenVideoModal({
  source,
  onClose,
}: {
  source: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const videoSource = useMemo(
    () => VideoCache.makeCachedVideoSource(source),
    [source],
  );
  const player = useVideoPlayer(videoSource, (p) => {
    p.volume = 1;
    p.loop = true;
    p.play();
  });

  const isPlaying = useEvent(player, "playingChange")?.isPlaying;

  // Swipe-to-dismiss animation values
  const dragY = useRef(new Animated.Value(0)).current;

  const backgroundOpacity = dragY.interpolate({
    inputRange: [
      -SWIPE_CLOSE_OFFSET,
      -SWIPE_CLOSE_OFFSET / 2,
      0,
      SWIPE_CLOSE_OFFSET / 2,
      SWIPE_CLOSE_OFFSET,
    ],
    outputRange: [0.85, 1, 1, 1, 0.85],
  });

  const videoScale = dragY.interpolate({
    inputRange: [
      -SWIPE_CLOSE_OFFSET * 2,
      -SWIPE_CLOSE_OFFSET,
      0,
      SWIPE_CLOSE_OFFSET,
      SWIPE_CLOSE_OFFSET * 2,
    ],
    outputRange: [0.75, 1, 1, 1, 0.75],
  });

  // Use refs for values needed in PanResponder callbacks
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const screenHeightRef = useRef(screenHeight);
  screenHeightRef.current = screenHeight;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        // Only capture vertical drags
        return (
          Math.abs(gs.dy) > 15 &&
          Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5
        );
      },
      onPanResponderMove: (_, gs) => {
        dragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (
          Math.abs(gs.dy) > SWIPE_CLOSE_OFFSET ||
          Math.abs(gs.vy) > SWIPE_CLOSE_VELOCITY
        ) {
          // Dismiss: animate off screen then close
          Animated.timing(dragY, {
            toValue: gs.dy > 0 ? screenHeightRef.current : -screenHeightRef.current,
            duration: 200,
            useNativeDriver: false,
          }).start(() => onCloseRef.current());
        } else {
          // Snap back
          Animated.spring(dragY, {
            toValue: 0,
            bounciness: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.modalContainer, { opacity: backgroundOpacity }]}
      >
        <Animated.View
          style={[
            styles.modalVideo,
            { transform: [{ translateY: dragY }, { scale: videoScale }] },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (isPlaying) {
                player.pause();
              } else {
                player.play();
              }
            }}
          >
            <VideoView
              player={player}
              style={styles.modalVideo}
              nativeControls={false}
              contentFit="contain"
            />
          </TouchableWithoutFeedback>
        </Animated.View>
        <TouchableOpacity
          style={[styles.modalCloseButton, { top: insets.top + 10 }]}
          onPress={onClose}
        >
          <FontAwesome6 name="xmark" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

function VideoPlayer({
  source,
  thumbnail,
  videoDownloadURL,
  straightToFullscreen,
  exitedFullScreenCallback,
  aspectRatio,
  subreddit,
}: VideoPlayerProps) {
  const { theme } = useContext(ThemeContext);
  const { currentDataMode } = useContext(DataModeContext);
  const { autoPlayVideos } = useContext(PostSettingsContext);
  const { interactedWithPost } = useContext(PostInteractionContext);
  const { liquidGlassEnabled } = useContext(TabSettingsContext);
  const shareMedia = useMediaSharing();
  const { width, height } = useWindowDimensions();

  const useModalFullscreen = Platform.OS === "ios" && liquidGlassEnabled;
  const [showModalFullscreen, setShowModalFullscreen] = useState(false);
  const hasOpenedStraightToFullscreen = useRef(false);

  const [dontRenderYet, setDontRenderYet] = useState(
    currentDataMode === "lowData",
  );
  const [failedToLoadErr, setFailedToLoadErr] = useState<string | null>(null);

  // Memoize the source object to prevent useVideoPlayer from seeing a "new" source
  // on every render (VideoCache.makeCachedVideoSource creates a new object each call).
  // Without this, sourceChange fires on every re-render, closing the modal immediately.
  const videoSource = useMemo(
    () => VideoCache.makeCachedVideoSource(source),
    [source],
  );

  const player = useVideoPlayer(videoSource, (player) => {
    player.audioMixingMode = "mixWithOthers";
    player.volume = 0;
    player.loop = true;
    player.timeUpdateEventInterval = 1 / 60;
    if (autoPlayVideos) {
      player.play();
    }
  });

  const closeModalFullscreen = () => {
    setShowModalFullscreen(false);
    exitedFullScreenCallback?.();
    if (autoPlayVideos) {
      player.play();
    }
  };

  const isPlaying = useEvent(player, "playingChange")?.isPlaying;

  useEventListener(player, "sourceChange", () => {
    player.volume = 0;
    // Component was recycled by FlashList. Need to reset state.
    // https://shopify.github.io/flash-list/docs/recycling
    setDontRenderYet(currentDataMode === "lowData");
    setFailedToLoadErr(null);
    setShowModalFullscreen(false);
    hasOpenedStraightToFullscreen.current = false;
  });

  useEventListener(player, "timeUpdate", (e) => {
    progress.setValue(e.currentTime / player.duration);
  });

  useEventListener(player, "statusChange", (e) => {
    if (e.error) {
      setFailedToLoadErr(e.error.message);
    } else if (e.status === "readyToPlay") {
      if (straightToFullscreen && !hasOpenedStraightToFullscreen.current) {
        hasOpenedStraightToFullscreen.current = true;
        if (useModalFullscreen) {
          player.pause();
          setShowModalFullscreen(true);
        } else {
          video.current?.enterFullscreen();
        }
      }
      if (autoPlayVideos) {
        player.play();
      }
    }
  });

  const videoRatio = aspectRatio ?? 1;
  const videoHeight = width / videoRatio;

  const video = useRef<VideoView>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const progressPercent = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.videoPlayerContainer,
        {
          height: videoHeight,
        },
      ]}
    >
      {dontRenderYet ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.imgContainer,
            {
              height: videoHeight,
            },
          ]}
          onPress={() => setDontRenderYet(false)}
        >
          {/* Have to put an invisible layer on top of the ImageViewer to keep it from stealing clicks */}
          <View style={styles.invisibleLayer} />
          <ImageViewer images={[thumbnail]} subreddit={subreddit} />
          <View
            style={[
              styles.isVideoContainer,
              {
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text
              style={[
                styles.isVideoText,
                {
                  color: theme.text,
                },
              ]}
            >
              VIDEO
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableWithoutFeedback
            onPress={() => {
              interactedWithPost();
              if (useModalFullscreen) {
                player.pause();
                setShowModalFullscreen(true);
              } else {
                video.current?.enterFullscreen();
                player.play();
              }
            }}
            onLongPress={() => {
              return videoDownloadURL
                ? shareMedia("video", videoDownloadURL, { subreddit })
                : null;
            }}
          >
            {failedToLoadErr ? (
              <View
                style={[
                  styles.video,
                  {
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.videoError,
                    {
                      color: theme.subtleText,
                    },
                  ]}
                >
                  Failed to load video: {failedToLoadErr}
                </Text>
              </View>
            ) : (
              <View style={styles.videoContainer}>
                {!isPlaying && !showModalFullscreen && (
                  <View style={styles.playButtonContainer}>
                    <FontAwesome
                      name="play-circle"
                      size={50}
                      color={theme.text}
                    />
                  </View>
                )}
                <VideoView
                  ref={(videoRef) => {
                    video.current = videoRef;
                  }}
                  player={player}
                  style={styles.video}
                  nativeControls={false}
                  contentFit="contain"
                  onFullscreenEnter={() => {
                    player.volume = 1;
                  }}
                  onFullscreenExit={() => {
                    player.volume = 0;
                    exitedFullScreenCallback?.();
                    if (autoPlayVideos) {
                      player.play();
                    } else {
                      player.pause();
                    }
                  }}
                  onPictureInPictureStop={() => {
                    player.volume = 0;
                    exitedFullScreenCallback?.();
                  }}
                  onPictureInPictureStart={() => {
                    setTimeout(() => {
                      player.volume = 1;
                    }, 750);
                  }}
                />
              </View>
            )}
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.progressContainer,
              {
                backgroundColor: theme.background,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.subtleText,
                  width: progressPercent,
                },
              ]}
            />
          </View>
        </>
      )}
      {showModalFullscreen && (
        <FullscreenVideoModal
          source={source}
          onClose={closeModalFullscreen}
        />
      )}
    </View>
  );
}

export default function VideoPlayerWrapper(props: VideoPlayerProps) {
  return (
    <DismountWhenBackgrounded>
      <VideoPlayer {...props} />
    </DismountWhenBackgrounded>
  );
}

const styles = StyleSheet.create({
  videoPlayerContainer: {
    flex: 1,
  },
  imgContainer: {
    marginVertical: 10,
  },
  invisibleLayer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  isVideoContainer: {
    position: "absolute",
    borderRadius: 5,
    overflow: "hidden",
    margin: 5,
    left: 0,
    bottom: 0,
    opacity: 0.6,
  },
  isVideoText: {
    padding: 5,
  },
  videoContainer: {
    flex: 1,
  },
  playButtonContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
    zIndex: 1,
  },
  video: {
    flex: 1,
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    height: 1,
  },
  progressBar: {
    flex: 1,
  },
  videoError: {
    marginHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  modalVideo: {
    flex: 1,
  },
  modalCloseButton: {
    position: "absolute",
    right: 10,
    backgroundColor: "rgba(100, 100, 100, 0.5)",
    padding: 10,
    borderRadius: 100,
    width: 40,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
