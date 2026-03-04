import * as Sentry from "@sentry/react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  BannedUserError,
  User,
  UserContent,
  UserDoesNotExistError,
  getUser,
  getUserContent,
  getUserTrophies,
  UserTrophy,
} from "../api/User";
import { StackPageProps } from "../app/stack";
import SortAndContext, {
  ContextTypes,
  SortTypes,
} from "../components/Navbar/SortAndContext";
import Login from "../components/Modals/Login";
import PostComponent from "../components/RedditDataRepresentations/Post/PostComponent";
import { CommentComponent } from "../components/RedditDataRepresentations/Post/PostParts/Comments";
import UserProfileHero from "../components/RedditDataRepresentations/User/UserProfileHero";
import UserProfileIOSHero from "../components/RedditDataRepresentations/User/UserProfileIOSHero";
import UserProfilePrimaryTabs, {
  UserProfilePrimaryTab,
} from "../components/RedditDataRepresentations/User/UserProfilePrimaryTabs";
import UserProfileSavedTypeTabs, {
  UserSavedTypeTab,
} from "../components/RedditDataRepresentations/User/UserProfileSavedTypeTabs";
import UserDetailsComponent from "../components/RedditDataRepresentations/User/UserDetailsComponent";
import RedditDataScroller from "../components/UI/RedditDataScroller";
import { AccountContext } from "../contexts/AccountContext";
import { ModalContext } from "../contexts/ModalContext";
import { TabSettingsContext } from "../contexts/SettingsContexts/TabSettingsContext";
import { ThemeContext } from "../contexts/SettingsContexts/ThemeContext";
import RedditURL from "../utils/RedditURL";
import {
  getAllCategoriesFromMap,
  matchesFilter,
  SAVED_POST_CATEGORY_ALL,
  SAVED_POST_CATEGORY_UNCATEGORIZED,
  SavedPostCategoryFilter,
  useSavedPostCategoryMap,
} from "../utils/savedPostCategories";
import URL from "../utils/URL";
import { useURLNavigation } from "../utils/navigation";
import useRedditDataState from "../utils/useRedditDataState";
import AccessFailureComponent from "../components/UI/AccessFailureComponent";

const MODERN_ACCOUNT_VIEW_DISABLED_WARNING =
  "Modern account view crashed and was disabled";
const MODERN_ACCOUNT_VIEW_INVALID_URL_WARNING =
  "Modern account view is unavailable for this profile URL";

type ParsedUserRoute = {
  sort: string | null;
  sortTime: string | null;
  section?: string;
  userNameFromURL: string;
  view: string | null;
  savedType: string | null;
  isSavedPostsPage: boolean;
};

function parseUserRoute(url: string): ParsedUserRoute | null {
  try {
    const redditURL = new RedditURL(url);
    const [sort, sortTime] = redditURL.getSort();
    const relativePathParts = redditURL.getRelativePath().split("/");
    const section = relativePathParts[3];
    const userNameFromURL = relativePathParts[2] ?? "";
    const view = new URL(url).getQueryParam("view");
    const savedType = new URL(url).getQueryParam("type");
    return {
      sort,
      sortTime,
      section,
      userNameFromURL,
      view,
      savedType,
      isSavedPostsPage: section === "saved" && savedType === "links",
    };
  } catch (_error) {
    return null;
  }
}

type ModernUserPageErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError: (error: Error, info: React.ErrorInfo) => void;
};

type ModernUserPageErrorBoundaryState = {
  hasError: boolean;
};

class ModernUserPageErrorBoundary extends React.Component<
  ModernUserPageErrorBoundaryProps,
  ModernUserPageErrorBoundaryState
