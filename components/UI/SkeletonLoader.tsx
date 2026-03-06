import React, { useContext, useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View } from "react-native";
import { ThemeContext } from "../../contexts/SettingsContexts/ThemeContext";

function ShimmerBar({
  width,
  height = 12,
  borderRadius = 4,
}: {
  width: DimensionValue;
  height?: number;
  borderRadius?: number;
}) {
  const { theme } = useContext(ThemeContext);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.divider,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerHighlight,
          {
            backgroundColor: theme.tint,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export function PostSkeleton() {
  return (
    <View style={styles.postSkeleton}>
      <ShimmerBar width="85%" height={16} />
      <View style={styles.postSkeletonBody}>
        <ShimmerBar width="100%" height={120} borderRadius={8} />
      </View>
      <View style={styles.postSkeletonFooter}>
        <ShimmerBar width={80} height={12} />
        <ShimmerBar width={50} height={12} />
        <ShimmerBar width={50} height={12} />
        <ShimmerBar width={40} height={12} />
      </View>
    </View>
  );
}

export function CommentSkeleton({ depth = 0 }: { depth?: number }) {
  const { theme } = useContext(ThemeContext);

  return (
    <View
      style={[
        styles.commentSkeleton,
        {
          marginLeft: 10 * depth,
          borderTopColor: theme.divider,
          borderLeftWidth: depth === 0 ? 0 : 1,
          borderLeftColor:
            theme.commentDepthColors[
              (depth - 1) % theme.commentDepthColors.length
            ],
        },
      ]}
    >
      <View style={styles.commentSkeletonHeader}>
        <ShimmerBar width={70} height={12} />
        <ShimmerBar width={30} height={12} />
        <View style={{ flex: 1 }} />
        <ShimmerBar width={25} height={12} />
      </View>
      <View style={styles.commentSkeletonBody}>
        <ShimmerBar width="95%" height={10} />
        <ShimmerBar width="80%" height={10} />
        <ShimmerBar width="60%" height={10} />
      </View>
    </View>
  );
}

export function PostSkeletonList({ count = 3 }: { count?: number }) {
  const { theme } = useContext(ThemeContext);

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          <PostSkeleton />
          <View
            style={{ backgroundColor: theme.divider, height: 10 }}
          />
        </View>
      ))}
    </View>
  );
}

export function CommentSkeletonList({ count = 5 }: { count?: number }) {
  const depths = [0, 0, 1, 1, 2, 0, 1, 0, 1, 2];

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} depth={depths[i % depths.length]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: "hidden",
    opacity: 0.4,
  },
  shimmerHighlight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 200,
    opacity: 0.3,
  },
  postSkeleton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  postSkeletonBody: {
    marginTop: 4,
  },
  postSkeletonFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  commentSkeleton: {
    paddingVertical: 10,
    paddingLeft: 15,
    paddingRight: 10,
    borderTopWidth: 1,
  },
  commentSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  commentSkeletonBody: {
    gap: 6,
  },
});
