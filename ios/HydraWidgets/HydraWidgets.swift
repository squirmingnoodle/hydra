import WidgetKit
import SwiftUI

// MARK: - Shared Data

struct WidgetDataProvider {
  static let suiteName = "group.com.darlops.hydra"

  static var defaults: UserDefaults? {
    UserDefaults(suiteName: suiteName)
  }

  static func trendingPosts() -> [TrendingPost] {
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

  static func karma() -> Int {
    defaults?.integer(forKey: "userKarma") ?? 0
  }

  static func username() -> String? {
    defaults?.string(forKey: "username")
  }
}

struct TrendingPost {
  let id: String
  let title: String
  let subreddit: String
  let upvotes: Int
  let commentCount: Int
  let url: String

  init?(dict: [String: Any]) {
    guard let id = dict["id"] as? String,
          let title = dict["title"] as? String,
          let subreddit = dict["subreddit"] as? String else { return nil }
    self.id = id
    self.title = title
    self.subreddit = subreddit
    self.upvotes = dict["upvotes"] as? Int ?? 0
    self.commentCount = dict["commentCount"] as? Int ?? 0
    self.url = dict["url"] as? String ?? ""
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

// MARK: - Trending Posts Widget

struct TrendingPostsEntry: TimelineEntry {
  let date: Date
  let posts: [TrendingPost]
}

struct TrendingPostsProvider: TimelineProvider {
  func placeholder(in context: Context) -> TrendingPostsEntry {
    TrendingPostsEntry(date: .now, posts: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (TrendingPostsEntry) -> Void) {
    completion(TrendingPostsEntry(date: .now, posts: WidgetDataProvider.trendingPosts()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TrendingPostsEntry>) -> Void) {
    let entry = TrendingPostsEntry(date: .now, posts: WidgetDataProvider.trendingPosts())
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

struct TrendingPostsWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TrendingPostsEntry

  var body: some View {
    if entry.posts.isEmpty {
      VStack(spacing: 8) {
        Image(systemName: "flame")
          .font(.title2)
          .foregroundStyle(.secondary)
        Text("Open Hydra to load trending posts")
          .font(.caption)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
      .padding()
    } else {
      VStack(alignment: .leading, spacing: 6) {
        ForEach(entry.posts.prefix(postsCount), id: \.id) { post in
          Link(destination: URL(string: "hydra://openurl?url=\(post.url)")!) {
            VStack(alignment: .leading, spacing: 2) {
              Text(post.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(2)
                .foregroundStyle(.primary)
              HStack(spacing: 4) {
                Text("r/\(post.subreddit)")
                  .font(.caption2)
                  .foregroundStyle(.secondary)
                Image(systemName: "arrow.up")
                  .font(.system(size: 8))
                  .foregroundStyle(.orange)
                Text("\(post.upvotes)")
                  .font(.caption2)
                  .foregroundStyle(.secondary)
              }
            }
          }
          if post.id != entry.posts.prefix(postsCount).last?.id {
            Divider()
          }
        }
      }
      .padding()
    }
  }

  var postsCount: Int {
    switch family {
    case .systemSmall: return 2
    case .systemMedium: return 3
    case .systemLarge: return 6
    default: return 3
    }
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

// MARK: - Quick Subreddits Widget

struct SubredditsEntry: TimelineEntry {
  let date: Date
  let subreddits: [FavoriteSubreddit]
}

struct SubredditsProvider: TimelineProvider {
  func placeholder(in context: Context) -> SubredditsEntry {
    SubredditsEntry(date: .now, subreddits: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (SubredditsEntry) -> Void) {
    completion(SubredditsEntry(date: .now, subreddits: WidgetDataProvider.favoriteSubreddits()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SubredditsEntry>) -> Void) {
    let entry = SubredditsEntry(date: .now, subreddits: WidgetDataProvider.favoriteSubreddits())
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now)!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
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

// MARK: - Widget Bundle

@main
struct HydraWidgetsBundle: WidgetBundle {
  var body: some Widget {
    TrendingPostsWidget()
    InboxWidget()
    SubredditsWidget()
    if #available(iOS 16.2, *) {
      ThreadWatcherLiveActivity()
    }
  }
}

struct TrendingPostsWidget: Widget {
  let kind = "TrendingPostsWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TrendingPostsProvider()) { entry in
      TrendingPostsWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Trending Posts")
    .description("See trending posts from your favorite subreddits.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
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

struct SubredditsWidget: Widget {
  let kind = "SubredditsWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SubredditsProvider()) { entry in
      SubredditsWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Quick Subreddits")
    .description("Quickly jump to your favorite subreddits.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
