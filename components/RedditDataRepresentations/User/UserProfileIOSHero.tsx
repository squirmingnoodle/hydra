import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { User, UserTrophy } from "../../../api/User";
import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";
import Numbers from "../../../utils/Numbers";
import Time from "../../../utils/Time";

type UserProfileIOSHeroProps = {
  user: User;
  trophies: UserTrophy[];
  isOwnProfile: boolean;
  onEditProfile: () => void;
  onShareProfile: () => void;
  onAddAccount: () => void;
  onGoBack?: () => void;
  showFollowAction?: boolean;
  isFollowing?: boolean;
  followLoading?: boolean;
  onToggleFollow?: () => void;
};

function sanitizeImageURI(uri?: string | null): string | undefined {
  if (typeof uri !== "string" || uri.length === 0) return undefined;
  const normalized = uri.trim().replace(/&amp;/g, "&");
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    if (parsed.pathname.toLowerCase().endsWith(".svg")) {
      return undefined;
    }
    return parsed.toString();
  } catch (_error) {
    return undefined;
  }
}

function isAnimatedImageURI(uri?: string): boolean {
  if (!uri) return false;
  try {
    const parsed = new URL(uri);
    const pathname = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();
    return (
      /\.(gif|webp|apng)$/.test(pathname) ||
      pathname.endsWith(".gifv") ||
      search.includes("format=gif") ||
      search.includes("format=webp") ||
      search.includes("animated=true") ||
      search.includes("is_animated=true")
    );
  } catch (_error) {
    return false;
  }
}

