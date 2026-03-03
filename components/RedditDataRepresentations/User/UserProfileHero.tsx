import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { User, UserTrophy } from "../../../api/User";
import { ThemeContext } from "../../../contexts/SettingsContexts/ThemeContext";
import Numbers from "../../../utils/Numbers";
import Time from "../../../utils/Time";

type UserProfileHeroProps = {
  user: User;
  trophies: UserTrophy[];
};

type StatChipProps = {
  label: string;
  value: string;
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

function StatChip({ label, value }: StatChipProps) {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={[
        styles.statChip,
        {
          backgroundColor: theme.tint,
          borderColor: theme.divider,
        },
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
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          {
            color: theme.subtleText,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function UserProfileHero({
  user,
  trophies,
}: UserProfileHeroProps) {
  const { theme } = useContext(ThemeContext);
  const displayName = user.displayName?.trim() || user.userName;
  const avatarUri = user.avatarImage ?? user.profileImage ?? user.icon;
  const [bannerLoadError, setBannerLoadError] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [trophyLoadErrors, setTrophyLoadErrors] = useState<
    Record<string, true>
  >({});

  const resolvedBannerImage =
    !bannerLoadError && isSupportedImageURI(user.bannerImage)
      ? user.bannerImage
      : undefined;
  const resolvedAvatarImage =
    !avatarLoadError && isSupportedImageURI(avatarUri) ? avatarUri : undefined;

  useEffect(() => {
    setBannerLoadError(false);
  }, [user.bannerImage]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarUri]);

  useEffect(() => {
    setTrophyLoadErrors({});
  }, [trophies]);

  const totalKarma =
    user.totalKarma ?? Math.max(0, user.commentKarma + user.postKarma);
  const accountAge = new Time(user.createdAt * 1000).prettyTimeSince();
  const profileBadges = useMemo(
    () =>
      [
        user.isGold ? "Premium" : null,
        user.isMod ? "Mod" : null,
        user.verifiedEmail ? "Verified" : null,
      ].filter((badge): badge is string => !!badge),
    [user.isGold, user.isMod, user.verifiedEmail],
  );

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
          styles.bannerContainer,
          {
            backgroundColor: theme.tint,
          },
        ]}
      >
        {!!resolvedBannerImage && (
          <Image
            source={resolvedBannerImage}
            style={styles.bannerImage}
            onError={() => setBannerLoadError(true)}
          />
        )}
      </View>
      <View style={styles.headerSection}>
        {resolvedAvatarImage ? (
          <Image
            source={resolvedAvatarImage}
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
              {user.userName[0]?.toUpperCase() ?? "U"}
            </Text>
          </View>
        )}
        <View style={styles.headerTextContainer}>
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
          <Text
            style={[
              styles.userName,
              {
                color: theme.subtleText,
              },
            ]}
          >
            {`u/${user.userName}`}
          </Text>
          {!!profileBadges.length && (
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
        </View>
      </View>
      {!!user.bio && (
        <Text
          style={[
            styles.bio,
            {
              color: theme.text,
            },
          ]}
        >
          {user.bio}
        </Text>
      )}
      <View style={styles.statsRow}>
        <StatChip
          label="Post Karma"
          value={new Numbers(user.postKarma).prettyNum().toString()}
        />
        <StatChip
          label="Comment Karma"
          value={new Numbers(user.commentKarma).prettyNum().toString()}
        />
        <StatChip
          label="Total Karma"
          value={new Numbers(totalKarma).prettyNum().toString()}
        />
        <StatChip label="Account Age" value={accountAge} />
      </View>
      {!!trophies.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trophiesContainer}
          accessibilityRole="list"
          accessibilityLabel="User trophies"
        >
          {trophies.slice(0, 8).map((trophy) => (
            <View
              key={trophy.id}
              style={[
                styles.trophyChip,
                {
                  backgroundColor: theme.tint,
                  borderColor: theme.divider,
                },
              ]}
            >
              {trophy.icon &&
              isSupportedImageURI(trophy.icon) &&
              !trophyLoadErrors[trophy.id] ? (
                <Image
                  source={trophy.icon}
                  style={styles.trophyIcon}
                  onError={() =>
                    setTrophyLoadErrors((current) => ({
                      ...current,
                      [trophy.id]: true,
                    }))
                  }
                />
              ) : (
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={16}
                  color={theme.iconPrimary}
                />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.trophyText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {trophy.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    marginBottom: 6,
  },
  bannerContainer: {
    height: 130,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  headerSection: {
    marginTop: -40,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 30,
    fontWeight: "700",
  },
  headerTextContainer: {
    flex: 1,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
  },
  userName: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "500",
  },
  bio: {
    marginTop: 10,
    marginHorizontal: 16,
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
  statsRow: {
    marginTop: 12,
    marginHorizontal: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: "48%",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  trophiesContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  trophyChip: {
    maxWidth: 180,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trophyIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  trophyText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
  },
});
