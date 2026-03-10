import { useEvent, useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useMemo, useRef, useState, useContext } from "react";
import {
  Animated,
  Modal,
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
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

  const touchState = useRef({
    x: 0,
    y: 0,
    direction: null as "vertical" | "horizontal" | null,
    videoTime: 0,
    wasPlaying: false,
  });

  const animationFrameRequest = useRef<number | null>(null);
  const pendingScrubTime = useRef<number | null>(null);

  const handleDismiss = (dy: number, vy: number) => {
    if (
      Math.abs(dy) > SWIPE_CLOSE_OFFSET ||
      Math.abs(vy) > SWIPE_CLOSE_VELOCITY
    ) {
      Animated.timing(dragY, {
        toValue: dy > 0 ? screenHeight : -screenHeight,
        duration: 200,
        useNativeDriver: false,
      }).start(() => onClose());
    } else {
      Animated.spring(dragY, {
        toValue: 0,
        bounciness: 5,
        useNativeDriver: false,
      }).start();
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <View
        style={styles.modalTouchBlocker}
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onTouchStart={(e) => {
          touchState.current = {
            x: e.nativeEvent.pageX,
            y: e.nativeEvent.pageY,
            direction: null,
            videoTime: player.currentTime,
            wasPlaying: player.playing,
          };
        }}
        onTouchMove={(e) => {
          const state = touchState.current;
          const dx = e.nativeEvent.pageX - state.x;
          const dy = e.nativeEvent.pageY - state.y;

          if (!state.direction) {
            if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 15) {
              state.direction = "vertical";
            } else if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 15) {
              state.direction = "horizontal";
              state.x += dx;
              state.y += dy;
              if (state.wasPlaying) {
                player.pause();
              }
            }
            return;
          }

          if (state.direction === "vertical") {
            dragY.setValue(dy);
          } else {
            const duration = player.duration;
            if (duration > 0) {
              const scrubDx = e.nativeEvent.pageX - state.x;
              // Scale so one full screen width = half the video duration for finer control
              const videoChange = scrubDx / (screenWidth / (duration * 0.5));
              const newTime = Math.max(
                0,
                Math.min(duration, state.videoTime + videoChange),
              );
              pendingScrubTime.current = newTime;
              if (animationFrameRequest.current) {
                cancelAnimationFrame(animationFrameRequest.current);
              }
              animationFrameRequest.current = requestAnimationFrame(() => {
                if (pendingScrubTime.current !== null) {
                  player.currentTime = pendingScrubTime.current;
                  pendingScrubTime.current = null;
                }
              });
            }
          }
        }}
        onTouchEnd={(e) => {
          if (animationFrameRequest.current) {
            cancelAnimationFrame(animationFrameRequest.current);
            animationFrameRequest.current = null;
          }
          // Apply any pending scrub time immediately on release
          if (pendingScrubTime.current !== null) {
            player.currentTime = pendingScrubTime.current;
            pendingScrubTime.current = null;
          }

          const state = touchState.current;
          const dy = e.nativeEvent.pageY - state.y;

          if (!state.direction) {
            if (player.playing) {
              player.pause();
            } else {
              player.play();
            }
          } else if (state.direction === "vertical") {
            handleDismiss(dy, 0);
          } else if (state.direction === "horizontal") {
            if (state.wasPlaying) {
              player.play();
            }
          }

          touchState.current = {
            x: 0,
            y: 0,
            direction: null,
            videoTime: 0,
            wasPlaying: false,
          };
        }}
      >
        <Animated.View
          style={[styles.modalContainer, { opacity: backgroundOpacity }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.modalVideo,
              { transform: [{ translateY: dragY }, { scale: videoScale }] },
            ]}
          >
            <VideoView
              player={player}
              style={styles.modalVideo}
              nativeControls={false}
              contentFit="contain"
            />
          </Animated.View>
        </Animated.View>
        <TouchableOpacity
          style={[styles.modalCloseButton, { top: insets.top + 10 }]}
          onPress={onClose}
        >
          <FontAwesome6 name="xmark" size={20} color="white" />
        </TouchableOpacity>
      </View>
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
  modalTouchBlocker: {
    flex: 1,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
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
