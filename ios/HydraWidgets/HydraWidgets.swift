import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Shared Data

struct WidgetDataProvider {
  static let suiteName = "group.com.darlops.hydra"

  static var defaults: UserDefaults? {
    UserDefaults(suiteName: suiteName)
  }

  static func trendingPosts(forAccount account: String? = nil) -> [TrendingPost] {
    let key: String
    if let account = account, !account.isEmpty {
      // Try per-account posts first, fall back to global
      key = "trendingPosts:\(account)"
      if let data = defaults?.array(forKey: key) as? [[String: Any]], !data.isEmpty {
        return data.compactMap { TrendingPost(dict: $0) }
      }
    }
    // Fall back to global trending posts
    guard let data = defaults?.array(forKey: "trendingPosts") as? [[String: Any]] else {
      return []
    }
    return data.compactMap { TrendingPost(dict: $0) }
  }

  static func inboxCount() -> Int {
    defaults?.integer(forKey: "inboxCount") ?? 0
  }

  static func favoriteSubreddits() -> [FavoriteSubreddit] {
    guard let data = defaults?.array(forKey: "favoriteSubreddits") as? [[String: Any]] else {
      return []
    }
    return data.compactMap { FavoriteSubreddit(dict: $0) }
  }

  static func subscribedSubreddits(forAccount account: String) -> [FavoriteSubreddit] {
    guard let data = defaults?.array(forKey: "subscribedSubreddits:\(account)") as? [[String: Any]] else {
      return favoriteSubreddits()
    }
    return data.compactMap { FavoriteSubreddit(dict: $0) }
  }

  static func karma() -> Int {
    defaults?.integer(forKey: "userKarma") ?? 0
  }

  static func username() -> String? {
    defaults?.string(forKey: "username")
  }

  static func availableAccounts() -> [String] {
    guard let accounts = defaults?.array(forKey: "availableAccounts") as? [[String: Any]] else {
      return []
    }
    return accounts.compactMap { $0["username"] as? String }
  }
}

struct TrendingPost {
  let id: String
  let title: String
  let subreddit: String
  let author: String
  let upvotes: Int
  let commentCount: Int
  let url: String
  let localThumbnailPath: String?

  init?(dict: [String: Any]) {
    guard let id = dict["id"] as? String,
          let title = dict["title"] as? String,
          let subreddit = dict["subreddit"] as? String else { return nil }
    self.id = id
    self.title = title
    self.subreddit = subreddit
    self.author = dict["author"] as? String ?? ""
    self.upvotes = dict["upvotes"] as? Int ?? 0
    self.commentCount = dict["commentCount"] as? Int ?? 0
    self.url = dict["url"] as? String ?? ""
    self.localThumbnailPath = dict["localThumbnailPath"] as? String
  }
}

struct FavoriteSubreddit {
  let name: String
  let icon: String?

  init?(dict: [String: Any]) {
    guard let name = dict["name"] as? String else { return nil }
    self.name = name
    self.icon = dict["icon"] as? String
  }
}

// MARK: - Cached Thumbnail View (shared)

struct CachedThumbnailView: View {
  let path: String?
  let size: CGFloat

  var body: some View {
    if let path = path,
       let uiImage = UIImage(contentsOfFile: path) {
      Image(uiImage: uiImage)
        .resizable()
        .aspectRatio(contentMode: .fill)
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
  }
}

// MARK: - Navigate Post Intent (next/prev buttons in widget)

struct NavigatePostIntent: AppIntent {
  static var title: LocalizedStringResource = "Navigate Post"
  static var description = IntentDescription("Go to next or previous post in the widget.")

  @Parameter(title: "Direction")
  var direction: Int // 1 = next, -1 = previous

  init() {
    self.direction = 1
  }

  init(direction: Int) {
    self.direction = direction
  }

  func perform() async throws -> some IntentResult {
    let defaults = UserDefaults(suiteName: "group.com.darlops.hydra")
    let current = defaults?.integer(forKey: "widgetPostIndex") ?? 0
    let newIndex = current + direction
    defaults?.set(newIndex, forKey: "widgetPostIndex")
    WidgetCenter.shared.reloadTimelines(ofKind: "TrendingPostsWidget")
    return .result()
  }
}

// MARK: - Trending Posts Widget (Single Post with Navigation)

struct TrendingPostsEntry: TimelineEntry {
  let date: Date
  let post: TrendingPost?
  let postIndex: Int
  let totalPosts: Int
  let accountName: String?
}

struct TrendingPostsProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> TrendingPostsEntry {
    TrendingPostsEntry(date: .now, post: nil, postIndex: 0, totalPosts: 0, accountName: nil)
  }