> {
  state: ModernUserPageErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ModernUserPageBoundary(props: StackPageProps<"UserPage">) {
  const { toggleModernAccountViewEnabled, setModernAccountViewAutoDisabled } =
    useContext(TabSettingsContext);
  const crashHandledRef = useRef(false);
  const parsedRoute = useMemo(
    () => parseUserRoute(props.route.params.url),
    [props.route.params.url],
  );

  const handleError = useCallback(
    (error: Error, info: React.ErrorInfo) => {
      Sentry.withScope((scope) => {
        scope.setTag("screen", "UserPage");
        scope.setTag("surface", "modernAccountView");
        scope.setContext("modernAccountView", {
          routeUrl: props.route.params.url,
          username: parsedRoute?.userNameFromURL ?? "unknown",
          section: parsedRoute?.section ?? "overview",
          componentStack: info.componentStack,
        });
        Sentry.captureException(error);
      });

      if (!crashHandledRef.current) {
        crashHandledRef.current = true;
        setModernAccountViewAutoDisabled(true);
        toggleModernAccountViewEnabled(false);
      }
    },
    [
      parsedRoute?.section,
      parsedRoute?.userNameFromURL,
      props.route.params.url,
      setModernAccountViewAutoDisabled,
      toggleModernAccountViewEnabled,
    ],
  );

  return (
    <ModernUserPageErrorBoundary
      onError={handleError}
      fallback={
        <LegacyUserPageContent
          {...props}
          warningBannerText={MODERN_ACCOUNT_VIEW_DISABLED_WARNING}
        />
      }
    >
      <ModernUserPageContent {...props} />
    </ModernUserPageErrorBoundary>
  );
}

export default function UserPage(props: StackPageProps<"UserPage">) {
  const { modernAccountViewEnabled, modernAccountViewAutoDisabled } =
    useContext(TabSettingsContext);
  if (modernAccountViewEnabled) {
    return <ModernUserPageBoundary {...props} />;
  }
  return (
    <LegacyUserPageContent
      {...props}
      warningBannerText={
        modernAccountViewAutoDisabled
          ? MODERN_ACCOUNT_VIEW_DISABLED_WARNING
          : undefined
      }
    />
  );
}

type LegacyUserPageContentProps = StackPageProps<"UserPage"> & {
  warningBannerText?: string;
};

function LegacyUserPageContent({
  route,
  warningBannerText,
}: LegacyUserPageContentProps) {
  const url = route.params.url;
  const [sort, sortTime] = new RedditURL(url).getSort();

  const navigation = useURLNavigation();
  const parsedRoute = useMemo(() => parseUserRoute(url), [url]);
  const contentName = parsedRoute?.userNameFromURL || "User";

  const section = new RedditURL(url).getRelativePath().split("/")[3];
  const savedType = new URL(url).getQueryParam("type");
  const isSavedPostsPage = section === "saved" && savedType === "links";

  const { theme } = useContext(ThemeContext);
  const { currentUser } = useContext(AccountContext);

  const [user, setUser] = useState<User>();
  const [savedPostCategoryMap] = useSavedPostCategoryMap();
  const [selectedSavedPostCategoryFilter, setSelectedSavedPostCategoryFilter] =
    useState<SavedPostCategoryFilter>(SAVED_POST_CATEGORY_ALL);

  const savedPostCategories = useMemo(
    () => getAllCategoriesFromMap(savedPostCategoryMap),
    [savedPostCategoryMap],
  );
  const savedPostCategoryFilters = useMemo(
    () => [
      {
        key: SAVED_POST_CATEGORY_ALL,
        label: "All",
      },
      {
        key: SAVED_POST_CATEGORY_UNCATEGORIZED,
        label: "Uncategorized",
      },
      ...savedPostCategories.map((category) => ({
        key: category,
        label: category,
      })),
    ],
    [savedPostCategories],
  );

  useEffect(() => {
    if (!isSavedPostsPage) {
      setSelectedSavedPostCategoryFilter(SAVED_POST_CATEGORY_ALL);
      return;
    }

    if (
      selectedSavedPostCategoryFilter === SAVED_POST_CATEGORY_ALL ||
      selectedSavedPostCategoryFilter === SAVED_POST_CATEGORY_UNCATEGORIZED
    ) {
      return;
    }

    const filterStillExists = savedPostCategories.some(
      (category) =>
        category.toLowerCase() ===
        selectedSavedPostCategoryFilter.toLowerCase(),
    );

    if (!filterStillExists) {
      setSelectedSavedPostCategoryFilter(SAVED_POST_CATEGORY_ALL);
    }
  }, [isSavedPostsPage, selectedSavedPostCategoryFilter, savedPostCategories]);

  const {
    data: userContent,
    loadMoreData: loadMoreUserContent,
    refreshData: refreshUserContent,
    modifyData: modifyUserContent,
    deleteData: deleteUserContent,
    fullyLoaded,
    hitFilterLimit,
    accessFailure,
  } = useRedditDataState<UserContent, "userLoadingError">({
    loadData: async (after) => {
      if (!parsedRoute) {
        return [];
      }
      return await getUserContent(url, { after });
    },
    filterRules: isSavedPostsPage
      ? [
          (content) =>
            content.filter(
              (item) =>
                item.type !== "post" ||
                matchesFilter(
                  item.name,
                  selectedSavedPostCategoryFilter,
                  savedPostCategoryMap,
                ),
            ),
        ]
      : [],
    refreshDependencies: [
      sort,
      sortTime,
      isSavedPostsPage ? selectedSavedPostCategoryFilter : null,
      isSavedPostsPage ? savedPostCategoryMap : null,
    ],
  });

  const isDeepPath = !!new URL(url).getBasePath().split("/")[5]; // More than just /user/username like /user/username/comments

  const loadUser = async () => {
    const userUrl = new RedditURL(url)
      .getRelativePath()
      .split("/")
      .slice(0, 3)
      .join("/");
    try {
      const userData = await getUser(`https://www.reddit.com${userUrl}`);
      setUser(userData);
    } catch (e) {
      if (e instanceof BannedUserError || e instanceof UserDoesNotExistError) {
        // The useRedditDataState hook will also get this error and handle it for us
        return;
      }
      throw e;
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const contextOptions: ContextTypes[] = ["Block", "Share"];
    if (currentUser?.userName !== user?.userName) {
      contextOptions.unshift("Message");
    }
    const sortOptions: SortTypes[] | undefined =
      section === "submitted" || section === "comments"
        ? ["New", "Hot", "Top"]
        : undefined;
    navigation.setOptions({
      headerRight: () => {
        return (
          <SortAndContext
            route={route}
            navigation={navigation}
            sortOptions={sortOptions}
            contextOptions={contextOptions}
            pageData={user}
          />
        );
      },
    });
  }, [sort, sortTime, user]);

  const renderSavedPostCategoryFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.savedCategoryFilterContainer}
    >
      {savedPostCategoryFilters.map((category) => {
        const selected = category.key === selectedSavedPostCategoryFilter;

        return (
          <TouchableOpacity
            key={category.key}
            activeOpacity={0.8}
            style={[
              styles.savedCategoryFilterButton,
              {
                backgroundColor: selected ? theme.iconPrimary : theme.tint,
                borderColor: selected ? theme.iconPrimary : theme.divider,
              },
            ]}
            onPress={() => setSelectedSavedPostCategoryFilter(category.key)}
          >
            <Text
              style={[
                styles.savedCategoryFilterText,
                {
                  color: selected ? theme.text : theme.subtleText,
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View
      style={[
        styles.userContainer,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <AccessFailureComponent
        accessFailure={accessFailure}
        contentName={contentName}
      >
        {!!warningBannerText && (
          <View
            style={[
              styles.warningBanner,
              {
                backgroundColor: theme.tint,
                borderColor: theme.divider,
              },
            ]}
          >
            <Text
              style={[
                styles.warningBannerText,
                {
                  color: theme.subtleText,
                },
              ]}
            >
              {warningBannerText}
            </Text>
          </View>
        )}
        <RedditDataScroller<UserContent>
          ListHeaderComponent={
            !isDeepPath && user ? (
              <View>
                <UserDetailsComponent user={user} />
                {isSavedPostsPage && renderSavedPostCategoryFilters()}
              </View>
            ) : isSavedPostsPage ? (
              renderSavedPostCategoryFilters()
            ) : null
          }
          loadMore={loadMoreUserContent}
          refresh={refreshUserContent}
          fullyLoaded={fullyLoaded}
          hitFilterLimit={hitFilterLimit}
          data={userContent}
          getItemType={(item) => item?.type ?? "unknown"}
          renderItem={({ item: content }) => {
            if (!content) {
              return null;
            }
            if (content.type === "post") {
              return (
                <PostComponent
                  post={content}
                  setPost={(newPost) => modifyUserContent([newPost])}
                />
              );
            }
            if (content.type === "comment") {
              return (
                <CommentComponent
                  comment={content}
                  index={0}
                  displayInList
                  changeComment={(newComment) =>
                    modifyUserContent([newComment])
                  }
                  deleteComment={(comment) => deleteUserContent([comment])}
                />
              );
            }
            return null;
          }}
        />
      </AccessFailureComponent>
    </View>
  );
}

type ModernUserPageHeaderProps = {
  user: User | undefined;
  trophies: UserTrophy[];
  isOwnProfile: boolean;
  selectedPrimaryTab: UserProfilePrimaryTab;
  selectedSavedTypeTab: UserSavedTypeTab;
  isSavedPostsPage: boolean;
  savedPostCategoryFilters: { key: SavedPostCategoryFilter; label: string }[];
  selectedSavedPostCategoryFilter: SavedPostCategoryFilter;
  onEditProfile: () => void;
  onShareProfile: () => void;
  onAddAccount: () => void;
  onGoBack: () => void;
  onSelectPrimaryTab: (tab: UserProfilePrimaryTab) => void;
  onSelectSavedTypeTab: (tab: UserSavedTypeTab) => void;
  onSelectSavedPostCategoryFilter: (filter: SavedPostCategoryFilter) => void;
};

function ModernUserPageHeader({
  user,
  trophies,
  isOwnProfile,
  selectedPrimaryTab,
  selectedSavedTypeTab,
  isSavedPostsPage,
  savedPostCategoryFilters,
  selectedSavedPostCategoryFilter,
  onEditProfile,
  onShareProfile,
  onAddAccount,
  onGoBack,
  onSelectPrimaryTab,
  onSelectSavedTypeTab,
  onSelectSavedPostCategoryFilter,
}: ModernUserPageHeaderProps) {
  const { theme } = useContext(ThemeContext);
  return (
    <View>
      {user && (
        <ModernUserPageErrorBoundary
          onError={(error) => {
            Sentry.withScope((scope) => {
              scope.setTag("screen", "UserPage");
              scope.setTag("surface", "modernAccountViewHero");
              scope.setContext("modernAccountView", {
                username: user.userName,
              });
              Sentry.captureException(error);
            });
          }}
          fallback={<UserProfileHero user={user} trophies={trophies} />}
        >
          <UserProfileIOSHero
            user={user}
            trophies={trophies}
            isOwnProfile={isOwnProfile}
            onEditProfile={onEditProfile}
            onShareProfile={onShareProfile}
            onAddAccount={onAddAccount}
            onGoBack={onGoBack}
          />
        </ModernUserPageErrorBoundary>
      )}
      <UserProfilePrimaryTabs
        selectedTab={selectedPrimaryTab}
        showSavedTab={isOwnProfile}
        onSelectTab={onSelectPrimaryTab}
      />
      {selectedPrimaryTab === "posts" && isOwnProfile && (
        <View style={styles.feedControlsSection}>
          <View
            style={[
              styles.feedOptionsPill,
              {
                borderColor: theme.divider,
              },
            ]}
          >
            <Feather name="sliders" size={16} color={theme.subtleText} />
            <Text
              style={[
                styles.feedOptionsText,
                {
                  color: theme.subtleText,
                },
              ]}
            >
              Feed options
            </Text>
          </View>
          <View
            style={[
              styles.hiddenPostsCard,
              {
                backgroundColor: theme.tint,
                borderColor: theme.divider,
              },
            ]}
          >
            <View style={styles.hiddenPostsTextRow}>
              <Feather name="eye-off" size={20} color={theme.subtleText} />
              <Text
                style={[
                  styles.hiddenPostsText,
                  {
                    color: theme.subtleText,
                  },
                ]}
              >
                Hiding all posts
              </Text>
            </View>
            <MaterialIcons
              name="keyboard-arrow-right"
              size={22}
              color={theme.verySubtleText}
            />
          </View>
        </View>
      )}
      {selectedPrimaryTab === "saved" && isOwnProfile && (
        <>
          <UserProfileSavedTypeTabs
            selectedTab={selectedSavedTypeTab}
            onSelectTab={onSelectSavedTypeTab}
          />
          {isSavedPostsPage && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedCategoryFilterContainer}
            >
              {savedPostCategoryFilters.map((category) => {
                const selected =
                  category.key === selectedSavedPostCategoryFilter;
                return (
                  <TouchableOpacity
                    key={category.key}
                    activeOpacity={0.8}
                    style={[
                      styles.savedCategoryFilterButton,
                      {
                        backgroundColor: selected
                          ? theme.iconPrimary
                          : theme.tint,
                        borderColor: selected
                          ? theme.iconPrimary
                          : theme.divider,
                      },
                    ]}
                    onPress={() =>
                      onSelectSavedPostCategoryFilter(category.key)
                    }
                  >
                    <Text
                      style={[
                        styles.savedCategoryFilterText,
                        {
                          color: selected ? theme.text : theme.subtleText,
                        },
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

function getPrimaryTabFromSection(
  section?: string,
  view?: string | null,
): UserProfilePrimaryTab {
  if (section === "submitted") return "posts";
  if (section === "comments") return "comments";
  if (section === "saved") return "saved";
  if (view === "about") return "overview";
  return "posts";
}

function getSavedTypeTab(savedType?: string | null): UserSavedTypeTab {
  return savedType === "comments" ? "comments" : "posts";
}

function ModernUserPageContent(props: StackPageProps<"UserPage">) {
  const { route } = props;
  const url = route.params.url;
  const parsedRoute = useMemo(() => parseUserRoute(url), [url]);
  const invalidRouteReportedRef = useRef(false);
  const sort = parsedRoute?.sort ?? "new";
  const sortTime = parsedRoute?.sortTime ?? null;
  const section = parsedRoute?.section;
  const userNameFromURL = parsedRoute?.userNameFromURL ?? "";
  const view = parsedRoute?.view ?? null;
  const savedType = parsedRoute?.savedType ?? null;
  const isSavedPostsPage = parsedRoute?.isSavedPostsPage ?? false;

  const navigation = useURLNavigation();
  const { theme } = useContext(ThemeContext);
  const { currentUser } = useContext(AccountContext);
  const { setModal } = useContext(ModalContext);

  const [user, setUser] = useState<User>();
  const [trophies, setTrophies] = useState<UserTrophy[]>([]);
  const [savedPostCategoryMap] = useSavedPostCategoryMap();
  const [selectedSavedPostCategoryFilter, setSelectedSavedPostCategoryFilter] =
    useState<SavedPostCategoryFilter>(SAVED_POST_CATEGORY_ALL);

  const isOwnProfile =
    !!currentUser?.userName &&
    currentUser.userName.toLowerCase() === userNameFromURL.toLowerCase();
  const resolvedPrimaryTab = getPrimaryTabFromSection(section, view);
  const selectedPrimaryTab =
    resolvedPrimaryTab === "saved" && !isOwnProfile
      ? "overview"
      : resolvedPrimaryTab;
  const selectedSavedTypeTab = getSavedTypeTab(savedType);
  const contentURL = useMemo(() => {
    if (!userNameFromURL) {
      return url;
    }
    if (section || view === "about") {
      return url;
    }
    return `https://www.reddit.com/user/${userNameFromURL}/submitted`;
  }, [section, url, userNameFromURL, view]);

  const savedPostCategories = useMemo(
    () => getAllCategoriesFromMap(savedPostCategoryMap),
    [savedPostCategoryMap],
  );
  const savedPostCategoryFilters = useMemo(
    () => [
      {
        key: SAVED_POST_CATEGORY_ALL,
        label: "All",
      },
      {
        key: SAVED_POST_CATEGORY_UNCATEGORIZED,
        label: "Uncategorized",
      },
      ...savedPostCategories.map((category) => ({
        key: category,
        label: category,
      })),
    ],
    [savedPostCategories],
  );

  useEffect(() => {
    if (!isSavedPostsPage) {
      setSelectedSavedPostCategoryFilter(SAVED_POST_CATEGORY_ALL);
      return;
    }

    if (
      selectedSavedPostCategoryFilter === SAVED_POST_CATEGORY_ALL ||
      selectedSavedPostCategoryFilter === SAVED_POST_CATEGORY_UNCATEGORIZED
    ) {
      return;
    }

    const filterStillExists = savedPostCategories.some(
      (category) =>
        category.toLowerCase() ===
        selectedSavedPostCategoryFilter.toLowerCase(),
    );

    if (!filterStillExists) {
      setSelectedSavedPostCategoryFilter(SAVED_POST_CATEGORY_ALL);
    }
  }, [isSavedPostsPage, selectedSavedPostCategoryFilter, savedPostCategories]);

  const {
    data: userContent,
    loadMoreData: loadMoreUserContent,
    refreshData: refreshUserContent,
    modifyData: modifyUserContent,
    deleteData: deleteUserContent,
    fullyLoaded,
    hitFilterLimit,
    accessFailure,
  } = useRedditDataState<UserContent, "userLoadingError">({
    loadData: async (after) => {
      if (!parsedRoute) {
        return [];
      }
      return await getUserContent(contentURL, { after });
    },
    filterRules: isSavedPostsPage
      ? [
          (content) =>
            content.filter(
              (item) =>
                item.type !== "post" ||
                matchesFilter(
                  item.name,
                  selectedSavedPostCategoryFilter,
                  savedPostCategoryMap,
                ),
            ),
        ]
      : [],
    refreshDependencies: [
      sort,
      sortTime,
      contentURL,
      isSavedPostsPage ? selectedSavedPostCategoryFilter : null,
      isSavedPostsPage ? savedPostCategoryMap : null,
    ],
  });

  useEffect(() => {
    const loadUser = async () => {
      if (!userNameFromURL) {
        setUser(undefined);
        return;
      }

      try {
        const userData = await getUser(
          `https://www.reddit.com/user/${userNameFromURL}`,
        );
        setUser(userData);
      } catch (e) {
        if (
          e instanceof BannedUserError ||
          e instanceof UserDoesNotExistError
        ) {
          return;
        }
        throw e;
      }
    };

    loadUser();
  }, [userNameFromURL]);

  useEffect(() => {
    let canceled = false;

    (async () => {
      if (!userNameFromURL) {
        setTrophies([]);
        return;
      }
      const result = await getUserTrophies(userNameFromURL);
      if (!canceled) {
        setTrophies(result);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [userNameFromURL]);

  useEffect(() => {
    const contextOptions: ContextTypes[] = ["Block", "Share"];
    if (!isOwnProfile) {
      contextOptions.unshift("Message");
    }

    const sortOptions: SortTypes[] | undefined =
      selectedPrimaryTab === "posts" || selectedPrimaryTab === "comments"
        ? ["New", "Hot", "Top"]
        : undefined;

    navigation.setOptions({
      headerRight: () => (
        <SortAndContext
          route={route}
          navigation={navigation}
          sortOptions={sortOptions}
          contextOptions={contextOptions}
          pageData={user}
        />
      ),
    });
  }, [
    isOwnProfile,
    navigation,
    route,
    selectedPrimaryTab,
    sort,
    sortTime,
    user,
  ]);

  const goToPrimaryTab = useCallback(
    (tab: UserProfilePrimaryTab) => {
      if (!userNameFromURL) return;

      let nextUrl = `https://www.reddit.com/user/${userNameFromURL}`;
      if (tab === "posts") {
        nextUrl = `${nextUrl}/submitted`;
      } else if (tab === "comments") {
        nextUrl = `${nextUrl}/comments`;
      } else if (tab === "saved") {
        nextUrl = `${nextUrl}/saved?type=links`;
      } else if (tab === "overview") {
        nextUrl = `${nextUrl}?view=about`;
      }
      navigation.replaceURL(nextUrl);
    },
    [userNameFromURL, navigation],
  );

  const goToSavedTypeTab = useCallback(
    (tab: UserSavedTypeTab) => {
      if (!userNameFromURL) return;
      const type = tab === "comments" ? "comments" : "links";
      navigation.replaceURL(
        `https://www.reddit.com/user/${userNameFromURL}/saved?type=${type}`,
      );
    },
    [userNameFromURL, navigation],
  );

  const shareProfile = useCallback(() => {
    if (!userNameFromURL) return;
    Share.share({
      url: `https://www.reddit.com/user/${userNameFromURL}`,
    });
  }, [userNameFromURL]);

  const openEditProfile = useCallback(() => {
    navigation.pushURL(
      "hydra://webview?url=https://www.reddit.com/settings/profile",
    );
  }, [navigation]);

  const goBackFromHero = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  useEffect(() => {
    if (parsedRoute || invalidRouteReportedRef.current) {
      return;
    }
    invalidRouteReportedRef.current = true;

    Sentry.withScope((scope) => {
      scope.setTag("screen", "UserPage");
      scope.setTag("surface", "modernAccountView");
      scope.setContext("modernAccountView", {
        routeUrl: url,
      });
      Sentry.captureMessage("Modern account view fallback: invalid route URL");
    });
    console.warn("Modern account view fallback: invalid route URL", url);
  }, [parsedRoute, url]);

  const renderHeader = useCallback(
    () => (
      <ModernUserPageHeader
        user={user}
        trophies={trophies}
        isOwnProfile={isOwnProfile}
        selectedPrimaryTab={selectedPrimaryTab}
        selectedSavedTypeTab={selectedSavedTypeTab}
        isSavedPostsPage={isSavedPostsPage}
        savedPostCategoryFilters={savedPostCategoryFilters}
        selectedSavedPostCategoryFilter={selectedSavedPostCategoryFilter}
        onEditProfile={openEditProfile}
        onShareProfile={shareProfile}
        onAddAccount={() => setModal(<Login />)}
        onGoBack={goBackFromHero}
        onSelectPrimaryTab={goToPrimaryTab}
        onSelectSavedTypeTab={goToSavedTypeTab}
        onSelectSavedPostCategoryFilter={setSelectedSavedPostCategoryFilter}
      />
    ),
    [
      user,
      trophies,
      isOwnProfile,
      selectedPrimaryTab,
      selectedSavedTypeTab,
      isSavedPostsPage,
      savedPostCategoryFilters,
      selectedSavedPostCategoryFilter,
      openEditProfile,
      shareProfile,
      goBackFromHero,
      goToPrimaryTab,
      goToSavedTypeTab,
      setModal,
    ],
  );

  if (!parsedRoute) {
    return (
      <LegacyUserPageContent
        {...props}
        warningBannerText={MODERN_ACCOUNT_VIEW_INVALID_URL_WARNING}
      />
    );
  }

  return (
    <View
      style={[
        styles.userContainer,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <AccessFailureComponent
        accessFailure={accessFailure}
        contentName={userNameFromURL || "User"}
      >
        <RedditDataScroller<UserContent>
          ListHeaderComponent={renderHeader}
          loadMore={loadMoreUserContent}
          refresh={refreshUserContent}
          fullyLoaded={fullyLoaded}
          hitFilterLimit={hitFilterLimit}
          data={userContent}
          getItemType={(item) => item?.type ?? "unknown"}
          renderItem={({ item: content }) => {
            if (!content) {
              return null;
            }
            if (content.type === "post") {
              return (
                <PostComponent
                  post={content}
                  setPost={(newPost) => modifyUserContent([newPost])}
                />
              );
            }
            if (content.type === "comment") {
              return (
                <CommentComponent
                  comment={content}
                  index={0}
                  displayInList
                  changeComment={(newComment) =>
                    modifyUserContent([newComment])
                  }
                  deleteComment={(comment) => deleteUserContent([comment])}
                />
              );
            }
            return null;
          }}
        />
      </AccessFailureComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    flex: 1,
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  loaderContainer: {
    marginTop: 20,
  },
  savedCategoryFilterContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  savedCategoryFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  savedCategoryFilterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  feedControlsSection: {
    backgroundColor: "#f3f4f5",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
  },
  feedOptionsPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedOptionsText: {
    fontSize: 17,
    fontWeight: "600",
  },
  hiddenPostsCard: {
    marginTop: 12,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hiddenPostsTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  hiddenPostsText: {
    fontSize: 17,
    fontWeight: "500",
  },
  warningBanner: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningBannerText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
