import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  onGoBack: () => void;
};

function isSupportedImageURI(uri?: string | null): uri is string {
  if (typeof uri !== "string" || uri.length === 0) return false;
  const normalized = uri.trim().toLowerCase();
  if (!normalized) return false;
  if (!normalized.startsWith("https://") && !normalized.startsWith("http://")) {
    return false;
  }
  return !normalized.endsWith(".svg");
}

type HeroActionButtonProps = {
  icon: React.ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
};

function HeroActionButton({
  icon,
  accessibilityLabel,
  onPress,
}: HeroActionButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.heroActionButton}
    >
      {icon}
    </TouchableOpacity>
  );
}

export default function UserProfileIOSHero({
  user,
  trophies,
  isOwnProfile,
  onEditProfile,
  onShareProfile,
  onAddAccount,
  onGoBack,
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
  const avatarURI = user.avatarImage ?? user.profileImage ?? user.icon;
  const bannerURI =
    !bannerLoadError && isSupportedImageURI(user.bannerImage)
      ? user.bannerImage
      : undefined;
  const resolvedAvatarURI =
    !avatarLoadError && isSupportedImageURI(avatarURI) ? avatarURI : undefined;
  const safeTrophies = Array.isArray(trophies) ? trophies : [];

  useEffect(() => {
    setBannerLoadError(false);
  }, [user.bannerImage]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarURI]);

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
        .map((trophy) => trophy.icon)
        .filter((icon): icon is string => isSupportedImageURI(icon))
        .slice(0, 3),
    [safeTrophies],
  );

  const stats = [
    {
      key: "karma",
      value: new Numbers(totalKarma).prettyNum().toString(),
      label: "Karma",
    },
    {
      key: "contributions",
      value: achievementsCount.toString(),
      label: "Contributions",
    },
    {
      key: "accountAge",
      value: accountAge,
      label: "Account Age",
    },
    {
      key: "activeIn",
      value: user.isMod ? "1" : "0",
      label: "Active In",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroTopBlue}>
          {!!bannerURI && (
            <Image
              source={bannerURI}
              style={styles.bannerImage}
              onError={() => setBannerLoadError(true)}
            />
          )}
          <View style={styles.topControlsRow}>
            <HeroActionButton
              accessibilityLabel="Go back"
              onPress={onGoBack}
              icon={<Feather name="arrow-left" size={22} color="#ffffff" />}
            />
            <View style={styles.usernamePill}>
              <Text numberOfLines={1} style={styles.usernamePillText}>
                {`u/${userName}`}
              </Text>
              <Feather name="chevron-down" size={16} color="#ffffff" />
            </View>
            <View style={styles.topControlsSpacer} />
            <HeroActionButton
              accessibilityLabel="Search profile"
              onPress={onAddAccount}
              icon={<Feather name="search" size={20} color="#ffffff" />}
            />
            <HeroActionButton
              accessibilityLabel="Share profile"
              onPress={onShareProfile}
              icon={<Feather name="send" size={18} color="#ffffff" />}
            />
            <HeroActionButton
              accessibilityLabel="Profile menu"
              onPress={onAddAccount}
              icon={<Feather name="menu" size={20} color="#ffffff" />}
            />
          </View>
        </View>
        <View style={styles.heroBottomBlack}>
          <View style={styles.avatarContainer}>
            {resolvedAvatarURI ? (
              <Image
                source={resolvedAvatarURI}
                style={styles.avatar}
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
            <Text style={styles.displayName}>{displayName}</Text>
            {isOwnProfile && (
              <>
                <Feather
                  name="shield"
                  size={17}
                  color="#ff5f15"
                  style={styles.shieldIcon}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={onEditProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.secondaryLine}>
            {`u/${userName} \u2022 ${new Numbers(followers).prettyNum()} followers \u203a`}
          </Text>
          {isOwnProfile && (
            <View style={styles.achievementRow}>
              <Text style={styles.achievementText}>Add Social Link \u203a</Text>
              <View style={styles.achievementIcons}>
                {achievementPreviewIcons.length === 0 ? (
                  <MaterialCommunityIcons
                    name="trophy-outline"
                    size={17}
                    color="#d9d9dd"
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
              <Text style={styles.achievementText}>
                {`${achievementsCount} achievements \u203a`}
              </Text>
            </View>
          )}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View
                key={stat.key}
                style={[
                  styles.statItem,
                  index > 0 && styles.statItemWithBorder,
                ]}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
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
    backgroundColor: "#000000",
  },
  heroTopBlue: {
    minHeight: 218,
    backgroundColor: "#2f65ae",
    paddingTop: 8,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  bannerImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  topControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  heroActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(7, 26, 56, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  usernamePill: {
    maxWidth: 175,
    minWidth: 110,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(7, 26, 56, 0.92)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  usernamePillText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700",
    flexShrink: 1,
  },
  topControlsSpacer: {
    flex: 1,
  },
  heroBottomBlack: {
    backgroundColor: "#000000",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  avatarContainer: {
    marginTop: -14,
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
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
    color: "#ffffff",
    fontSize: 47 / 2,
    fontWeight: "700",
  },
  shieldIcon: {
    marginTop: 3,
  },
  editText: {
    color: "#ffffff",
    fontSize: 19 / 2,
    fontWeight: "600",
  },
  secondaryLine: {
    marginTop: 7,
    color: "#e2e4ea",
    fontSize: 18 / 2,
    fontWeight: "500",
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
    borderWidth: 1,
    borderColor: "#000000",
  },
  achievementText: {
    color: "#e3e5ea",
    fontSize: 18 / 2,
    fontWeight: "600",
  },
  statsContainer: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2b2c31",
    flexDirection: "row",
  },
  statItem: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 7,
  },
  statItemWithBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "#2b2c31",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 36 / 2,
    fontWeight: "700",
  },
  statLabel: {
    color: "#c4c7cf",
    fontSize: 14 / 2,
    fontWeight: "500",
    marginTop: 3,
  },
});