  func snapshot(for configuration: SelectAccountIntent, in context: Context) async -> TrendingPostsEntry {
    let account = configuration.account?.username
    let posts = WidgetDataProvider.trendingPosts(forAccount: account)
    let index = clampedIndex(for: account, total: posts.count)
    return TrendingPostsEntry(
      date: .now,
      post: posts.isEmpty ? nil : posts[index],
      postIndex: index,
      totalPosts: posts.count,
      accountName: account
    )
  }

  func timeline(for configuration: SelectAccountIntent, in context: Context) async -> Timeline<TrendingPostsEntry> {
    let account = configuration.account?.username
    let posts = WidgetDataProvider.trendingPosts(forAccount: account)

    if posts.isEmpty {
      let entry = TrendingPostsEntry(date: .now, post: nil, postIndex: 0, totalPosts: 0, accountName: account)
      return Timeline(entries: [entry], policy: .after(Calendar.current.date(byAdding: .minute, value: 30, to: .now)!))
    }

    // Create one entry per post, spaced 5 minutes apart for auto-cycling
    var entries: [TrendingPostsEntry] = []
    let startIndex = clampedIndex(for: account, total: posts.count)

    for offset in 0..<posts.count {
      let i = (startIndex + offset) % posts.count
      let entryDate = Calendar.current.date(byAdding: .minute, value: offset * 5, to: .now)!
      entries.append(TrendingPostsEntry(
        date: entryDate,
        post: posts[i],
        postIndex: i,
        totalPosts: posts.count,
        accountName: account
      ))
    }

    // After cycling through all, reload
    let nextReload = Calendar.current.date(byAdding: .minute, value: posts.count * 5, to: .now)!
    return Timeline(entries: entries, policy: .after(nextReload))
  }

  private func clampedIndex(for account: String?, total: Int) -> Int {
    guard total > 0 else { return 0 }
    let defaults = UserDefaults(suiteName: "group.com.darlops.hydra")
    let raw = defaults?.integer(forKey: "widgetPostIndex") ?? 0
    // Clamp to valid range using modulo (handles negative values)
    return ((raw % total) + total) % total
  }
}