export default function UserProfileIOSHero({
  user,
  trophies,
  isOwnProfile,
  onEditProfile,
  onShareProfile,
  onAddAccount,
  showFollowAction = false,
  isFollowing = false,
  followLoading = false,
  onToggleFollow,
}: UserProfileIOSHeroProps) {
  const { theme } = useContext(ThemeContext);
  const [bannerLoadError, setBannerLoadError] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const userName =
    typeof user.userName === "string" && user.userName.trim().length > 0
      ? user.userName.trim()
      : "unknown";
  const displayName =
    typeof user.displayName === "string" && user.displayName.trim().length > 0
      ? user.displayName.trim()
      : userName;
  const bannerURI = !bannerLoadError
    ? sanitizeImageURI(user.bannerImage)
    : undefined;
  const hasBannerImage = !!bannerURI;
  const avatarCandidates = [
    sanitizeImageURI(user.avatarImage),
    sanitizeImageURI(user.profileImage),
    sanitizeImageURI(user.icon),
  ].filter((candidate): candidate is string => !!candidate);
  const animatedAvatarURI = avatarCandidates.find((candidate) =>
    isAnimatedImageURI(candidate),
  );
  const preferredAvatarURI = animatedAvatarURI ?? avatarCandidates[0];
  const resolvedAvatarURI = !avatarLoadError ? preferredAvatarURI : undefined;
  const safeTrophies = Array.isArray(trophies) ? trophies : [];

  useEffect(() => {
    setBannerLoadError(false);
  }, [user.bannerImage]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [preferredAvatarURI]);

  const achievementsCount = safeTrophies.length;
  const totalKarma =
    typeof user.totalKarma === "number" && Number.isFinite(user.totalKarma)
      ? user.totalKarma
      : Math.max(0, user.commentKarma + user.postKarma);
  const followers = user.followersCount ?? 0;
  const accountAge =
    typeof user.createdAt === "number" && Number.isFinite(user.createdAt)
      ? new Time(user.createdAt * 1000).shortPrettyTimeSince()
      : "0y";

  const achievementPreviewIcons = useMemo(
    () =>
      safeTrophies
        .map((trophy) => sanitizeImageURI(trophy.icon))
        .filter((icon): icon is string => !!icon)
        .slice(0, 3),
    [safeTrophies],
  );

  const profileBadges = useMemo(
    () =>
      [
        user.isGold ? "Premium" : null,
        user.isMod ? "Mod" : null,
        user.verifiedEmail ? "Verified" : null,
      ].filter((badge): badge is string => !!badge),
    [user.isGold, user.isMod, user.verifiedEmail],
  );

  const stats = [
    {
      key: "karma",
      value: new Numbers(totalKarma).prettyNum().toString(),
      label: "Karma",
    },
    {
      key: "trophies",
      value: achievementsCount.toString(),
      label: "Trophies",
    },
    {
      key: "accountAge",
      value: accountAge,
      label: "Account Age",
    },
    {
      key: "followers",
      value: new Numbers(followers).prettyNum().toString(),
      label: "Followers",
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.divider,
          },
        ]}
      >
        {hasBannerImage && bannerURI && (
          <View
            style={[
              styles.heroTop,
              {
                backgroundColor: theme.background,
              },
            ]}
          >
            <Image
              source={bannerURI}
              style={styles.bannerImage}
              contentFit="cover"
              contentPosition="center"
              onError={() => setBannerLoadError(true)}
            />
            <View style={styles.usernamePillContainer}>
              <View
                style={[
                  styles.usernamePill,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.usernamePillText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {`u/${userName}`}
                </Text>
              </View>
            </View>
          </View>
        )}
        <View
          style={[
            styles.heroBottom,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <View
            style={[
              styles.avatarContainer,
              hasBannerImage
                ? styles.avatarContainerWithBanner
                : styles.avatarContainerNoBanner,
            ]}
          >
            {resolvedAvatarURI ? (
              <Image
                source={resolvedAvatarURI}
                style={styles.avatar}
                contentFit="cover"
                contentPosition="center"
                autoplay
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  {
                    backgroundColor: theme.tint,
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.avatarFallbackText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {userName[0]?.toUpperCase() ?? "U"}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.identityRow}>
            <Text
              style={[
                styles.displayName,
                {
                  color: theme.text,
                },
              ]}
            >
              {displayName}
            </Text>
            {isOwnProfile && (
              <>
                <Feather
                  name="shield"
                  size={17}
                  color={theme.iconPrimary}
                  style={styles.shieldIcon}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={onEditProfile}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.editText,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text
            style={[
              styles.secondaryLine,
              {
                color: theme.subtleText,
              },
            ]}
          >
            {`u/${userName} \u2022 ${new Numbers(followers).prettyNum()} followers`}
          </Text>
          {!!user.bio && (
            <Text
              numberOfLines={3}
              style={[
                styles.bio,
                {
                  color: theme.subtleText,
                },
              ]}
            >
              {user.bio}
            </Text>
          )}
          {profileBadges.length > 0 && (
            <View style={styles.badgesRow}>
              {profileBadges.map((badge) => (
                <View
                  key={badge}
                  style={[
                    styles.badge,
                    {
                      backgroundColor: theme.tint,
                      borderColor: theme.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {isOwnProfile ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                activeOpacity={0.8}
                onPress={onEditProfile}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.tint,
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Feather name="edit-2" size={14} color={theme.text} />
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Edit Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Share profile"
                activeOpacity={0.8}
                onPress={onShareProfile}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.tint,
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Feather name="share-2" size={14} color={theme.text} />
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Share
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add account"
                activeOpacity={0.8}
                onPress={onAddAccount}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.tint,
                    borderColor: theme.divider,
                  },
                ]}
              >
                <Feather name="user-plus" size={14} color={theme.text} />
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Add Account
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            showFollowAction && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFollowing ? "Unfollow user" : "Follow user"
                  }
                  activeOpacity={0.8}
                  onPress={() => onToggleFollow?.()}
                  disabled={followLoading}
                  style={[
                    styles.actionButton,
                    styles.primaryActionButton,
                    {
                      backgroundColor: theme.buttonBg,
                      borderColor: theme.buttonBg,
                      opacity: followLoading ? 0.75 : 1,
                    },
                  ]}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.buttonText}
                      style={styles.followSpinner}
                    />
                  ) : (
                    <Feather
                      name={isFollowing ? "user-check" : "user-plus"}
                      size={14}
                      color={theme.buttonText}
                    />
                  )}
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.primaryActionButtonText,
                      {
                        color: theme.buttonText,
                      },
                    ]}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                  activeOpacity={0.8}
                  onPress={onShareProfile}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: theme.tint,
                      borderColor: theme.divider,
                    },
                  ]}
                >
                  <Feather name="share-2" size={14} color={theme.text} />
                  <Text
                    style={[
                      styles.actionButtonText,
                      {
                        color: theme.text,
                      },
                    ]}
                  >
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}
          {isOwnProfile && (
            <View style={styles.achievementRow}>
              <View style={styles.achievementIcons}>
                {achievementPreviewIcons.length === 0 ? (
                  <MaterialCommunityIcons
                    name="trophy-outline"
                    size={17}
                    color={theme.subtleText}
                  />
                ) : (
                  achievementPreviewIcons.map((icon, index) => (
                    <Image
                      key={`${icon}-${index}`}
                      source={icon}
                      style={styles.achievementIcon}
                    />
                  ))
                )}
              </View>
              <Text
                style={[
                  styles.achievementText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                {`${achievementsCount} achievements \u203a`}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.statsContainer,
              {
                borderTopColor: theme.divider,
              },
            ]}
          >
            {stats.map((stat, index) => (
              <View
                key={stat.key}
                style={[
                  styles.statItem,
                  index > 0 && styles.statItemWithBorder,
                  index > 0
                    ? {
                        borderLeftColor: theme.divider,
                      }
                    : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {stat.value}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: theme.subtleText,
                    },
                  ]}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  hero: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroTop: {
    height: 176,
    justifyContent: "flex-start",
    paddingTop: 10,
    paddingBottom: 0,
    overflow: "hidden",
  },
  bannerImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  usernamePillContainer: {
    paddingHorizontal: 12,
  },
  usernamePill: {
    maxWidth: 210,
    minWidth: 110,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  usernamePillText: {
    fontSize: 17,
    fontWeight: "600",
    flexShrink: 1,
  },
  heroBottom: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatarContainerWithBanner: {
    marginTop: -50,
  },
  avatarContainerNoBanner: {
    marginTop: 20,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 8,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 42,
    fontWeight: "700",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    fontSize: 47 / 2,
    fontWeight: "700",
  },
  shieldIcon: {
    marginTop: 3,
  },
  editText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryLine: {
    marginTop: 7,
    fontSize: 15,
    fontWeight: "500",
  },
  bio: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  badgesRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primaryActionButton: {
    flex: 1.3,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  primaryActionButtonText: {
    fontWeight: "700",
  },
  followSpinner: {
    marginVertical: -1,
  },
  achievementRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  achievementIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
  },
  achievementIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -6,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  statItem: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 7,
  },
  statItemWithBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 36 / 2,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },
});