struct TrendingPostsWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TrendingPostsEntry

  var body: some View {
    if let post = entry.post {
      Link(destination: URL(string: "hydra://openurl?url=\(post.url)")!) {
        ZStack {
          // Background thumbnail (fills entire widget)
          if let path = post.localThumbnailPath,
             let uiImage = UIImage(contentsOfFile: path) {
            Image(uiImage: uiImage)
              .resizable()
              .aspectRatio(contentMode: .fill)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .clipped()
              .overlay {
                // Gradient overlay for text readability
                LinearGradient(
                  colors: [.clear, .clear, .black.opacity(0.7), .black.opacity(0.85)],
                  startPoint: .top,
                  endPoint: .bottom
                )
              }
          } else {
            // No thumbnail - solid background
            Color(.systemBackground).opacity(0.05)
          }

          // Content overlay
          VStack(alignment: .leading, spacing: 0) {
            // Top bar: nav dots + account
            HStack {
              // Page indicator dots
              if entry.totalPosts > 1 {
                HStack(spacing: 4) {
                  ForEach(0..<min(entry.totalPosts, 10), id: \.self) { i in
                    Circle()
                      .fill(i == entry.postIndex ? Color.white : Color.white.opacity(0.4))
                      .frame(width: i == entry.postIndex ? 6 : 4, height: i == entry.postIndex ? 6 : 4)
                  }
                }
              }

              Spacer()

              if let account = entry.accountName {
                Text("u/\(account)")
                  .font(.system(size: 9, weight: .medium))
                  .foregroundStyle(.white.opacity(0.7))
              }
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)

            Spacer()

            // Bottom: post info
            VStack(alignment: .leading, spacing: 4) {
              Text(post.title)
                .font(.system(size: titleFontSize, weight: .semibold))
                .foregroundStyle(hasThumbnail(post) ? .white : .primary)
                .lineLimit(titleLineLimit)

              HStack(spacing: 6) {
                Text("r/\(post.subreddit)")
                  .font(.system(size: metaFontSize, weight: .medium))
                  .foregroundStyle(hasThumbnail(post) ? .white.opacity(0.8) : .secondary)

                HStack(spacing: 2) {
                  Image(systemName: "arrow.up")
                    .font(.system(size: metaFontSize - 2))
                    .foregroundStyle(.orange)
                  Text("\(post.upvotes)")
                    .font(.system(size: metaFontSize))
                    .foregroundStyle(hasThumbnail(post) ? .white.opacity(0.8) : .secondary)
                }

                HStack(spacing: 2) {
                  Image(systemName: "bubble.left")
                    .font(.system(size: metaFontSize - 2))
                    .foregroundStyle(.blue)
                  Text("\(post.commentCount)")
                    .font(.system(size: metaFontSize))
                    .foregroundStyle(hasThumbnail(post) ? .white.opacity(0.8) : .secondary)
                }

                if !post.author.isEmpty {
                  Text("u/\(post.author)")
                    .font(.system(size: metaFontSize))
                    .foregroundStyle(hasThumbnail(post) ? Color.white.opacity(0.6) : Color.secondary.opacity(0.6))
                    .lineLimit(1)
                }
              }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 10)

            // Navigation buttons
            if entry.totalPosts > 1 {
              HStack(spacing: 8) {
                Button(intent: NavigatePostIntent(direction: -1)) {
                  HStack(spacing: 3) {
                    Image(systemName: "chevron.left")
                      .font(.system(size: 10, weight: .semibold))
                    Text("Prev")
                      .font(.system(size: 10, weight: .medium))
                  }
                  .foregroundStyle(hasThumbnail(post) ? .white.opacity(0.9) : .secondary)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 5)
                  .background(hasThumbnail(post) ? .white.opacity(0.2) : Color(.systemFill), in: Capsule())
                }
                .buttonStyle(.plain)

                Spacer()

                Text("\(entry.postIndex + 1)/\(entry.totalPosts)")
                  .font(.system(size: 10, weight: .medium, design: .rounded))
                  .foregroundStyle(hasThumbnail(post) ? Color.white.opacity(0.6) : Color.secondary.opacity(0.6))

                Spacer()

                Button(intent: NavigatePostIntent(direction: 1)) {
                  HStack(spacing: 3) {
                    Text("Next")
                      .font(.system(size: 10, weight: .medium))
                    Image(systemName: "chevron.right")
                      .font(.system(size: 10, weight: .semibold))
                  }
                  .foregroundStyle(hasThumbnail(post) ? .white.opacity(0.9) : .secondary)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 5)
                  .background(hasThumbnail(post) ? .white.opacity(0.2) : Color(.systemFill), in: Capsule())
                }
                .buttonStyle(.plain)
              }
              .padding(.horizontal, 12)
              .padding(.bottom, 8)
            }
          }
        }
      }
    } else {
      // Empty state
      VStack(spacing: 8) {
        Image(systemName: "flame")
          .font(.title2)
          .foregroundStyle(.secondary)
        Text("Open Hydra to load posts")
          .font(.caption)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
      .padding()
    }
  }

  private func hasThumbnail(_ post: TrendingPost) -> Bool {
    if let path = post.localThumbnailPath {
      return FileManager.default.fileExists(atPath: path)
    }
    return false
  }

  var titleFontSize: CGFloat {
    switch family {
    case .systemSmall: return 13
    case .systemMedium: return 14
    case .systemLarge: return 16
    default: return 14
    }
  }

  var titleLineLimit: Int {
    switch family {
    case .systemSmall: return 3
    case .systemMedium: return 2
    case .systemLarge: return 4
    default: return 2
    }
  }

  var metaFontSize: CGFloat {
    switch family {
    case .systemSmall: return 10
    case .systemLarge: return 12
    default: return 11
    }
  }
}

struct TrendingPostsWidget: Widget {
  let kind = "TrendingPostsWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: SelectAccountIntent.self,
      provider: TrendingPostsProvider()
    ) { entry in
      TrendingPostsWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Trending Posts")
    .description("Browse trending posts one at a time.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

// MARK: - Inbox Count Widget

struct InboxEntry: TimelineEntry {
  let date: Date
  let count: Int
}

struct InboxProvider: TimelineProvider {
  func placeholder(in context: Context) -> InboxEntry {
    InboxEntry(date: .now, count: 0)
  }

  func getSnapshot(in context: Context, completion: @escaping (InboxEntry) -> Void) {
    completion(InboxEntry(date: .now, count: WidgetDataProvider.inboxCount()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<InboxEntry>) -> Void) {
    let entry = InboxEntry(date: .now, count: WidgetDataProvider.inboxCount())
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: .now)!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

struct InboxWidgetView: View {
  let entry: InboxEntry

  var body: some View {
    Link(destination: URL(string: "hydra://inbox")!) {
      VStack(spacing: 4) {
        ZStack {
          Image(systemName: "envelope.fill")
            .font(.title)
            .foregroundStyle(.blue)
          if entry.count > 0 {
            Text("\(entry.count)")
              .font(.system(size: 11, weight: .bold))
              .foregroundStyle(.white)
              .padding(.horizontal, 4)
              .background(Color.red, in: Capsule())
              .offset(x: 14, y: -10)
          }
        }
        Text(entry.count > 0 ? "\(entry.count) new" : "Inbox")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct InboxWidget: Widget {
  let kind = "InboxWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: InboxProvider()) { entry in
      InboxWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Inbox")
    .description("Quick access to your Reddit inbox.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
  }
}

// MARK: - Quick Subreddits Widget (with Account + Subreddit Picker)

struct SubredditsEntry: TimelineEntry {
  let date: Date
  let subreddits: [FavoriteSubreddit]
  let accountName: String?
}

struct SubredditsProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> SubredditsEntry {
    SubredditsEntry(date: .now, subreddits: [], accountName: nil)
  }

  func snapshot(for configuration: SelectSubredditsIntent, in context: Context) async -> SubredditsEntry {
    let account = configuration.account?.username
    let selectedSubs = configuration.subreddits

    let subreddits: [FavoriteSubreddit]
    if let selectedSubs = selectedSubs, !selectedSubs.isEmpty {
      subreddits = selectedSubs.map { entity in
        FavoriteSubreddit(dict: ["name": entity.name])!
      }
    } else if let account = account {
      subreddits = WidgetDataProvider.subscribedSubreddits(forAccount: account)
    } else {
      subreddits = WidgetDataProvider.favoriteSubreddits()
    }

    return SubredditsEntry(date: .now, subreddits: subreddits, accountName: account)
  }

  func timeline(for configuration: SelectSubredditsIntent, in context: Context) async -> Timeline<SubredditsEntry> {
    let account = configuration.account?.username
    let selectedSubs = configuration.subreddits

    let subreddits: [FavoriteSubreddit]
    if let selectedSubs = selectedSubs, !selectedSubs.isEmpty {
      subreddits = selectedSubs.map { entity in
        FavoriteSubreddit(dict: ["name": entity.name])!
      }
    } else if let account = account {
      subreddits = WidgetDataProvider.subscribedSubreddits(forAccount: account)
    } else {
      subreddits = WidgetDataProvider.favoriteSubreddits()
    }

    let entry = SubredditsEntry(date: .now, subreddits: subreddits, accountName: account)
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now)!
    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }
}

struct SubredditsWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: SubredditsEntry

  var body: some View {
    if entry.subreddits.isEmpty {
      VStack(spacing: 8) {
        Image(systemName: "star")
          .font(.title2)
          .foregroundStyle(.secondary)
        Text("Subscribe to subreddits in Hydra")
          .font(.caption)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
      .padding()
    } else {
      VStack(alignment: .leading, spacing: 4) {
        if let account = entry.accountName {
          HStack(spacing: 4) {
            Image(systemName: "person.circle.fill")
              .font(.system(size: 10))
              .foregroundStyle(.secondary)
            Text("u/\(account)")
              .font(.system(size: 10))
              .foregroundStyle(.secondary)
          }
        }

        LazyVGrid(columns: columns, spacing: 8) {
          ForEach(entry.subreddits.prefix(maxItems), id: \.name) { sub in
            Link(destination: URL(string: "hydra://openurl?url=/r/\(sub.name)")!) {
              VStack(spacing: 4) {
                Circle()
                  .fill(Color.blue.opacity(0.15))
                  .frame(width: 36, height: 36)
                  .overlay(
                    Text(String(sub.name.prefix(1)).uppercased())
                      .font(.system(size: 16, weight: .bold))
                      .foregroundStyle(.blue)
                  )
                Text("r/\(sub.name)")
                  .font(.system(size: 9))
                  .lineLimit(1)
                  .foregroundStyle(.primary)
              }
            }
          }
        }
      }
      .padding(8)
    }
  }

  var columns: [GridItem] {
    let count = family == .systemSmall ? 2 : 4
    return Array(repeating: GridItem(.flexible(), spacing: 4), count: count)
  }

  var maxItems: Int {
    family == .systemSmall ? 4 : 8
  }
}

struct SubredditsWidget: Widget {
  let kind = "SubredditsWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: kind,
      intent: SelectSubredditsIntent.self,
      provider: SubredditsProvider()
    ) { entry in
      SubredditsWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Quick Subreddits")
    .description("Quickly jump to your favorite subreddits.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
